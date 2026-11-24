/**
 * Parcours de mission coopérative (2 joueurs) — boutique commune, inventaires perso,
 * avance host-only avec ready invité sur nœuds non-combat.
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { COOP_REWARD_MULT, COOP_RUN_INACTIVITY_MS } from '../config/coopMissionConfig.js';
import {
  HARD_MODE_REWARD_MULT,
} from '../config/missionPathConfig.js';
import { getShopItem } from '../config/missionRunEconomy.js';
import { pickRankVignette } from '../../scripts/data/missionLore.js';
import { getMission } from './combatMissionService.js';
import { grantRunRewards } from './combatRewardService.js';
import { BASE_MAX_HP } from './deckCombat/constants.js';
import { classifyTalentEffects } from './deckCombat/talentEffects.js';
import {
  canPlayMissionRank,
  requiredCharacterRankForMission,
} from './missionRankAccess.js';
import { buildRandomRunPath } from './missionPathBuilder.js';
import {
  createRunPlayerState,
  discardInventorySlot,
  getPurse,
  grantCombatPurse,
  grantNodePurse,
  healPercent,
  placeInventoryItem,
  spendPurse,
  trackPendingCard,
  untrackPendingCard,
  useInventorySlot,
} from './missionRunInventory.js';
import {
  sanitizeNodesForClient,
  unlockNext,
  applyPouchLoadout,
  collectRunInventoryDeposits,
} from './missionRunService.js';
import {
  consumePouchForRun,
  clearPouch,
  depositRunLootToPouch,
  grantToPouch,
} from './playerInventoryService.js';
import { createEmptyStats, getCharacter, getComputedStats } from './playerCharacterService.js';
import {
  markRoomClosed,
  markRoomStarting,
  requireStartableRoom,
} from './coopMissionRoomService.js';
import {
  applyCombatAction,
  getPublicCombat,
  loadCombatRow,
  startCoopCombatSession,
} from './coopCombatSessionService.js';

function httpError(statusCode, message, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function roleOf(row, userId) {
  if (Number(row.host_id) === Number(userId)) return 'host';
  if (Number(row.guest_id) === Number(userId)) return 'guest';
  return null;
}

function playerKey(role) {
  return role === 'host' ? 'host_player_json' : 'guest_player_json';
}

function getPlayerState(row, role) {
  return parseJson(row[playerKey(role)], {});
}

function setPlayerState(row, role, player) {
  row[playerKey(role)] = player;
}

function findAvailableIndex(nodes) {
  return nodes.findIndex(n => n.status === 'available');
}

function isTerminalStatus(status) {
  return status === 'cleared' || status === 'skipped';
}

function isNonCombatNode(node) {
  return node && ['shop', 'rest', 'branch', 'mystery', 'merchant', 'event'].includes(node.type);
}

function collectSubtreeIds(nodesById, startId) {
  const ids = new Set();
  if (!startId) return ids;
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    const node = nodesById[id];
    if (!node) continue;
    ids.add(id);
    if (node.type === 'branch') {
      for (const c of node.choices || []) {
        if (c?.nextNodeId) stack.push(c.nextNodeId);
      }
    } else if (node.nextNodeId) {
      stack.push(node.nextNodeId);
    }
  }
  return ids;
}

function applyBranchChoice(nodes, branchIndex, choiceId) {
  const next = nodes.map(n => ({ ...n }));
  const branchNode = next[branchIndex];
  const choice = (branchNode.choices || []).find(c => c.id === choiceId);
  if (!choice) throw httpError(400, 'Choix de branche invalide.');

  next[branchIndex] = { ...branchNode, status: 'cleared', chosen: choiceId };
  const byId = Object.fromEntries(next.map(n => [n.id, n]));
  const keep = collectSubtreeIds(byId, choice.nextNodeId);

  for (const other of branchNode.choices || []) {
    if (other.id === choiceId) continue;
    for (const id of collectSubtreeIds(byId, other.nextNodeId)) {
      if (keep.has(id)) continue;
      const idx = next.findIndex(n => n.id === id);
      if (idx >= 0 && next[idx].status !== 'cleared') {
        next[idx] = { ...next[idx], status: 'skipped' };
      }
    }
  }

  const targetIdx = next.findIndex(n => n.id === choice.nextNodeId);
  if (targetIdx >= 0) {
    next[targetIdx] = { ...next[targetIdx], status: 'available' };
  }
  return {
    nodes: next,
    xpMult: Number(choice.xpMult) || 1,
    branchId: choiceId,
  };
}

const EVENT_META = {
  rest: {
    nameFr: 'Halte de récupération',
    nameEn: 'Recovery Halt',
    descriptionFr: 'Un abri discret. Reposez-vous pour récupérer des forces.',
    descriptionEn: 'A discreet shelter. Rest to recover strength.',
  },
  shop: {
    nameFr: 'Colporteur d’Ombre',
    nameEn: 'Shadow Peddler',
    descriptionFr: 'Boutique commune : stocks partagés, bourses personnelles.',
    descriptionEn: 'Shared shop: common stock, personal purses.',
  },
  branch: {
    nameFr: 'Carrefour du Voile',
    nameEn: 'Veil Crossroads',
    descriptionFr: 'Deux sentiers. Le chef choisit après le ready de l’invité.',
    descriptionEn: 'Two paths. The host chooses after the guest is ready.',
  },
  mystery_heal: {
    nameFr: 'Halte providentielle',
    nameEn: 'Fortunate Halt',
    descriptionFr: 'Un abri discret. Vous pouvez reprendre votre souffle.',
    descriptionEn: 'A discreet shelter. You can catch your breath.',
  },
  mystery_loot: {
    nameFr: 'Cache improvisée',
    nameEn: 'Improvised Stash',
    descriptionFr: 'Quelques Ryos de mission abandonnés sur le sentier.',
    descriptionEn: 'Some mission purse coins left by the path.',
  },
  mystery_nothing: {
    nameFr: 'Sentier tranquille',
    nameEn: 'Quiet Path',
    descriptionFr: 'Rien d’autre que le vent dans les pins.',
    descriptionEn: 'Nothing but wind in the pines.',
  },
};

function buildEventPayload(node, viewerPlayer, { guestNodeReady, role }) {
  const eventType =
    node.eventType ||
    (node.type === 'shop' || node.type === 'merchant'
      ? 'shop'
      : node.type === 'rest'
        ? 'rest'
        : node.type === 'branch'
          ? 'branch'
          : 'rest');
  const meta = EVENT_META[eventType] || EVENT_META.rest;
  const base = {
    eventType,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
    purse: getPurse(viewerPlayer),
    hp: viewerPlayer.hp,
    maxHp: viewerPlayer.maxHp,
    inventory: viewerPlayer.inventory || [],
    guestNodeReady: Boolean(guestNodeReady),
    canAdvance: role === 'host' && Boolean(guestNodeReady),
    awaitingGuestReady: role === 'host' && !guestNodeReady,
  };

  if (eventType === 'shop' || node.type === 'shop' || node.type === 'merchant') {
    return {
      ...base,
      eventType: 'shop',
      offer: node.offer || [],
      choices: [{ id: 'leave', labelFr: 'Quitter la boutique', labelEn: 'Leave the shop' }],
    };
  }
  if (eventType === 'rest' || node.type === 'rest') {
    return {
      ...base,
      choices: [
        { id: 'rest_here', labelFr: 'Se reposer (+40 % PV max)', labelEn: 'Rest (+40% max HP)' },
      ],
    };
  }
  if (eventType === 'branch' || node.type === 'branch') {
    return {
      ...base,
      choices: (node.choices || []).map(c => ({
        id: c.id,
        labelFr: c.labelFr,
        labelEn: c.labelEn,
        lengthHint: c.lengthHint,
        xpMult: c.xpMult,
        fightCount: c.fightCount,
      })),
    };
  }
  if (eventType === 'mystery_heal') {
    return {
      ...base,
      choices: [
        { id: 'rest_here', labelFr: 'Se reposer (+50 % PV max)', labelEn: 'Rest (+50% max HP)' },
      ],
    };
  }
  if (eventType === 'mystery_loot') {
    return {
      ...base,
      choices: [
        {
          id: 'take_scrap',
          labelFr: 'Ramasser (+40 bourse, +10 % PV)',
          labelEn: 'Take it (+40 purse, +10% HP)',
        },
      ],
    };
  }
  return {
    ...base,
    choices: [{ id: 'continue', labelFr: 'Continuer', labelEn: 'Continue' }],
  };
}

function serializeRun(row, userId, extras = {}) {
  const role = roleOf(row, userId);
  if (!role) return null;
  const nodes = parseJson(row.nodes_json, []);
  const hostPlayer = parseJson(row.host_player_json, {});
  const guestPlayer = parseJson(row.guest_player_json, {});
  const myPlayer = role === 'host' ? hostPlayer : guestPlayer;
  const allyPlayer = role === 'host' ? guestPlayer : hostPlayer;
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  const eventOpen = Boolean(node?.eventOpen);
  const currentEvent =
    row.state === 'in_progress' && eventOpen && isNonCombatNode(node)
      ? buildEventPayload(node, myPlayer, {
          guestNodeReady: row.guest_node_ready,
          role,
        })
      : null;

  const myRewards =
    role === 'host'
      ? parseJson(row.rewards_host_json, null)
      : parseJson(row.rewards_guest_json, null);

  return {
    id: row.id,
    roomId: row.room_id,
    missionId: row.mission_id,
    state: row.state,
    revision: Number(row.revision) || 0,
    role,
    hostId: row.host_id,
    guestId: row.guest_id,
    currentNodeIndex: row.current_node_index,
    nodes: sanitizeNodesForClient(nodes),
    guestNodeReady: Boolean(row.guest_node_ready),
    player: {
      ...myPlayer,
      purse: getPurse(myPlayer),
    },
    ally: {
      userId: role === 'host' ? row.guest_id : row.host_id,
      hp: allyPlayer.hp,
      maxHp: allyPlayer.maxHp,
      purse: getPurse(allyPlayer),
      combatsWon: allyPlayer.combatsWon || 0,
    },
    hardMode: Boolean(myPlayer.hardMode),
    currentEvent,
    currentCombatId: row.current_combat_id || null,
    lastActionAt: toIso(row.last_action_at),
    rewards: myRewards,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

async function loadRunRow(runId) {
  const rows = await query('SELECT * FROM coop_mission_runs WHERE id = ? LIMIT 1', [runId]);
  if (!rows[0]) throw httpError(404, 'Mission d’équipe introuvable.');
  return rows[0];
}

async function loadRunForUser(runId, userId) {
  const row = await loadRunRow(runId);
  if (!roleOf(row, userId)) throw httpError(404, 'Mission d’équipe introuvable.');
  return row;
}

async function persistRun(row) {
  await query(
    `UPDATE coop_mission_runs
     SET state = ?, current_node_index = ?, nodes_json = ?,
         host_player_json = ?, guest_player_json = ?,
         current_combat_id = ?, guest_node_ready = ?,
         revision = revision + 1,
         last_action_at = UTC_TIMESTAMP(6),
         rewards_host_json = ?, rewards_guest_json = ?
     WHERE id = ?`,
    [
      row.state,
      row.current_node_index,
      JSON.stringify(row.nodes_json),
      JSON.stringify(row.host_player_json),
      JSON.stringify(row.guest_player_json),
      row.current_combat_id,
      row.guest_node_ready ? 1 : 0,
      row.rewards_host_json != null ? JSON.stringify(row.rewards_host_json) : null,
      row.rewards_guest_json != null ? JSON.stringify(row.rewards_guest_json) : null,
      row.id,
    ],
  );
  return loadRunRow(row.id);
}


async function loadFighterBundle(userId) {
  const { getPlayableDeckForCombat } = await import('./deckService.js');
  const { computeTalentBonuses } = await import('./talentTreeService.js');
  const { loadCombatCharacter } = await import('./combatCharacterService.js');
  const [deck, character, talents] = await Promise.all([
    getPlayableDeckForCombat(userId),
    loadCombatCharacter(userId),
    computeTalentBonuses(userId),
  ]);
  if (!character) throw httpError(400, 'Un personnage est nécessaire.');
  const [{ total: stats }] = await Promise.all([
    getComputedStats(userId, { deckPassives: deck.passiveBonuses }),
  ]);
  const effectCodes = (talents.effects || []).map(e => e.effectCode).filter(Boolean);
  const classified = classifyTalentEffects(effectCodes);
  return {
    deck,
    character,
    stats,
    effectCodes,
    classified,
    fighter: {
      id: userId,
      name: character.name,
      rank: character.rank,
      level: character.level,
      profile: character.profile,
      deckEntries: deck.cards,
      stats: talents.stats,
      talentCodes: effectCodes,
    },
  };
}

function buildLootCards(chanceCard) {
  const out = [];
  if (chanceCard?.card) {
    out.push({
      collectionId: chanceCard.collectionId ?? null,
      isNew: Boolean(chanceCard.isNew),
      rarity: chanceCard.card.rarity || chanceCard.rarity || 'common',
      card: chanceCard.card,
      source: 'mission_reward',
    });
  }
  return out;
}

async function completeRunVictory(row) {
  row.state = 'victory';
  row.current_combat_id = null;
  const nodes = parseJson(row.nodes_json, []);
  const nodeCount = nodes.filter(n => n.status === 'cleared').length;

  for (const role of ['host', 'guest']) {
    const userId = role === 'host' ? row.host_id : row.guest_id;
    const player = getPlayerState(row, role);
    const hardModeMult = player.hardMode
      ? Number(player.rewardMult) || HARD_MODE_REWARD_MULT
      : 1;
    const branchXpMult = Number(player.branchXpMult) || 1;
    const purseReturn = getPurse(player);
    try {
      const rewards = await grantRunRewards(userId, row.mission_id, {
        combatsWon: player.combatsWon || 0,
        nodeCount,
        hardModeMult,
        branchXpMult,
        purseReturn,
        coopMult: COOP_REWARD_MULT,
      });
      const deposits = collectRunInventoryDeposits(player);
      const inventoryDeposits = await depositRunLootToPouch(userId, deposits);
      rewards.purseReturned = purseReturn;
      rewards.shopCards = [];
      rewards.lootCards = buildLootCards(rewards.card);
      rewards.inventoryDeposits = inventoryDeposits;
      rewards.sealedPending = deposits.filter(d => getShopItem(d.itemKey)?.kind === 'pending_card')
        .length;
      rewards.sealedGranted = 0;
      rewards.sealedGrantFailures = 0;
      rewards.coopMult = COOP_REWARD_MULT;
      if (role === 'host') row.rewards_host_json = rewards;
      else row.rewards_guest_json = rewards;
    } catch (err) {
      const fail = { error: true, message: err.message };
      if (role === 'host') row.rewards_host_json = fail;
      else row.rewards_guest_json = fail;
    }
    setPlayerState(row, role, {
      ...player,
      purse: 0,
      pendingLoot: { cards: [] },
      inventory: (player.inventory || []).map((slot, i) => ({
        slot: i,
        itemId: null,
        qty: 0,
        meta: null,
      })),
    });
  }

  await persistRun(row);

  for (const userId of [row.host_id, row.guest_id]) {
    try {
      const { onBattlePassAction, isMissionRankBOrHigher } =
        await import('./battlePassQuestService.js');
      await onBattlePassAction(userId, 'mission_run', 1);
      const mission = await getMission(row.mission_id);
      if (isMissionRankBOrHigher(mission?.rank)) {
        await onBattlePassAction(userId, 'mission_rank_b', 1);
      }
    } catch {
      /* optional */
    }
    try {
      const { onAchievementAction } = await import('./achievementService.js');
      await onAchievementAction(userId, 'mission_run', 1);
    } catch {
      /* optional */
    }
    try {
      const { addHonorPoint } = await import('./villageHonorService.js');
      await addHonorPoint(userId);
    } catch {
      /* optional */
    }
    try {
      const { recordActivityEvent } = await import('./communityActivityService.js');
      await recordActivityEvent(userId, 'coop_victory', {
        missionKey: String(row.mission_id || ''),
      });
    } catch {
      /* optional */
    }
  }
}

