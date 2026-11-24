/**
 * Moteur de combat deck-building (Phase 4+).
 *
 * API publique :
 *   startCombat, getCombatState, playCard, endTurn, forfeit, discardForChakra
 *
 * Formules : docs/CARDS_AND_COMBAT.md
 *   Dégâts = Base × (1 + Stat/100)
 *   Chakra 3/tour, pioche 5, armure restante ÷2 au début du tour du porteur
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { BASE_CHAKRA, BASE_MAX_HP, DRAW_PER_TURN, MAX_HAND_SIZE } from './deckCombat/constants.js';
import {
  buildRuntimeDeck,
  drawCards,
  moveCardFromHand,
  shuffle,
} from './deckCombat/deckRuntime.js';
import { applyCardPlay, resolveAllyAttack } from './deckCombat/cardEffects.js';
import { applySoloCardBalance } from './deckCombat/soloCardBalance.js';
import {
  applyBlockFade,
  resolveEndOfTurnStatuses,
  resolveStartOfTurnStatuses,
} from './deckCombat/statuses.js';
import { applyHeldTurnStart } from './deckCombat/heldEffects.js';
import {
  applyTalentAfterCardPlay,
  applyTalentAfterDamageTaken,
  applyTalentCombatStart,
  applyTalentEndOfPlayerTurn,
  applyTalentStartOfTurn,
  classifyTalentEffects,
  computeTalentDamageMods,
  countDeckElements,
  resolveCardPileDestination,
} from './deckCombat/talentEffects.js';
import {
  executeEnemyIntent,
  generateEnemyFromTemplate,
  getNextIntent,
  maybeAdvanceBossPhase,
} from './combatAIService.js';
import { createEmptyStats, getComputedStats } from './playerCharacterService.js';
import { loadCombatCharacter } from './combatCharacterService.js';
import { publicFighterIdentity } from './deckCombat/fighterIdentity.js';
import { grantVictoryRewards } from './combatRewardService.js';

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

async function columnExists(tableName, columnName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
       LIMIT 1`,
      [tableName, columnName],
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
  const rows = await query('SELECT * FROM combat_sessions WHERE id = ? AND user_id = ? LIMIT 1', [
    combatId,
    userId,
  ]);
  if (!rows[0]) throw httpError(404, 'Combat introuvable.');
  return hydrateSession(rows[0]);
}

function hydrateSession(row) {
  const player = parseJson(row.player_state_json, {});
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    missionRunId: row.mission_run_id || null,
    deckId: row.deck_id,
    state: row.state,
    currentTurn: row.current_turn,
    currentPhase: row.current_phase,
    player,
    enemy: parseJson(row.enemy_state_json, {}),
    stats: parseJson(row.stats_snapshot_json, createEmptyStats()),
    talentEffects: parseJson(row.talent_effects_json, { codes: [], applied: [], stubbed: [] }),
    rewards: parseJson(row.rewards_json, null),
    suppressRewards: Boolean(row.mission_run_id || player.turnPrototype),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistSession(session) {
  const hasRewardsCol = await columnExists('combat_sessions', 'rewards_json');
  if (hasRewardsCol) {
    await query(
      `UPDATE combat_sessions
       SET state = ?, player_state_json = ?, enemy_state_json = ?,
           current_turn = ?, current_phase = ?, rewards_json = ?
       WHERE id = ? AND user_id = ?`,
      [
        session.state,
        JSON.stringify(session.player),
        JSON.stringify(session.enemy),
        session.currentTurn,
        session.currentPhase,
        session.rewards != null ? JSON.stringify(session.rewards) : null,
        session.id,
        session.userId,
      ],
    );
  } else {
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
}

function publicState(session, extraLogs = []) {
  return {
    id: session.id,
    missionId: session.missionId,
    missionRunId: session.missionRunId || null,
    deckId: session.deckId,
    state: session.state,
    currentTurn: session.currentTurn,
    currentPhase: session.currentPhase,
    turnPrototype: session.player.turnPrototype || null,
    ruleset: session.player.ruleset || session.player.turnPrototype || 'classic',
    player: sanitizePlayer(session.player),
    enemy: sanitizeEnemy(session.enemy, session.player.ruleset || session.player.turnPrototype),
    stats: session.stats,
    talentEffects: session.talentEffects,
    rewards: session.rewards || null,
    suppressRewards: Boolean(session.suppressRewards || session.missionRunId),
    run: session.runUpdate || null,
    logs: extraLogs,
  };
}

function sanitizePlayer(player) {
  return {
    name: player.name,
    ...publicFighterIdentity(player),
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
    previousCardStatType: player.previousCardStatType || null,
    reservedCard: player.reserveCard || null,
    ...(usesPersistentHand(player) && {
      discardsRemaining: Math.max(0, 2 - (player.voluntaryDiscards || 0)),
      chakraDiscardAvailable: !player.discardedForChakra && (player.voluntaryDiscards || 0) < 2,
    }),
    ally: player.ally
      ? {
          nameFr: player.ally.nameFr,
          nameEn: player.ally.nameEn,
          hp: player.ally.hp,
          maxHp: player.ally.maxHp,
          attack: player.ally.attack,
          taunt: Boolean(player.ally.taunt),
          regen: Math.max(0, Number(player.ally.regen) || 0),
          evadeChance: Math.max(0, Number(player.ally.evadeChance) || 0),
          burn: player.ally.burn || null,
          strike: Boolean(player.ally.strike),
        }
      : null,
  };
}

function configurePrototypeEnemy(enemy) {
  enemy.ai = 'pattern';
  enemy.patternIndex = 0;
  enemy.pattern = [
    { type: 'attack', damage: 26 },
    { type: 'defend', block: 5 },
    { type: 'attack', damage: 16 },
  ];
  enemy.intent = getNextIntent(enemy);
  return enemy;
}

function usesPersistentHand(player) {
  return (player.ruleset || player.turnPrototype) === 'persistent';
}

function queueSoloIntent(enemy, rng = Math.random) {
  const upcoming = { ...enemy, patternIndex: (Number(enemy.patternIndex) || 0) + 1 };
  return {
    ...enemy,
    queuedIntent: { phaseIndex: enemy.phaseIndex ?? -1, intent: getNextIntent(upcoming, 0, rng) },
  };
}

function syncSoloIntent(session) {
  if (session.player.ruleset !== 'persistent') return;
  if (session.enemy.queuedIntent?.phaseIndex !== (session.enemy.phaseIndex ?? -1)) {
    session.enemy = queueSoloIntent(session.enemy);
  }
}

function previewNextIntent(enemy) {
  if (enemy.intent?.type === 'charge') return { type: 'attack' };
  const next =
    enemy.queuedIntent?.intent ??
    enemy.pattern?.[((enemy.patternIndex || 0) + 1) % enemy.pattern.length];
  return next ? { type: next.type } : null;
}

function sanitizeEnemy(enemy, turnPrototype) {
  return {
    templateId: enemy.templateId,
    nameFr: enemy.nameFr,
    nameEn: enemy.nameEn,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    block: enemy.block || 0,
    barrier: enemy.barrier || 0,
    chakra: enemy.chakra,
    maxChakra: enemy.maxChakra,
    statuses: enemy.statuses || [],
    posture: enemy.posture,
    elementAffinity: enemy.elementAffinity,
    intent: enemy.intent,
    ...(turnPrototype && { nextIntent: previewNextIntent(enemy) }),
    boss: Boolean(enemy.boss),
    rank: enemy.rank || null,
    phaseId: enemy.phaseId || 'base',
    phaseIndex: Number.isFinite(Number(enemy.phaseIndex)) ? Number(enemy.phaseIndex) : -1,
    immunities: enemy.immunities || [],
    minion: enemy.minion
      ? {
          nameFr: enemy.minion.nameFr,
          nameEn: enemy.minion.nameEn,
          hp: enemy.minion.hp,
          maxHp: enemy.minion.maxHp,
          attack: enemy.minion.attack,
          taunt: enemy.minion.taunt !== false,
        }
      : null,
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

/**
 * Si victoire et récompenses pas encore versées → grant + stocke sur la session.
 * Les combats liés à un mission run différent les récompenses en fin de parcours.
 */
