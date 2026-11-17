/**
 * Moteur de combat deck-building (Phase 4+).
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
import { BASE_CHAKRA, BASE_MAX_HP, DRAW_PER_TURN } from './deckCombat/constants.js';
import {
  buildRuntimeDeck,
  drawCards,
  moveCardFromHand,
  shuffle,
} from './deckCombat/deckRuntime.js';
import { applyCardPlay, resolveAllyAttack } from './deckCombat/cardEffects.js';
import { resolveEndOfTurnStatuses, resolveStartOfTurnStatuses } from './deckCombat/statuses.js';
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
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    missionRunId: row.mission_run_id || null,
    deckId: row.deck_id,
    state: row.state,
    currentTurn: row.current_turn,
    currentPhase: row.current_phase,
    player: parseJson(row.player_state_json, {}),
    enemy: parseJson(row.enemy_state_json, {}),
    stats: parseJson(row.stats_snapshot_json, createEmptyStats()),
    talentEffects: parseJson(row.talent_effects_json, { codes: [], applied: [], stubbed: [] }),
    rewards: parseJson(row.rewards_json, null),
    suppressRewards: Boolean(row.mission_run_id),
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
    player: sanitizePlayer(session.player),
    enemy: sanitizeEnemy(session.enemy),
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
    ally: player.ally
      ? {
          nameFr: player.ally.nameFr,
          nameEn: player.ally.nameEn,
          hp: player.ally.hp,
          maxHp: player.ally.maxHp,
          attack: player.ally.attack,
          taunt: Boolean(player.ally.taunt),
        }
      : null,
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
    barrier: enemy.barrier || 0,
    statuses: enemy.statuses || [],
    posture: enemy.posture,
    elementAffinity: enemy.elementAffinity,
    intent: enemy.intent,
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
  if (session.state !== 'victory' || !session.userId) return;
  if (session.bpCombatWinCounted) return;
  session.bpCombatWinCounted = true;
  try {
    const { onBattlePassAction } = await import('./battlePassQuestService.js');
    await onBattlePassAction(session.userId, 'combat_win', 1);
  } catch {
    /* BP optionnel */
  }
}

async function maybeRecordCombatAchievements(session) {
  if (!session.userId || session.achievementsRecorded) return;
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
  return { deckId: deck.id, cards: deck.cards, practice: false };
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

async function loadPlayerName(userId) {
  try {
    const rows = await query('SELECT name FROM player_character WHERE user_id = ? LIMIT 1', [
      userId,
    ]);
    return rows[0]?.name || 'Shinobi';
  } catch {
    return 'Shinobi';
  }
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

  if (!templateId) templateId = 'ronin_bandit';

  const [{ total: stats }, effectCodes, playerName, deckInfo] = await Promise.all([
    getComputedStats(userId),
    loadTalentEffectCodes(userId),
    loadPlayerName(userId),
    resolveDeckCards(userId, opts.deckId),
  ]);

  const classified = classifyTalentEffects(effectCodes);
  const maxHp =
    opts.startingMaxHp != null
      ? Math.max(1, Number(opts.startingMaxHp))
      : BASE_MAX_HP + (Number(stats.maxHp) || 0);
  const startHp =
    opts.startingHp != null ? Math.max(1, Math.min(maxHp, Number(opts.startingHp))) : maxHp;

  const runtimeCards = buildRuntimeDeck(
    deckInfo.cards,
    (card, n) => `${card.slug || card.id}-${n}-${randomUUID().slice(0, 8)}`,
  );
  const shuffled = shuffle(runtimeCards);

  const { createCombatAchTrack } = await import('./achievementService.js');
  let player = {
    name: playerName,
    hp: startHp,
    maxHp,
    block: 0,
    chakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    maxChakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    statuses: [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
    ally: null,
    taijutsuPlayedThisTurn: 0,
    ninjutsuPlayedThisTurn: 0,
    genjutsuPlayedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    elementsPlayedThisTurn: [],
    elementalFusionDrawnThisTurn: false,
    perfectTankUsed: false,
    _achTrack: createCombatAchTrack(),
  };

  const combatStart = applyTalentCombatStart(player, classified.applied);
  player = combatStart.player;

  const drawn = drawCards(player, DRAW_PER_TURN);
  player = drawn.player;

  const talentStart = applyTalentStartOfTurn(player, classified.applied, { turn: 1 });
  player = talentStart.player;

  const enemy = generateEnemyFromTemplate(templateId, difficulty);

  const id = randomUUID();
  const talentEffects = {
    codes: effectCodes,
    applied: classified.applied,
    stubbed: classified.stubbed,
  };

  const hasRewardsCol = await columnExists('combat_sessions', 'rewards_json');
  const hasRunCol = await columnExists('combat_sessions', 'mission_run_id');
  const suppressRewards = Boolean(opts.suppressRewards || missionRunId);

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
export async function discardForChakra(userId, combatId, { instanceId } = {}) {
  const session = await loadSession(combatId, userId);
  if (session.state !== 'in_progress') throw httpError(400, 'Combat terminé.');
  if (session.currentPhase !== 'player_turn') throw httpError(400, "Ce n'est pas votre tour.");
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

  session.currentPhase = 'enemy_turn';

  if ((session.enemy.block || 0) > 0) {
    logs.push({ type: 'block_fade', side: 'enemy', value: session.enemy.block });
    session.enemy = { ...session.enemy, block: 0 };
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

  const enemyAct = executeEnemyIntent(session.enemy, session.player, Math.random, {
    talentCodes: session.talentEffects.applied,
  });
  session.enemy = enemyAct.enemy;
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

  if ((session.player.block || 0) > 0) {
    logs.push({ type: 'block_fade', side: 'player', value: session.player.block });
    session.player = { ...session.player, block: 0 };
  }

  const playerStart = resolveStartOfTurnStatuses(session.player);
  session.player = {
    ...playerStart.entity,
    chakra: session.player.maxChakra ?? BASE_CHAKRA,
    discardedForChakra: false,
    elementalFusionDrawnThisTurn: false,
  };
  logs.push(...playerStart.logs.map(l => ({ ...l, side: 'player' })));

  const talentStart = applyTalentStartOfTurn(session.player, session.talentEffects.applied, {
    turn: session.currentTurn,
  });
  session.player = talentStart.player;
  logs.push(...talentStart.logs);

  // Allié attaque automatiquement
  const allyAct = resolveAllyAttack(session.player, session.enemy);
  session.player = allyAct.player;
  session.enemy = allyAct.enemy;
  logs.push(...allyAct.logs);

  if (checkVictory(session)) {
    logs = await finalizeCombatOutcome(session, logs);
    await persistSession(session);
    await appendLog(combatId, session.currentTurn, 'end_turn', { logs, outcome: session.state });
    return publicState(session, logs);
  }

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
    logs = await finalizeCombatOutcome(session, logs);
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
};