function clearPlayerOnDefeat(player) {
  return {
    ...player,
    purse: 0,
    inventory: (player.inventory || []).map((slot, i) => ({
      slot: i,
      itemId: null,
      qty: 0,
      meta: null,
    })),
  };
}

async function advanceAfterClear(row, nodes, clearedIndex) {
  const nextNodes = unlockNext(nodes, clearedIndex);
  const availableIdx = nextNodes.findIndex(n => n.status === 'available');
  const allCleared = nextNodes.every(n => isTerminalStatus(n.status));

  row.nodes_json = nextNodes;
  row.current_combat_id = null;
  row.guest_node_ready = false;

  if (allCleared || availableIdx < 0) {
    row.current_node_index = clearedIndex;
    await completeRunVictory(row);
  } else {
    row.current_node_index = availableIdx;
    await persistRun(row);
  }
  return row;
}

async function withAllyPublicProfile(serialized) {
  const allyId = serialized?.ally?.userId;
  if (!allyId) return serialized;
  try {
    const { getPublicPlayer } = await import('./publicPlayerService.js');
    const snapshot = await getPublicPlayer(allyId);
    if (!snapshot) return serialized;
    return {
      ...serialized,
      ally: {
        ...serialized.ally,
        name: snapshot.name,
        level: snapshot.level,
        rank: snapshot.rank,
        factionId: snapshot.factionId,
        profile: snapshot.profile,
      },
    };
  } catch {
    return serialized;
  }
}

