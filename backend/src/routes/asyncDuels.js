import { randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { query } from '../config/database.js';
import * as social from '../services/asyncDuelFriends.js';
import * as repository from '../services/asyncDuelRepository.js';
import * as villageRewards from '../services/asyncDuelWeeklyRewards.js';
import { getPlayableDeckForCombat } from '../services/deckService.js';
import { loadCombatCharacter } from '../services/combatCharacterService.js';
import { computeTalentBonuses } from '../services/talentTreeService.js';
import {
  applyAsyncDuelAction,
  createAsyncDuel,
  publicAsyncDuel,
} from '../services/deckCombat/asyncDuel.js';
import { applySoloCardBalance } from '../services/deckCombat/soloCardBalance.js';

const opponentSearch = z.string().trim().max(100).default('');
const playerId = z.number().int().positive().max(0xffffffff);
const playerPath = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .transform(Number)
  .pipe(playerId);
const friendRequest = z.object({ playerId });
const rewardReadSchema = z
  .object({
    throughWeekStart: z
      .string()
      .date()
      .refine(date => date >= '1000-01-01', 'Date hors limites.'),
  })
  .strict();
const startSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('friend'), defenderId: playerId }).strict(),
  z.object({ mode: z.literal('random') }).strict(),
  z.object({ mode: z.literal('enemy_faction') }).strict(),
]);
const LEVEL_WINDOW = 3;
const CANDIDATE_LIMIT = 24;
const idSchema = z.string().uuid();
const revision = z.number().int().min(0).max(0xffffffff);
const instanceId = z.string().min(1).max(140);
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), instanceId, revision }),
  z.object({ type: z.literal('discard_chakra'), instanceId, revision }),
  z.object({ type: z.literal('discard_draw'), instanceId, revision }),
  z.object({ type: z.literal('end_turn'), revision }),
  z.object({ type: z.literal('forfeit'), revision }),
]);

function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

async function loadFighter(userId) {
  const deck = await getPlayableDeckForCombat(userId);
  const [character, talents] = await Promise.all([
    loadCombatCharacter(userId),
    computeTalentBonuses(userId),
  ]);
  if (!character) fail(400, 'Un personnage est nécessaire pour jouer en duel.');
  return {
    id: userId,
    name: character.name,
    level: character.level,
    rank: character.rank,
    profile: character.profile,
    factionId: character.factionId,
    stats: talents.stats,
    talentCodes: talents.effects.map(effect => effect.effectCode),
    deckEntries: deck.cards.map(entry => ({
      quantity: entry.quantity,
      card: applySoloCardBalance(entry.card),
    })),
  };
}

async function findCandidates(attacker, mode) {
  const enemyOnly = mode === 'enemy_faction';
  return query(
    `SELECT p.user_id AS id
     FROM player_profiles p
     WHERE p.user_id <> ? AND p.character_name IS NOT NULL
       AND p.character_level BETWEEN ? AND ?
       AND EXISTS (SELECT 1 FROM user_decks d WHERE d.user_id = p.user_id AND d.is_active = 1)
       ${enemyOnly ? 'AND p.character_faction_id <> ?' : ''}
     ORDER BY RAND() LIMIT ${CANDIDATE_LIMIT}`,
    [
      attacker.id,
      Math.max(1, attacker.level - LEVEL_WINDOW),
      attacker.level + LEVEL_WINDOW,
      ...(enemyOnly ? [attacker.factionId] : []),
    ],
  );
}

async function pickDefender({ attacker, request, fighter, friends, candidates }) {
  if (request.mode === 'friend') {
    if (!(await friends.areDuelFriends(attacker.id, request.defenderId))) {
      fail(404, 'Ami introuvable.');
    }
    try {
      return await fighter(request.defenderId);
    } catch (error) {
      if ([400, 404].includes(error.statusCode)) fail(404, 'Cet ami n’a pas de deck actif valide.');
      throw error;
    }
  }
  if (request.mode === 'enemy_faction' && !attacker.factionId) {
    fail(400, 'Choisissez un village avant de lancer un duel de faction ennemie.');
  }
  const eligible = await candidates(attacker, request.mode);
  for (const { id } of eligible) {
    if (Number(id) === attacker.id) continue;
    let defender;
    try {
      defender = await fighter(Number(id));
    } catch (error) {
      if ([400, 404].includes(error.statusCode)) continue;
      throw error;
    }
    if (Math.abs(defender.level - attacker.level) > LEVEL_WINDOW) continue;
    if (
      request.mode === 'enemy_faction' &&
      (!defender.factionId || defender.factionId === attacker.factionId)
    )
      continue;
    return defender;
  }
  fail(404, 'Aucun adversaire éligible de niveau proche n’a été trouvé.');
}

function publicSnapshot(row) {
  return {
    ...publicAsyncDuel(row.state),
    id: row.id,
    revision: row.revision,
    mode: row.mode ?? null,
    reward: row.reward ?? 0,
  };
}