async function maybeGrantVictoryRewards(session) {
  if (session.state !== 'victory') return null;
  if (session.suppressRewards || session.missionRunId) return null;
  if (session.rewards) return session.rewards;
  try {
    const rewards = await grantVictoryRewards(session.userId, session.missionId);
    session.rewards = rewards;
    return rewards;
  } catch (err) {
    session.rewards = { error: true, message: err.message };
    return session.rewards;
  }
}

/**
 * Notifie le service de run quand un combat de parcours se termine.
 */
async function maybeNotifyRunCombatFinished(session) {
  if (!session.missionRunId) return;
  if (!['victory', 'defeat', 'forfeited'].includes(session.state)) return;
  try {
    const { onRunCombatFinished } = await import('./missionRunService.js');
    const run = await onRunCombatFinished(session);
    if (run) session.runUpdate = run;
  } catch {
    /* ne pas faire échouer le combat si le hook run plante */
  }
}

/**
 * Grant récompenses (si applicable) + hook run + marque log outcome.
 */
async function maybeProgressBattlePassCombatWin(session) {
  if (session.state !== 'victory' || !session.userId || session.player.turnPrototype) return;
  if (session.bpCombatWinCounted) return;
  session.bpCombatWinCounted = true;
  try {
    const { onBattlePassAction } = await import('./battlePassQuestService.js');
    await onBattlePassAction(session.userId, 'combat_win', 1);
  } catch {
    /* BP optionnel */
  }
  try {
    const { onOnboardingAction } = await import('./onboardingService.js');
    await onOnboardingAction(session.userId, 'combat_win');
  } catch {
    /* onboarding optionnel */
  }
}