export async function getActiveCoopRun(userId) {
  const rows = await query(
    `SELECT * FROM coop_mission_runs
     WHERE state = 'in_progress' AND (host_id = ? OR guest_id = ?)
     ORDER BY created_at DESC LIMIT 1`,
    [userId, userId],
  );
  if (!rows[0]) return null;
  return withAllyPublicProfile(serializeRun(rows[0], userId));
}

export async function getCoopRun(userId, runId) {
  const row = await loadRunForUser(runId, userId);
  let mission = null;
  try {
    mission = await getMission(row.mission_id);
  } catch {
    /* ignore */
  }
  let combat = null;
  if (row.current_combat_id && row.state === 'in_progress') {
    try {
      combat = await getPublicCombat(row.current_combat_id, userId);
    } catch {
      combat = null;
    }
  }
  return withAllyPublicProfile(
    serializeRun(row, userId, {
      mission: mission
        ? {
            id: mission.id,
            slug: mission.slug,
            nameFr: mission.nameFr,
            nameEn: mission.nameEn,
            rank: mission.rank,
          }
        : null,
      combat,
    }),
  );
}

export async function startCoopMissionFromRoom(userId, roomId) {
  const room = await requireStartableRoom(userId, roomId);

  const existing = await getActiveCoopRun(userId);
  if (existing) throw httpError(409, `Mission d’équipe déjà en cours (${existing.id}).`);

  for (const uid of [room.host_id, room.guest_id]) {
    const solo = await query(
      "SELECT id FROM mission_runs WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
      [uid],
    );
    if (solo[0]) {
      throw httpError(409, `Un parcours solo est encore actif pour un participant (${solo[0].id}).`);
    }
  }

  const mission = await getMission(room.mission_id);
  const guestChar = await getCharacter(room.guest_id);
  if (!guestChar) throw httpError(400, 'L’invité doit avoir un personnage.');
  if (!canPlayMissionRank(guestChar.rank, mission.rank)) {
    const required = requiredCharacterRankForMission(mission.rank);
    throw httpError(403, `L’invité doit être au rang ${required} pour les missions ${mission.rank}.`);
  }

  const [hostBundle, guestBundle] = await Promise.all([
    loadFighterBundle(room.host_id),
    loadFighterBundle(room.guest_id),
  ]);

  const hostPouch = await consumePouchForRun(room.host_id);
  let guestPouch;
  try {
    guestPouch = await consumePouchForRun(room.guest_id);
  } catch (error) {
    // Restaure la poche hôte si l’invité échoue (ré-injecte ryos + items)
    if (hostPouch.purseStake > 0) {
      await query('UPDATE player_profiles SET pouch_ryos = ? WHERE user_id = ?', [
        hostPouch.purseStake,
        room.host_id,
      ]);
    }
    for (const entry of hostPouch.items || []) {
      try {
        await grantToPouch(room.host_id, entry.itemKey, {
          quantity: entry.quantity || 1,
          meta: entry.meta,
          notify: false,
        });
      } catch {
        /* best effort */
      }
    }
    throw error;
  }

  await markRoomStarting(roomId);

  const hardMode = Boolean(room.hard_mode);
  const nodes = buildRandomRunPath(mission.rank, { hardMode });
  const vignette = pickRankVignette(mission.rank);
  const hostMaxHp = BASE_MAX_HP + (Number(hostBundle.stats.maxHp) || 0);
  const guestMaxHp = BASE_MAX_HP + (Number(guestBundle.stats.maxHp) || 0);

  let hostPlayer = createRunPlayerState({
    maxHp: hostMaxHp,
    purseStake: hostPouch.purseStake,
    hardMode,
    rewardMult: HARD_MODE_REWARD_MULT,
    lore: vignette,
  });
  hostPlayer = applyPouchLoadout(hostPlayer, hostPouch.items);
  let guestPlayer = createRunPlayerState({
    maxHp: guestMaxHp,
    purseStake: guestPouch.purseStake,
    hardMode,
    rewardMult: HARD_MODE_REWARD_MULT,
    lore: vignette,
  });
  guestPlayer = applyPouchLoadout(guestPlayer, guestPouch.items);

  const id = randomUUID();
  await query(
    `INSERT INTO coop_mission_runs
      (id, room_id, host_id, guest_id, mission_id, host_deck_id, guest_deck_id, state,
       current_node_index, nodes_json, host_player_json, guest_player_json,
       host_stats_json, guest_stats_json, host_talents_json, guest_talents_json,
       current_combat_id, guest_node_ready, revision, last_action_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 0, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, UTC_TIMESTAMP(6))`,
    [
      id,
      roomId,
      room.host_id,
      room.guest_id,
      mission.id,
      hostBundle.deck.id,
      guestBundle.deck.id,
      JSON.stringify(nodes),
      JSON.stringify(hostPlayer),
      JSON.stringify(guestPlayer),
      JSON.stringify(hostBundle.stats),
      JSON.stringify(guestBundle.stats),
      JSON.stringify({
        codes: hostBundle.effectCodes,
        applied: hostBundle.classified.applied,
        stubbed: hostBundle.classified.stubbed,
      }),
      JSON.stringify({
        codes: guestBundle.effectCodes,
        applied: guestBundle.classified.applied,
        stubbed: guestBundle.classified.stubbed,
      }),
    ],
  );

  await markRoomClosed(roomId);
  return getCoopRun(userId, id);
}