function authenticated(handler, { sessionOnly = false } = {}) {
  return async (req, res, next) => {
    try {
      if (sessionOnly && !req.user) {
        return res.status(401).json({ error: 'Non authentifié.' });
      }
      const user = await requireUser(req, res);
      if (!user) return;
      res.set('Cache-Control', 'no-store');
      await handler(req, res, Number(user.id));
    } catch (error) {
      if (error.code === 'ASYNC_DUEL_CONFLICT') {
        return res.status(409).json({ error: error.message });
      }
      if (error.code === 'ASYNC_DUEL_SELF') return res.status(400).json({ error: error.message });
      next(error);
    }
  };
}

export function createAsyncDuelRouter({
  store = repository,
  fighter = loadFighter,
  friends = social,
  candidates = findCandidates,
  rewards = villageRewards,
} = {}) {
  const router = Router();

  router.get(
    '/',
    authenticated(async (_req, res, userId) => {
      res.json(await store.getDuelOverview(userId));
    }),
  );
  router.get(
    '/opponents',
    authenticated(async (req, res, userId) => {
      const q = opponentSearch.parse(req.query.q);
      res.json({ opponents: await friends.searchDuelPlayers(userId, q) });
    }),
  );
  router.get(
    '/friends',
    authenticated(async (_req, res, userId) => {
      res.json(await friends.getDuelFriends(userId));
    }),
  );
  router.post(
    '/friends',
    authenticated(async (req, res, userId) => {
      const input = friendRequest.parse(req.body);
      await friends.requestDuelFriend(userId, input.playerId);
      res.status(201).json(await friends.getDuelFriends(userId));
    }),
  );
  router.post(
    '/friends/:id/accept',
    authenticated(async (req, res, userId) => {
      await friends.acceptDuelFriend(userId, playerPath.parse(req.params.id));
      res.json(await friends.getDuelFriends(userId));
    }),
  );
  router.delete(
    '/friends/:id',
    authenticated(async (req, res, userId) => {
      await friends.removeDuelFriend(userId, playerPath.parse(req.params.id));
      res.json(await friends.getDuelFriends(userId));
    }),
  );
  router.get(
    '/factions',
    authenticated(async (_req, res) => {
      res.json(await store.getFactionStandings());
    }),
  );
  router.get(
    '/village-rewards',
    authenticated(
      async (_req, res, userId) => {
        res.json(await rewards.getVillageRewards(userId));
      },
      { sessionOnly: true },
    ),
  );
  router.post(
    '/village-rewards/read',
    authenticated(
      async (req, res, userId) => {
        const { throughWeekStart } = rewardReadSchema.parse(req.body);
        res.json(await rewards.markVillageRewardsRead(userId, throughWeekStart));
      },
      { sessionOnly: true },
    ),
  );
  router.post(
    '/',
    authenticated(async (req, res, attackerId) => {
      const request = startSchema.parse(req.body);
      if (attackerId === request.defenderId)
        fail(400, 'Vous ne pouvez pas défier votre propre deck.');
      const attacker = await fighter(attackerId);
      const defender = await pickDefender({ attacker, request, fighter, friends, candidates });
      const id = randomUUID();
      const state = createAsyncDuel([attacker, defender], randomBytes(4).readUInt32LE(0));
      const row = await store.insertAsyncDuel({
        id,
        attackerId,
        defenderId: defender.id,
        attackerName: attacker.name,
        defenderName: defender.name,
        attackerFaction: attacker.factionId,
        defenderFaction: defender.factionId,
        mode: request.mode,
        state,
      });
      res.status(201).json({ duel: publicSnapshot(row) });
    }),
  );
  router.get(
    '/:id',
    authenticated(async (req, res, attackerId) => {
      const row = await store.loadAsyncDuel(idSchema.parse(req.params.id), attackerId);
      if (!row) fail(404, 'Duel introuvable.');
      res.json({ duel: publicSnapshot(row) });
    }),
  );
  router.post(
    '/:id/action',
    authenticated(async (req, res, attackerId) => {
      const id = idSchema.parse(req.params.id);
      const action = actionSchema.parse(req.body);
      const row = await store.loadAsyncDuel(id, attackerId);
      if (!row) fail(404, 'Duel introuvable.');
      if (row.revision !== action.revision || row.state.state !== 'in_progress') {
        fail(409, 'Le duel a déjà avancé ou est terminé.');
      }
      const state = applyAsyncDuelAction(row.state, action);
      const next = await store.updateAsyncDuel({
        id,
        attackerId,
        revision: action.revision,
        state,
      });
      if (!next) fail(409, 'Le duel a déjà avancé ou est terminé.');
      res.json({ duel: publicSnapshot(next) });
    }),
  );
  return router;
}

export default createAsyncDuelRouter();
