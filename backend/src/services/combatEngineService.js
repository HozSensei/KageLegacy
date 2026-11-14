/**
 * Moteur de combat deck-building (Phase 4).
 *
 * API publique :
 *   startCombat, getCombatState, playCard, endTurn, forfeit, discardForChakra
 *
 * Formules : docs/COMBAT_SYSTEM.md
 *   Dégâts = Base × (1 + Stat/100)
 *   Chakra 3/tour, pioche 5, armure fade en fin de tour joueur
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import {
  BASE_CHAKRA,
  BASE_MAX_HP,
  DRAW_PER_TURN,
} from './deckCombat/constants.js';
import {
  buildPracticeDeckEntries,
  buildRuntimeDeck,
  drawCards,
  moveCardFromHand,
  shuffle,
} from './deckCombat/deckRuntime.js';
import { applyCardPlay } from './deckCombat/cardEffects.js';
import {
  resolveEndOfTurnStatuses,
  resolveStartOfTurnStatuses,
} from './deckCombat/statuses.js';
import {
  applyTalentStartOfTurn,
  classifyTalentEffects,
  computeTalentDamageMods,
} from './deckCombat/talentEffects.js';
import {
  executeEnemyIntent,
  generateEnemyFromTemplate,
} from './combatAIService.js';
import { createEmptyStats, getComputedStats } from './playerCharacterService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
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

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function appendLog(combatId, turn, actionType, actionData) {
  if (!(await tableExists('combat_logs'))) return;
  await query(
    `INSERT INTO combat_logs (combat_session_id, turn, action_type, action_data_json)
     VALUES (?, ?, ?, ?)`,
    [combatId, turn, actionType, JSON.stringify(actionData || {})],
  );
}

async function loadSession(combatId, userId) {
  const rows = await query(
    'SELECT * FROM combat_sessions WHERE id = ? AND user_id = ? LIMIT 1',
    [combatId, userId],
  );
  if (!rows[0]) throw httpError(404, 'Combat introuvable.');
  return hydrateSession(rows[0]);
}

function hydrateSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    deckId: row.deck_id,
    state: row.state,
    currentTurn: row.current_turn,
    currentPhase: row.current_phase,
    player: parseJson(row.player_state_json, {}),
    enemy: parseJson(row.enemy_state_json, {}),
    stats: parseJson(row.stats_snapshot_json, createEmptyStats()),
    talentEffects: parseJson(row.talent_effects_json, { codes: [], applied: [], stubbed: [] }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistSession(session) {
  await query(
    `UPDATE combat_sessions
     SET state = ?, player_state_json = ?, enemy_state_json = ?,
         current_turn = ?, current_phase = ?
     WHERE id = ? AND user_id = ?`,
    [
      session.state,
      JSON.stringify(session.player),
      JSON.stringify(session.enemy),
      session.currentTurn,
      session.currentPhase,
      session.id,
      session.userId,
    ],
  );
}

function publicState(session, extraLogs = []) {
  return {
    id: session.id,
    missionId: session.missionId,
    deckId: session.deckId,
    state: session.state,
    currentTurn: session.currentTurn,
    currentPhase: session.currentPhase,
    player: sanitizePlayer(session.player),
    enemy: sanitizeEnemy(session.enemy),
    stats: session.stats,
    talentEffects: session.talentEffects,
    logs: extraLogs,
  };
}

function sanitizePlayer(player) {
  return {
    name: player.name,
    hp: player.hp,
    maxHp: player.maxHp,
    block: player.block || 0,
    chakra: player.chakra,
    maxChakra: player.maxChakra ?? BASE_CHAKRA,
    statuses: player.statuses || [],
    hand: player.hand || [],
    drawCount: (player.drawPile || []).length,
    discardCount: (player.discardPile || []).length,
    exhaustCount: (player.exhaustPile || []).length,
    discardedForChakra: Boolean(player.discardedForChakra),
  };
}

function sanitizeEnemy(enemy) {
  return {
    templateId: enemy.templateId,
    nameFr: enemy.nameFr,
    nameEn: enemy.nameEn,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    block: enemy.block || 0,
    statuses: enemy.statuses || [],
    posture: enemy.posture,
    elementAffinity: enemy.elementAffinity,
    intent: enemy.intent,
  };
}

function checkVictory(session) {
  if ((session.enemy.hp || 0) <= 0) {
    session.state = 'victory';
    session.currentPhase = 'game_over';
    return 'victory';
  }
  if ((session.player.hp || 0) <= 0) {
    session.state = 'defeat';
    session.currentPhase = 'game_over';
    return 'defeat';
  }
  return null;
}

async function resolveDeckCards(userId, deckId) {
  const { getDeck, getActiveDeck } = await import('./deckService.js');

  let deck = null;
  if (deckId) {
    deck = await getDeck(userId, Number(deckId));
  } else {
    deck = await getActiveDeck(userId);
  }

  if (deck && deck.cards?.length) {
    return { deckId: deck.id, cards: deck.cards, practice: false };
  }

  // Fallback : cartes du catalogue si présentes
  try {
    const { getAllCards } = await import('./cardService.js');
    const catalog = await getAllCards({});
    if (catalog.length >= 6) {
      const picked = catalog.slice(0, 8).map((card) => ({
        quantity: 3,
        card,
      }));
      return { deckId: null, cards: picked, practice: true };
    }
  } catch {
    /* ignore */
  }

  return { deckId: null, cards: buildPracticeDeckEntries(), practice: true };
}