export async function enterCoopNode(userId, runId) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (Number(row.host_id) !== Number(userId)) {
    throw httpError(403, 'Seul le chef peut démarrer une étape.');
  }

  const nodes = parseJson(row.nodes_json, []);
  const idx = findAvailableIndex(nodes);
  if (idx < 0) throw httpError(400, 'Aucun nœud disponible.');
  const node = nodes[idx];
  row.current_node_index = idx;

  if (node.type === 'combat') {
    if (row.current_combat_id) {
      const existing = await loadCombatRow(row.current_combat_id);
      if (existing?.state === 'in_progress') {
        const combat = await getPublicCombat(row.current_combat_id, userId);
        return {
          run: serializeRun(row, userId),
          combat,
          node: sanitizeNodesForClient([node])[0],
        };
      }
    }

    const hostPlayer = getPlayerState(row, 'host');
    const guestPlayer = getPlayerState(row, 'guest');
    const [hostBundle, guestBundle] = await Promise.all([
      loadFighterBundle(row.host_id),
      loadFighterBundle(row.guest_id),
    ]);

    const applyMods = (fighter, player) => {
      const mods = player.nextCombatMods || {};
      return {
        ...fighter,
        startingHp: player.hp,
        startingMaxHp: player.maxHp,
        // Chakra/block mods handled at fighter create via optional fields later if needed
        _runMods: {
          block: Number(mods.block) || 0,
          chakra: Number(mods.chakra) || 0,
          damagePct: (Number(mods.damagePct) || 0) + (Number(player.runMods?.damagePct) || 0),
        },
      };
    };

    const session = await startCoopCombatSession({
      coopRunId: row.id,
      fighters: [
        applyMods(hostBundle.fighter, hostPlayer),
        applyMods(guestBundle.fighter, guestPlayer),
      ],
      templateId: node.templateId,
      difficulty: node.difficulty || 1,
    });

    // Consume next-combat mods
    hostPlayer.nextCombatMods = {};
    guestPlayer.nextCombatMods = {};
    setPlayerState(row, 'host', hostPlayer);
    setPlayerState(row, 'guest', guestPlayer);
    row.current_combat_id = session.id;
    row.nodes_json = nodes;
    row.guest_node_ready = false;
    row = await persistRun(row);

    return {
      run: serializeRun(row, userId),
      combat: await getPublicCombat(session.id, userId),
      node: sanitizeNodesForClient([node])[0],
    };
  }

  // Non-combat: open event panel, reset guest ready
  const eventType =
    node.type === 'shop' || node.type === 'merchant'
      ? 'shop'
      : node.type === 'rest'
        ? 'rest'
        : node.type === 'branch'
          ? 'branch'
          : node.eventType || 'rest';
  const meta = EVENT_META[eventType] || EVENT_META.rest;
  nodes[idx] = {
    ...node,
    eventOpen: true,
    eventType,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
  };
  row.nodes_json = nodes;
  row.guest_node_ready = false;
  row = await persistRun(row);

  return {
    run: serializeRun(row, userId),
    combat: null,
    node: sanitizeNodesForClient([nodes[idx]])[0],
    event: serializeRun(row, userId).currentEvent,
  };
}