async function maybeRecordCombatAchievements(session) {
  if (!session.userId || session.achievementsRecorded || session.player.turnPrototype) return;
  if (!['victory', 'defeat', 'forfeited'].includes(session.state)) return;
  session.achievementsRecorded = true;
  try {
    const { recordCombatAchievements } = await import('./achievementService.js');
    await recordCombatAchievements(session.userId, session, session.state);
  } catch {
    /* exploits optionnels */
  }
}

async function finalizeCombatOutcome(session, logs = []) {
  if (!['victory', 'defeat', 'forfeited'].includes(session.state)) return logs;
  if (session.state === 'victory') {
    const rewards = await maybeGrantVictoryRewards(session);
    if (rewards) logs.push({ type: 'rewards', rewards });
    await maybeProgressBattlePassCombatWin(session);
  }
  await maybeRecordCombatAchievements(session);
  await maybeNotifyRunCombatFinished(session);
  logs.push({ type: session.state });
  return logs;
}

async function resolveDeckCards(userId, deckId) {
  const { getPlayableDeckForCombat } = await import('./deckService.js');
  const deck = await getPlayableDeckForCombat(userId, deckId);
  return { deckId: deck.id, cards: deck.cards, deckPassives: deck.passiveBonuses, practice: false };
}

async function loadTalentEffectCodes(userId) {
  try {
    const { computeTalentBonuses } = await import('./talentTreeService.js');
    const bonuses = await computeTalentBonuses(userId);
    return (bonuses.effects || []).map(e => e.effectCode).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadPlayerIdentity(userId) {
  const character = await loadCombatCharacter(userId).catch(() => null);
  return {
    name: character?.name || 'Shinobi',
    ...(character && publicFighterIdentity(character)),
  };
}

/**
 * Démarre un combat.
 * @param {number} userId
 * @param {{
 *   missionId?: number,
 *   deckId?: number,
 *   templateId?: string,
 *   difficulty?: number,
 *   missionRunId?: string,
 *   startingHp?: number,
 *   startingMaxHp?: number,
 *   suppressRewards?: boolean,
 * }} opts
 */
export async function startCombat(userId, opts = {}) {
  if (!userId) throw httpError(400, 'userId requis.');
  const turnPrototype = opts.turnPrototype || null;
  if (
    turnPrototype &&
    (!['classic', 'persistent'].includes(turnPrototype) || opts.missionId || opts.missionRunId)
  ) {
    throw httpError(400, 'Prototype réservé à l’entraînement hors mission.');
  }
  if (!(await tableExists('combat_sessions'))) {
    throw httpError(503, 'Tables combat absentes — lancez les migrations (103).');
  }

  const active = await query(
    "SELECT id FROM combat_sessions WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId],
  );
  if (active[0]) {
    throw httpError(409, `Combat déjà en cours (${active[0].id}). Abandonnez-le ou terminez-le.`);
  }

  const missionId = opts.missionId != null ? Number(opts.missionId) : null;
  const missionRunId = opts.missionRunId || null;
  let templateId = opts.templateId || null;
  let difficulty = opts.difficulty || 1;

  // Hors run : mission → premier encounter. Dans un run, templateId est fourni explicitement.
  if (missionId && !templateId) {
    const rows = await query(
      'SELECT * FROM mission_definitions WHERE id = ? AND is_active = 1 LIMIT 1',
      [missionId],
    );
    const mission = rows[0];
    if (!mission) throw httpError(404, 'Mission introuvable.');
    const encounters = parseJson(mission.encounters_json, []);
    const first = encounters[0];
    if (!first?.templateId) throw httpError(400, 'Mission sans encounter.');
    templateId = first.templateId;
    difficulty = first.difficulty || 1;
  }

  if (turnPrototype) {
    templateId = 'ronin_bandit';
    difficulty = 1;
  }
  if (!templateId) templateId = 'ronin_bandit';

  const [effectCodes, playerIdentity, deckInfo] = await Promise.all([
    loadTalentEffectCodes(userId),
    loadPlayerIdentity(userId),
    resolveDeckCards(userId, opts.deckId),
  ]);
  const { total: stats } = await getComputedStats(userId, { deckPassives: deckInfo.deckPassives });

  const classified = classifyTalentEffects(effectCodes);
  const maxHp =
    opts.startingMaxHp != null
      ? Math.max(1, Number(opts.startingMaxHp))
      : BASE_MAX_HP + (Number(stats.maxHp) || 0);
  const startHp =
    opts.startingHp != null ? Math.max(1, Math.min(maxHp, Number(opts.startingHp))) : maxHp;

  const ruleset = turnPrototype || 'persistent';
  const entries = !turnPrototype
    ? deckInfo.cards.map(entry => ({
        ...entry,
        card: applySoloCardBalance(entry.card || entry),
      }))
    : deckInfo.cards;
  const runtimeCards = buildRuntimeDeck(
    entries,
    (card, n) => `${card.slug || card.id}-${n}-${randomUUID().slice(0, 8)}`,
  );
  const shuffled = shuffle(runtimeCards);

  const { createCombatAchTrack } = await import('./achievementService.js');
  const runCombatMods = opts.runCombatMods && typeof opts.runCombatMods === 'object'
    ? opts.runCombatMods
    : {};
  const bonusBlock = Math.max(0, Number(runCombatMods.block) || 0);
  const bonusChakra = Math.max(0, Number(runCombatMods.chakra) || 0);
  const bonusDamagePct = Math.max(0, Number(runCombatMods.damagePct) || 0);
  const bonusDraw = Math.max(0, Number(runCombatMods.draw) || 0);

  let player = {
    ...playerIdentity,
    hp: startHp,
    maxHp,
    block: Math.max(0, Number(stats.startingBlock) || 0) + bonusBlock,
    chakra: 5 + (Number(stats.maxChakra) || 0) + bonusChakra,
    maxChakra: 5 + (Number(stats.maxChakra) || 0) + bonusChakra,
    ruleset,
    voluntaryDiscards: 0,
    ...(turnPrototype && { turnPrototype }),
    statuses: bonusDamagePct
      ? [{ key: 'damage_pct', value: bonusDamagePct, duration: 99 }]
      : [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
    reserveCard: null,
    ally: null,
    taijutsuPlayedThisTurn: 0,
    ninjutsuPlayedThisTurn: 0,
    genjutsuPlayedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    previousCardStatType: null,
    elementsPlayedThisTurn: [],
    elementalFusionDrawnThisTurn: false,
    perfectTankUsed: false,
    _achTrack: createCombatAchTrack(),
  };

  const combatStart = applyTalentCombatStart(player, classified.applied);
  player = combatStart.player;

  const drawn = drawCards(player, DRAW_PER_TURN + bonusDraw);
  player = drawn.player;

  const talentStart = applyTalentStartOfTurn(player, classified.applied, { turn: 1 });
  player = talentStart.player;
  const heldStart = applyHeldTurnStart(player);
  player = heldStart.player;

  const generatedEnemy = generateEnemyFromTemplate(templateId, difficulty);
  const enemy = turnPrototype
    ? configurePrototypeEnemy(generatedEnemy)
    : queueSoloIntent(generatedEnemy);

  const id = randomUUID();
  const talentEffects = {
    codes: effectCodes,
    applied: classified.applied,
    stubbed: classified.stubbed,
  };

  const hasRewardsCol = await columnExists('combat_sessions', 'rewards_json');
  const hasRunCol = await columnExists('combat_sessions', 'mission_run_id');
  const suppressRewards = Boolean(opts.suppressRewards || missionRunId || turnPrototype);

  if (hasRewardsCol && hasRunCol) {
    await query(
      `INSERT INTO combat_sessions
        (id, user_id, mission_id, mission_run_id, deck_id, state, player_state_json, enemy_state_json,
         current_turn, current_phase, stats_snapshot_json, talent_effects_json, rewards_json)
       VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, 1, 'player_turn', ?, ?, NULL)`,
      [
        id,
        userId,
        missionId,
        missionRunId,
        deckInfo.deckId,
        JSON.stringify(player),
        JSON.stringify(enemy),
        JSON.stringify(stats),
        JSON.stringify(talentEffects),
      ],
    );
  } else if (hasRewardsCol) {
    await query(
      `INSERT INTO combat_sessions
        (id, user_id, mission_id, deck_id, state, player_state_json, enemy_state_json,
         current_turn, current_phase, stats_snapshot_json, talent_effects_json, rewards_json)
       VALUES (?, ?, ?, ?, 'in_progress', ?, ?, 1, 'player_turn', ?, ?, NULL)`,
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
  } else {
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
  }

  const startLogs = [
    { type: 'combat_start', templateId, practiceDeck: deckInfo.practice, missionRunId },
    ...combatStart.logs,
    { type: 'draw', count: drawn.drawn.length },
    ...talentStart.logs,
    ...heldStart.logs,
    { type: 'intent', intent: enemy.intent },
  ];
  await appendLog(id, 1, 'combat_start', {
    templateId,
    missionId,
    missionRunId,
    practiceDeck: deckInfo.practice,
  });

  const session = {
    id,
    userId,
    missionId,
    missionRunId,
    deckId: deckInfo.deckId,
    state: 'in_progress',
    currentTurn: 1,
    currentPhase: 'player_turn',
    player,
    enemy,
    stats,
    talentEffects,
    rewards: null,
    suppressRewards,
  };

  return publicState(session, startLogs);
}

/** Résumé du combat `in_progress` du joueur, s'il existe. */
export async function getActiveCombat(userId) {
  if (!userId || !(await tableExists('combat_sessions'))) return null;
  const hasRunCol = await columnExists('combat_sessions', 'mission_run_id');
  const rows = await query(
    hasRunCol
      ? `SELECT id, mission_run_id AS missionRunId
         FROM combat_sessions
         WHERE user_id = ? AND state = 'in_progress'
         ORDER BY updated_at DESC
         LIMIT 1`
      : `SELECT id
         FROM combat_sessions
         WHERE user_id = ? AND state = 'in_progress'
         ORDER BY updated_at DESC
         LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    missionRunId: row.missionRunId || null,
  };
}

export async function getCombatState(userId, combatId) {
  const session = await loadSession(combatId, userId);
  return publicState(session);
}

export async function playCard(userId, combatId, { instanceId, cardId } = {}) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, "Ce n'est pas votre tour.");

  const handId = instanceId || cardId;
  if (!handId) throw httpError(400, 'instanceId requis.');

  const card = (session.player.hand || []).find(c => c.instanceId === handId);
  if (!card) throw httpError(404, 'Carte absente de la main.');

  const deckElementCount = countDeckElements([
    ...(session.player.hand || []),
    ...(session.player.drawPile || []),
    ...(session.player.discardPile || []),
    ...(session.player.exhaustPile || []),
    ...(session.player.reserveCard ? [session.player.reserveCard] : []),
  ]);
  const statsWithBonus = session.stats;
  const talentMods = computeTalentDamageMods(session.talentEffects.applied, session.player, card, {
    enemy: session.enemy,
    deckElementCount,
    cardsPlayedThisTurn: session.player.cardsPlayedThisTurn || 0,
  });
  const played = applyCardPlay({
    player: session.player,
    enemy: session.enemy,
    card,
    stats: statsWithBonus,
    talentMods,
    talentCodes: session.talentEffects.applied,
  });

  let nextPlayer = played.player;
  let nextEnemy = played.enemy;
  const talentAfter = applyTalentAfterCardPlay(nextPlayer, card, session.talentEffects.applied, {
    enemy: nextEnemy,
  });
  nextPlayer = talentAfter.player;
  if (talentAfter.enemy) nextEnemy = talentAfter.enemy;

  if (talentAfter.extraDraw > 0) {
    const drawn = drawCards(nextPlayer, talentAfter.extraDraw);
    nextPlayer = drawn.player;
    talentAfter.logs.push({ type: 'draw', count: drawn.drawn.length, reason: 'elemental_fusion' });
  }

  const moved = moveCardFromHand(
    nextPlayer,
    handId,
    resolveCardPileDestination(card, session.talentEffects.applied),
  );

  session.player = moved.player;
  session.enemy = nextEnemy;
  syncSoloIntent(session);

  try {
    const { trackCardPlayForAchievements } = await import('./achievementService.js');
    session.player = trackCardPlayForAchievements(session.player, card);
  } catch {
    /* exploits optionnels */
  }

  // Quêtes BP : carte jouée + dégâts infligés
  try {
    const { onBattlePassAction } = await import('./battlePassQuestService.js');
    await onBattlePassAction(userId, 'play_card', 1);
    const damageDealt = [...played.logs, ...talentAfter.logs]
      .filter(l => l && l.type === 'damage' && l.source === 'player')
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    if (damageDealt > 0) {
      await onBattlePassAction(userId, 'deal_damage', damageDealt);
    }
  } catch {
    /* BP optionnel */
  }

  const outcome = checkVictory(session);
  let rewardLogs = [];
  if (outcome === 'victory') {
    const rewards = await maybeGrantVictoryRewards(session);
    if (rewards) rewardLogs = [{ type: 'rewards', rewards }];
    await maybeProgressBattlePassCombatWin(session);
  }
  if (outcome) {
    await maybeRecordCombatAchievements(session);
    await maybeNotifyRunCombatFinished(session);
  }

  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'play_card', {
    instanceId: handId,
    slug: card.slug,
    logs: [...played.logs, ...talentAfter.logs],
    outcome,
  });

  return publicState(session, [
    ...played.logs,
    ...talentAfter.logs,
    ...(outcome ? [{ type: outcome }] : []),
    ...rewardLogs,
  ]);
}

/**
 * Défausse 1 carte pour +1 Chakra (1×/tour).
 */
function useCardTurnAction(session, instanceId, reserve = false, forDraw = false) {
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, "Ce n'est pas votre tour.");
  const player = session.player;
  if (usesPersistentHand(player)) {
    if (reserve) throw httpError(400, 'La main est déjà conservée dans ce mode.');
    if ((player.voluntaryDiscards || 0) >= 2) throw httpError(400, 'Quota de défausses atteint.');
    if (!forDraw && player.discardedForChakra)
      throw httpError(400, 'Chakra de défausse déjà gagné.');
    if (!instanceId) throw httpError(400, 'instanceId requis.');
    const moved = moveCardFromHand(player, instanceId, 'discard');
    if (!moved.card) throw httpError(404, 'Carte absente de la main.');
    const next = { ...moved.player, voluntaryDiscards: (player.voluntaryDiscards || 0) + 1 };
    if (!forDraw)
      return { ...next, chakra: (Number(player.chakra) || 0) + 1, discardedForChakra: true };
    // Exclude the exchanged card from the immediate reshuffle.
    const drawn = drawCards({ ...next, discardPile: player.discardPile || [] }, 1);
    if (!drawn.drawn.length) throw httpError(400, 'Aucune autre carte à piocher.');
    return { ...drawn.player, discardPile: [...drawn.player.discardPile, moved.card] };
  }
  if (forDraw) throw httpError(400, 'Défausse pour pioche réservée à la main persistante.');
  if (session.player.discardedForChakra || session.player.reserveCard) {
    throw httpError(400, 'Défausse pour Chakra ou réserve déjà utilisée ce tour.');
  }
  if (!instanceId) throw httpError(400, 'instanceId requis.');

  const card = (session.player.hand || []).find(c => c.instanceId === instanceId);
  if (!card) throw httpError(404, 'Carte absente de la main.');
  if (reserve) {
    return {
      ...session.player,
      hand: session.player.hand.filter(c => c.instanceId !== instanceId),
      reserveCard: card,
      discardedForChakra: true,
    };
  }
  const moved = moveCardFromHand(session.player, instanceId, 'discard');
  return {
    ...moved.player,
    chakra: (Number(moved.player.chakra) || 0) + 1,
    discardedForChakra: true,
  };
}

export async function discardForChakra(userId, combatId, { instanceId } = {}) {
  const session = await loadSession(combatId, userId);
  session.player = useCardTurnAction(session, instanceId);

  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'discard_for_chakra', { instanceId });

  return publicState(session, [
    { type: 'discard_for_chakra', instanceId, chakra: session.player.chakra },
  ]);
}

export async function discardForDraw(userId, combatId, { instanceId } = {}) {
  const session = await loadSession(combatId, userId);
  session.player = useCardTurnAction(session, instanceId, false, true);
  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'discard_for_draw', { instanceId });
  return publicState(session, [
    { type: 'discard_for_draw', instanceId },
    { type: 'draw', count: 1 },
  ]);
}

export async function reserveCard(userId, combatId, { instanceId } = {}) {
  const session = await loadSession(combatId, userId);
  session.player = useCardTurnAction(session, instanceId, true);
  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'reserve_card', { instanceId });
  return publicState(session, [{ type: 'reserve_card', instanceId }]);
}

function chakraCarryover(player) {
  if (usesPersistentHand(player)) return 0;
  return Math.min(1, Math.max(0, Number(player.chakra) || 0));
}

function returnReservedCard(player) {
  if (!player.reserveCard) return { player, logs: [] };
  const card = player.reserveCard;
  const hand = player.hand || [];
  const kept = hand.slice(0, MAX_HAND_SIZE - 1);
  const overflow = hand.slice(MAX_HAND_SIZE - 1);
  return {
    player: {
      ...player,
      hand: [...kept, card],
      discardPile: [...(player.discardPile || []), ...overflow],
      reserveCard: null,
    },
    logs: [
      { type: 'reserve_return', instanceId: card.instanceId },
      ...overflow.map(c => ({ type: 'discard', instanceId: c.instanceId, reason: 'hand_full' })),
    ],
  };
}

export async function endTurn(userId, combatId) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, "Ce n'est pas votre tour.");

  let logs = [];

  const endTalent = applyTalentEndOfPlayerTurn(session.player, session.talentEffects.applied);
  session.player = endTalent.player;
  logs.push(...endTalent.logs);

  const playerEnd = resolveEndOfTurnStatuses(session.player, { persistBlock: true });
  session.player = playerEnd.entity;
  logs.push(...playerEnd.logs.map(l => ({ ...l, side: 'player' })));

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    return publicState(session, logs);
  }

  const carriedChakra = chakraCarryover(session.player);
  session.currentPhase = 'enemy_turn';

  {
    const enemyFade = applyBlockFade(session.enemy, { side: 'enemy' });
    session.enemy = enemyFade.entity;
    logs.push(...enemyFade.logs);
  }
  const enemyStart = resolveStartOfTurnStatuses(session.enemy);
  session.enemy = enemyStart.entity;
  logs.push(...enemyStart.logs.map(l => ({ ...l, side: 'enemy' })));

  {
    const phase = maybeAdvanceBossPhase(session.enemy, {
      announceIntent: e => getNextIntent(e),
    });
    if (phase.changed) {
      session.enemy = phase.enemy;
      logs.push(...phase.logs);
    }
  }

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    return publicState(session, logs);
  }

  syncSoloIntent(session);
  const solo = session.player.ruleset === 'persistent' && !session.player.turnPrototype;
  const enemyAct = executeEnemyIntent(session.enemy, session.player, Math.random, {
    talentCodes: session.talentEffects.applied,
    queuedIntent: solo ? session.enemy.queuedIntent : null,
  });
  session.enemy = solo ? queueSoloIntent(enemyAct.enemy) : enemyAct.enemy;
  session.player = enemyAct.player;
  logs.push(...enemyAct.logs);

  if (enemyAct.phantomStepDraw > 0) {
    const drawn = drawCards(session.player, enemyAct.phantomStepDraw);
    session.player = drawn.player;
    logs.push({ type: 'draw', count: drawn.drawn.length, reason: 'phantom_step' });
  }

  const tank = applyTalentAfterDamageTaken(session.player, session.talentEffects.applied, {
    enemy: session.enemy,
    damageDealt: enemyAct.damageTakenByPlayer || 0,
  });
  session.player = tank.player;
  if (tank.enemy) session.enemy = tank.enemy;
  logs.push(...tank.logs);

  try {
    const { trackDamageTakenForAchievements } = await import('./achievementService.js');
    session.player = trackDamageTakenForAchievements(
      session.player,
      enemyAct.damageTakenByPlayer || 0,
    );
  } catch {
    /* exploits optionnels */
  }

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  const enemyEnd = resolveEndOfTurnStatuses(session.enemy, { persistBlock: true });
  session.enemy = enemyEnd.entity;
  logs.push(...enemyEnd.logs.map(l => ({ ...l, side: 'enemy' })));

  {
    const phase = maybeAdvanceBossPhase(session.enemy, {
      announceIntent: e => getNextIntent(e),
    });
    if (phase.changed) {
      session.enemy = phase.enemy;
      logs.push(...phase.logs);
    }
  }

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  // Nouveau tour joueur
  session.currentTurn += 1;
  session.currentPhase = 'player_turn';

  {
    const playerFade = applyBlockFade(session.player, { side: 'player' });
    session.player = playerFade.entity;
    logs.push(...playerFade.logs);
  }

  const playerStart = resolveStartOfTurnStatuses(session.player);
  session.player = playerStart.entity;
  logs.push(...playerStart.logs.map(l => ({ ...l, side: 'player' })));

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  session.player = {
    ...playerStart.entity,
    chakra: (session.player.maxChakra ?? BASE_CHAKRA) + carriedChakra,
    discardedForChakra: false,
    elementalFusionDrawnThisTurn: false,
  };
  logs.push({ type: 'chakra_carryover', amount: carriedChakra, chakra: session.player.chakra });

  const talentStart = applyTalentStartOfTurn(session.player, session.talentEffects.applied, {
    turn: session.currentTurn,
  });
  session.player = talentStart.player;
  logs.push(...talentStart.logs);
  if (!usesPersistentHand(session.player)) {
    const heldStart = applyHeldTurnStart(session.player);
    session.player = heldStart.player;
    logs.push(...heldStart.logs);
  }

  // Allié attaque automatiquement
  const allyAct = resolveAllyAttack(session.player, session.enemy, {
    stats: session.stats,
    talentCodes: session.talentEffects?.applied,
  });
  session.player = allyAct.player;
  session.enemy = allyAct.enemy;
  logs.push(...allyAct.logs);

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

  syncSoloIntent(session);
  const refreshed = refreshHand(session.player);
  session.player = refreshed.player;
  logs.push(...refreshed.logs);
  if (usesPersistentHand(session.player)) {
    const heldStart = applyHeldTurnStart(session.player);
    session.player = heldStart.player;
    logs.push(...heldStart.logs);
  }

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
  }

  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'end_turn', { logs });

  return publicState(session, logs);
}

function refreshHand(player) {
  const hand = player.hand || [];
  const persistent = usesPersistentHand(player);
  const prepared = persistent
    ? { player: { ...player, voluntaryDiscards: 0 }, logs: [] }
    : returnReservedCard({
        ...player,
        hand: [],
        discardPile: [...(player.discardPile || []), ...hand],
      });
  const drawn = drawCards(
    prepared.player,
    persistent ? Math.max(0, DRAW_PER_TURN - hand.length) : DRAW_PER_TURN,
  );
  return {
    player: drawn.player,
    logs: [...prepared.logs, { type: 'draw', count: drawn.drawn.length }],
  };
}

export async function forfeit(userId, combatId) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat déjà terminé.');

  session.state = 'forfeited';
  session.currentPhase = 'game_over';
  await maybeRecordCombatAchievements(session);
  await maybeNotifyRunCombatFinished(session);
  await persistSession(session);
  await appendLog(combatId, session.currentTurn, 'forfeit', {});

  return publicState(session, [{ type: 'forfeited' }]);
}

/** Helpers exportés pour tests unitaires purs */
export const __test = {
  checkVictory,
  publicState,
  hydrateSession,
  useCardTurnAction,
  chakraCarryover,
  returnReservedCard,
  configurePrototypeEnemy,
  queueSoloIntent,
  syncSoloIntent,
  refreshHand,
};