async function loadTalentEffectCodes(userId) {
  try {
    const { computeTalentBonuses } = await import('./talentTreeService.js');
    const bonuses = await computeTalentBonuses(userId);
    return (bonuses.effects || []).map((e) => e.effectCode).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadPlayerName(userId) {
  try {
    const rows = await query(
      'SELECT name FROM player_character WHERE user_id = ? LIMIT 1',
      [userId],
    );
    return rows[0]?.name || 'Shinobi';
  } catch {
    return 'Shinobi';
  }
}

/**
 * Démarre un combat.
 * @param {number} userId
 * @param {{ missionId?: number, deckId?: number, templateId?: string, difficulty?: number }} opts
 */
export async function startCombat(userId, opts = {}) {
  if (!userId) throw httpError(400, 'userId requis.');
  if (!(await tableExists('combat_sessions'))) {
    throw httpError(503, 'Tables combat absentes — lancez les migrations (103).');
  }

  // Un seul combat actif à la fois
  const active = await query(
    'SELECT id FROM combat_sessions WHERE user_id = ? AND state = \'in_progress\' LIMIT 1',
    [userId],
  );
  if (active[0]) {
    throw httpError(409, `Combat déjà en cours (${active[0].id}). Abandonnez-le ou terminez-le.`);
  }

  const missionId = opts.missionId != null ? Number(opts.missionId) : null;
  let templateId = opts.templateId || null;
  let difficulty = opts.difficulty || 1;
  let mission = null;

  if (missionId) {
    const rows = await query(
      'SELECT * FROM mission_definitions WHERE id = ? AND is_active = 1 LIMIT 1',
      [missionId],
    );
    mission = rows[0];
    if (!mission) throw httpError(404, 'Mission introuvable.');
    const encounters = parseJson(mission.encounters_json, []);
    const first = encounters[0];
    if (!first?.templateId) throw httpError(400, 'Mission sans encounter.');
    templateId = first.templateId;
    difficulty = first.difficulty || 1;
  }

  if (!templateId) templateId = 'ronin_bandit';

  const [{ total: stats }, effectCodes, playerName, deckInfo] = await Promise.all([
    getComputedStats(userId),
    loadTalentEffectCodes(userId),
    loadPlayerName(userId),
    resolveDeckCards(userId, opts.deckId),
  ]);

  const classified = classifyTalentEffects(effectCodes);
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);

  const runtimeCards = buildRuntimeDeck(deckInfo.cards, (card, n) => `${card.slug || card.id}-${n}-${randomUUID().slice(0, 8)}`);
  const shuffled = shuffle(runtimeCards);

  let player = {
    name: playerName,
    hp: maxHp,
    maxHp,
    block: 0,
    chakra: BASE_CHAKRA,
    maxChakra: BASE_CHAKRA,
    statuses: [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
  };

  const drawn = drawCards(player, DRAW_PER_TURN);
  player = drawn.player;

  // Talents début de premier tour
  const talentStart = applyTalentStartOfTurn(player, classified.applied);
  player = talentStart.player;

  const enemy = generateEnemyFromTemplate(templateId, difficulty);

  const id = randomUUID();
  const talentEffects = {
    codes: effectCodes,
    applied: classified.applied,
    stubbed: classified.stubbed,
  };

  await query(
    `INSERT INTO combat_sessions
      (id, user_id, mission_id, deck_id, state, player_state_json, enemy_state_json,
       current_turn, current_phase, stats_snapshot_json, talent_effects_json)
     VALUES (?, ?, ?, ?, 'in_progress', ?, ?, 1, 'player_turn', ?, ?)`,
    [
      id,
      userId,
      missionId,
      deckInfo.deckId,
      JSON.stringify(player),
      JSON.stringify(enemy),
      JSON.stringify(stats),
      JSON.stringify(talentEffects),
    ],
  );

  const startLogs = [
    { type: 'combat_start', templateId, practiceDeck: deckInfo.practice },
    { type: 'draw', count: drawn.drawn.length },
    ...talentStart.logs,
    { type: 'intent', intent: enemy.intent },
  ];
  await appendLog(id, 1, 'combat_start', {
    templateId,
    missionId,
    practiceDeck: deckInfo.practice,
  });

  const session = {
    id,
    userId,
    missionId,
    deckId: deckInfo.deckId,
    state: 'in_progress',
    currentTurn: 1,
    currentPhase: 'player_turn',
    player,
    enemy,
    stats,
    talentEffects,
  };

  return publicState(session, startLogs);
}

export async function getCombatState(userId, combatId) {
  const session = await loadSession(combatId, userId);
  return publicState(session);
}

export async function playCard(userId, combatId, { instanceId, cardId } = {}) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, 'Ce n\'est pas votre tour.');

  const handId = instanceId || cardId;
  if (!handId) throw httpError(400, 'instanceId requis.');

  const card = (session.player.hand || []).find((c) => c.instanceId === handId);
  if (!card) throw httpError(404, 'Carte absente de la main.');

  const talentMods = computeTalentDamageMods(session.talentEffects.applied, session.player);
  const played = applyCardPlay({
    player: session.player,
    enemy: session.enemy,
    card,
    stats: session.stats,
    talentMods,
  });

  const moved = moveCardFromHand(
    played.player,
    handId,
    card.exhaust ? 'exhaust' : 'discard',
  );

  session.player = moved.player;
  session.enemy = played.enemy;

  const outcome = checkVictory(session);
  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'play_card', {
    instanceId: handId,
    slug: card.slug,
    logs: played.logs,
    outcome,
  });

  return publicState(session, [
    ...played.logs,
    ...(outcome ? [{ type: outcome }] : []),
  ]);
}