export async function setNodeReady(userId, runId, ready = true) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (Number(row.guest_id) !== Number(userId)) {
    throw httpError(403, 'Seul l’invité peut déclarer le ready de nœud.');
  }
  if (row.current_combat_id) throw httpError(400, 'Ready indisponible pendant un combat.');

  const nodes = parseJson(row.nodes_json, []);
  const node = nodes[Number(row.current_node_index) || 0];
  if (!node?.eventOpen || !isNonCombatNode(node)) {
    throw httpError(400, 'Aucun nœud événement ouvert.');
  }

  row.guest_node_ready = Boolean(ready);
  row = await persistRun(row);
  return serializeRun(row, userId);
}

export async function shopBuy(userId, runId, itemId, { replaceSlot = null } = {}) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  const role = roleOf(row, userId);
  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || !node.eventOpen || (node.type !== 'shop' && node.type !== 'merchant')) {
    throw httpError(400, 'Boutique non disponible.');
  }

  const offer = Array.isArray(node.offer) ? [...node.offer] : [];
  const offerIdx = offer.findIndex(item => item.id === itemId);
  if (offerIdx < 0) throw httpError(404, 'Article introuvable.');
  const offerItem = offer[offerIdx];
  if ((offerItem.stock ?? 1) <= 0) throw httpError(400, 'Article épuisé.');

  const def = getShopItem(itemId);
  if (!def) throw httpError(404, 'Article inconnu.');

  let player = getPlayerState(row, role);
  const spent = spendPurse(player, def.price);
  if (!spent.ok) throw httpError(400, 'Bourse insuffisante.', spent.code);
  player = spent.player;

  const meta = def.kind === 'pending_card' ? { rarity: def.rarity } : null;
  const replacedSlot = replaceSlot == null ? null : Number(replaceSlot);
  const previousItemId =
    replacedSlot != null && player.inventory?.[replacedSlot]?.itemId
      ? player.inventory[replacedSlot].itemId
      : null;
  const placed = placeInventoryItem(player.inventory, def, {
    replaceSlot: replacedSlot,
    meta,
  });
  if (!placed.ok) {
    throw httpError(400, 'Inventaire plein — jetez ou remplacez un objet.', placed.code);
  }
  player.inventory = placed.inventory;
  if (placed.replaced && previousItemId) {
    player = untrackPendingCard(player, previousItemId);
  }
  if (def.kind === 'pending_card') {
    player = trackPendingCard(player, def, meta);
  }
  setPlayerState(row, role, player);

  offer[offerIdx] = { ...offerItem, stock: 0 };
  nodes[idx] = { ...node, offer };
  row.nodes_json = nodes;
  // Buying after ready clears ready so guest/host can keep shopping
  if (role === 'guest') row.guest_node_ready = false;
  row = await persistRun(row);
  return serializeRun(row, userId, {
    lastPurchase: { itemId: def.id, price: def.price, slot: placed.slot },
  });
}

export async function inventoryUse(userId, runId, slotIndex) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (row.current_combat_id) {
    throw httpError(400, 'Impossible d’utiliser un objet pendant un combat.');
  }
  const role = roleOf(row, userId);
  const player = getPlayerState(row, role);
  const result = useInventorySlot(player, Number(slotIndex));
  if (!result.ok) {
    const messages = {
      EMPTY_SLOT: 'Emplacement vide.',
      SEALED_UNTIL_FINISH: 'Parchemin scellé — révélation à la fin du parcours.',
      NOT_USABLE: 'Objet non utilisable.',
    };
    throw httpError(400, messages[result.code] || 'Utilisation impossible.', result.code);
  }
  setPlayerState(row, role, result.player);
  if (role === 'guest') row.guest_node_ready = false;
  row = await persistRun(row);
  return serializeRun(row, userId, { lastUse: result.log });
}

export async function inventoryDiscard(userId, runId, slotIndex) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  const role = roleOf(row, userId);
  let player = getPlayerState(row, role);
  const discardedItemId = player.inventory?.[Number(slotIndex)]?.itemId || null;
  const result = discardInventorySlot(player.inventory, Number(slotIndex));
  if (!result.ok) throw httpError(400, 'Emplacement vide.', result.code);
  player = { ...player, inventory: result.inventory };
  if (discardedItemId) player = untrackPendingCard(player, discardedItemId);
  setPlayerState(row, role, player);
  row = await persistRun(row);
  return serializeRun(row, userId);
}