/**
 * Défausse 1 carte pour +1 Chakra (1×/tour).
 */
export async function discardForChakra(userId, combatId, { instanceId } = {}) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, 'Ce n\'est pas votre tour.');
  if (session.player.discardedForChakra) {
    throw httpError(400, 'Déjà utilisé ce tour (défausse → Chakra).');
  }
  if (!instanceId) throw httpError(400, 'instanceId requis.');

  const moved = moveCardFromHand(session.player, instanceId, 'discard');
  if (!moved.card) throw httpError(404, 'Carte absente de la main.');

  session.player = {
    ...moved.player,
    chakra: (Number(moved.player.chakra) || 0) + 1,
    discardedForChakra: true,
  };

  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'discard_for_chakra', { instanceId });

  return publicState(session, [
    { type: 'discard_for_chakra', instanceId, chakra: session.player.chakra },
  ]);
}

export async function endTurn(userId, combatId) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, 'Ce n\'est pas votre tour.');

  const logs = [];

  // Fin de tour joueur : brûlure + tick durées — l'armure JOUEUR persiste
  // jusqu'au début du prochain tour joueur (protège contre l'ennemi, style StS).
  const playerEnd = resolveEndOfTurnStatuses(session.player, { persistBlock: true });
  session.player = playerEnd.entity;
  logs.push(...playerEnd.logs.map((l) => ({ ...l, side: 'player' })));

  if (checkVictory(session)) {
    await persistSession(session);
    logs.push({ type: session.state });
    return publicState(session, logs);
  }

  // Tour ennemi
  session.currentPhase = 'enemy_turn';

  // Début tour ennemi : fade armure ennemi du tour précédent, puis poison/regen
  if ((session.enemy.block || 0) > 0) {
    logs.push({ type: 'block_fade', side: 'enemy', value: session.enemy.block });
    session.enemy = { ...session.enemy, block: 0 };
  }
  const enemyStart = resolveStartOfTurnStatuses(session.enemy);
  session.enemy = enemyStart.entity;
  logs.push(...enemyStart.logs.map((l) => ({ ...l, side: 'enemy' })));

  if (checkVictory(session)) {
    await persistSession(session);
    logs.push({ type: session.state });
    return publicState(session, logs);
  }

  // Exécute intention (l'armure joueur absorbe encore)
  const enemyAct = executeEnemyIntent(session.enemy, session.player);
  session.enemy = enemyAct.enemy;
  session.player = enemyAct.player;
  logs.push(...enemyAct.logs);

  if (checkVictory(session)) {
    await persistSession(session);
    logs.push({ type: session.state });
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  // Fin tour ennemi : burn ennemi (armure ennemi garde jusqu'à son prochain début)
  const enemyEnd = resolveEndOfTurnStatuses(session.enemy, { persistBlock: true });
  session.enemy = enemyEnd.entity;
  logs.push(...enemyEnd.logs.map((l) => ({ ...l, side: 'enemy' })));

  if (checkVictory(session)) {
    await persistSession(session);
    logs.push({ type: session.state });
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  // Nouveau tour joueur — fade armure joueur ici (après avoir tanké l'ennemi)
  session.currentTurn += 1;
  session.currentPhase = 'player_turn';

  if ((session.player.block || 0) > 0) {
    logs.push({ type: 'block_fade', side: 'player', value: session.player.block });
    session.player = { ...session.player, block: 0 };
  }

  const playerStart = resolveStartOfTurnStatuses(session.player);
  session.player = {
    ...playerStart.entity,
    chakra: session.player.maxChakra ?? BASE_CHAKRA,
    discardedForChakra: false,
  };
  logs.push(...playerStart.logs.map((l) => ({ ...l, side: 'player' })));

  const talentStart = applyTalentStartOfTurn(session.player, session.talentEffects.applied);
  session.player = talentStart.player;
  logs.push(...talentStart.logs);

  // Défausse la main restante puis pioche
  const leftover = session.player.hand || [];
  session.player = {
    ...session.player,
    hand: [],
    discardPile: [...(session.player.discardPile || []), ...leftover],
  };
  const drawn = drawCards(session.player, DRAW_PER_TURN);
  session.player = drawn.player;
  logs.push({ type: 'draw', count: drawn.drawn.length });

  if (checkVictory(session)) {
    logs.push({ type: session.state });
  }

  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'end_turn', { logs });

  return publicState(session, logs);
}

export async function forfeit(userId, combatId) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat déjà terminé.');

  session.state = 'forfeited';
  session.currentPhase = 'game_over';
  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'forfeit', {});

  return publicState(session, [{ type: 'forfeited' }]);
}

/** Helpers exportés pour tests unitaires purs */
export const __test = {
  checkVictory,
  publicState,
  hydrateSession,
};