function requireGuestReady(row) {
  if (!row.guest_node_ready) {
    throw httpError(409, 'L’invité doit être prêt avant d’avancer.', 'GUEST_NOT_READY');
  }
}

export async function resolveCoopEvent(userId, runId, choiceId) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (Number(row.host_id) !== Number(userId)) {
    throw httpError(403, 'Seul le chef peut résoudre l’étape.');
  }
  requireGuestReady(row);

  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || node.status !== 'available' || !node.eventOpen) {
    throw httpError(400, 'Aucun événement ouvert.');
  }

  if (node.type === 'branch') {
    let hostPlayer = grantNodePurse(getPlayerState(row, 'host'));
    let guestPlayer = grantNodePurse(getPlayerState(row, 'guest'));
    const applied = applyBranchChoice(nodes, idx, choiceId);
    hostPlayer = {
      ...hostPlayer,
      branchId: applied.branchId,
      branchXpMult: applied.xpMult,
    };
    guestPlayer = {
      ...guestPlayer,
      branchId: applied.branchId,
      branchXpMult: applied.xpMult,
    };
    setPlayerState(row, 'host', hostPlayer);
    setPlayerState(row, 'guest', guestPlayer);
    row.nodes_json = applied.nodes;
    row.guest_node_ready = false;
    const availableIdx = applied.nodes.findIndex(n => n.status === 'available');
    row.current_node_index = availableIdx >= 0 ? availableIdx : idx;
    row = await persistRun(row);
    return serializeRun(row, userId, { branchChosen: choiceId });
  }

  let hostPlayer = getPlayerState(row, 'host');
  let guestPlayer = getPlayerState(row, 'guest');

  if (node.type === 'shop' || node.type === 'merchant' || choiceId === 'leave') {
    if (choiceId !== 'leave' && (node.type === 'shop' || node.type === 'merchant')) {
      throw httpError(400, 'Utilisez l’achat boutique, puis quittez.');
    }
    hostPlayer = grantNodePurse(hostPlayer);
    guestPlayer = grantNodePurse(guestPlayer);
  } else if (choiceId === 'rest_here') {
    const pct = node.type === 'rest' ? 0.4 : 0.5;
    hostPlayer = healPercent(hostPlayer, pct);
    guestPlayer = healPercent(guestPlayer, pct);
    delete hostPlayer.lastHeal;
    delete guestPlayer.lastHeal;
    hostPlayer = grantNodePurse(hostPlayer);
    guestPlayer = grantNodePurse(guestPlayer);
  } else if (choiceId === 'take_scrap') {
    hostPlayer = healPercent(hostPlayer, 0.1);
    guestPlayer = healPercent(guestPlayer, 0.1);
    hostPlayer = { ...hostPlayer, purse: getPurse(hostPlayer) + 40 };
    guestPlayer = { ...guestPlayer, purse: getPurse(guestPlayer) + 40 };
    delete hostPlayer.lastHeal;
    delete guestPlayer.lastHeal;
  } else {
    hostPlayer = grantNodePurse(hostPlayer);
    guestPlayer = grantNodePurse(guestPlayer);
  }

  setPlayerState(row, 'host', hostPlayer);
  setPlayerState(row, 'guest', guestPlayer);
  row = await advanceAfterClear(row, nodes, idx);
  return serializeRun(row, userId);
}

export async function applyCoopCombatAction(userId, runId, action) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (!row.current_combat_id) throw httpError(400, 'Aucun combat en cours.');

  const result = await applyCombatAction(row.current_combat_id, userId, action);
  row.last_action_at = new Date();
  await query(
    `UPDATE coop_mission_runs
     SET revision = revision + 1, last_action_at = UTC_TIMESTAMP(6)
     WHERE id = ?`,
    [row.id],
  );

  if (result.combat.state !== 'in_progress') {
    row = await onCoopCombatFinished(row, result.combat, result.row);
    return {
      run: serializeRun(row, userId),
      combat: null,
    };
  }

  row = await loadRunRow(row.id);
  return {
    run: serializeRun(row, userId),
    combat: result.public,
  };
}

async function onCoopCombatFinished(row, combat, sessionRow) {
  if (row.state !== 'in_progress') return row;
  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;

  if (combat.state === 'victory' || sessionRow.state === 'victory') {
    for (const role of ['host', 'guest']) {
      const seat = combat.players.find(p => Number(p.id) === Number(role === 'host' ? row.host_id : row.guest_id));
      let player = getPlayerState(row, role);
      const hp = Math.max(1, Number(seat?.hp) || 1);
      const maxHp = Number(seat?.maxHp) || player.maxHp;
      player = grantCombatPurse({
        ...player,
        hp: Math.min(maxHp, hp),
        maxHp,
        combatsWon: (player.combatsWon || 0) + 1,
      });
      setPlayerState(row, role, player);
    }
    return advanceAfterClear(row, nodes, idx);
  }

  // Defeat / forfeit — poche déjà consommée au start ; clear de sécurité
  setPlayerState(row, 'host', clearPlayerOnDefeat(getPlayerState(row, 'host')));
  setPlayerState(row, 'guest', clearPlayerOnDefeat(getPlayerState(row, 'guest')));
  row.state = 'defeat';
  row.current_combat_id = null;
  row.rewards_host_json = null;
  row.rewards_guest_json = null;
  if (nodes[idx]) {
    nodes[idx] = { ...nodes[idx], status: 'failed' };
    row.nodes_json = nodes;
  }
  const persisted = await persistRun(row);
  for (const userId of [row.host_id, row.guest_id]) {
    try {
      const { recordActivityEvent } = await import('./communityActivityService.js');
      await recordActivityEvent(userId, 'coop_defeat', {
        missionKey: String(row.mission_id || ''),
      });
    } catch {
      /* optional */
    }
  }
  try {
    await clearPouch(row.host_id);
    await clearPouch(row.guest_id);
  } catch {
    /* optionnel */
  }
  return persisted;
}

/** Hook appelé après auto-end_turn du scheduler. */
export async function syncCoopCombatOutcome(combatId) {
  const session = await loadCombatRow(combatId);
  if (!session || session.state === 'in_progress') return null;
  const row = await loadRunRow(session.coop_run_id);
  if (row.state !== 'in_progress') return row;
  if (row.current_combat_id !== combatId) return row;
  const combat = parseJson(session.combat_state_json, null);
  return onCoopCombatFinished(row, combat, session);
}

export async function abandonCoopRun(userId, runId) {
  let row = await loadRunForUser(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours déjà terminé.');

  if (row.current_combat_id) {
    try {
      await applyCombatAction(row.current_combat_id, userId, { type: 'forfeit' });
    } catch {
      /* may already be finished */
    }
  }

  setPlayerState(row, 'host', clearPlayerOnDefeat(getPlayerState(row, 'host')));
  setPlayerState(row, 'guest', clearPlayerOnDefeat(getPlayerState(row, 'guest')));
  row.state = 'abandoned';
  row.current_combat_id = null;
  row.rewards_host_json = null;
  row.rewards_guest_json = null;
  row = await persistRun(row);
  try {
    await clearPouch(row.host_id);
    await clearPouch(row.guest_id);
  } catch {
    /* optionnel */
  }
  return serializeRun(row, userId);
}

export async function abandonInactiveCoopRuns({ limit = 20 } = {}) {
  // mysql2 execute() refuse LIMIT ? (ER_WRONG_ARGUMENTS) — inline borné comme ailleurs.
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const inactivityUs = Math.max(1, Math.trunc(Number(COOP_RUN_INACTIVITY_MS) * 1000) || 1);
  const rows = await query(
    `SELECT * FROM coop_mission_runs
     WHERE state = 'in_progress'
       AND last_action_at < DATE_SUB(UTC_TIMESTAMP(6), INTERVAL ${inactivityUs} MICROSECOND)
     ORDER BY last_action_at ASC
     LIMIT ${safeLimit}`,
  );

  const out = [];
  for (const row of rows) {
    try {
      setPlayerState(row, 'host', clearPlayerOnDefeat(getPlayerState(row, 'host')));
      setPlayerState(row, 'guest', clearPlayerOnDefeat(getPlayerState(row, 'guest')));
      row.state = 'defeat';
      row.current_combat_id = null;
      await persistRun(row);
      out.push({ id: row.id, state: 'defeat' });
    } catch (error) {
      out.push({ id: row.id, error: error.message });
    }
  }
  return out;
}

export const __test = {
  serializeRun,
  applyBranchChoice,
  roleOf,
  createEmptyStats,
};
