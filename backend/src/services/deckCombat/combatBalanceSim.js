/**
 * Harness de simulation combat PvE — pur (sans HTTP/DB).
 *
 * Rejoue la boucle playCard / endTurn du moteur avec une politique joueur
 * déterministe « greedy_damage_then_block » et un RNG seedé.
 *
 * @see docs/TESTING.md
 */
import { BASE_CHAKRA, BASE_MAX_HP, DRAW_PER_TURN } from './constants.js';
import {
  buildPracticeDeckEntries,
  buildRuntimeDeck,
  drawCards,
  moveCardFromHand,
  shuffle,
} from './deckRuntime.js';
import {
  applyCardPlay,
  computeCardBlock,
  computeCardDamage,
  effectiveCardCost,
  resolveAllyAttack,
} from './cardEffects.js';
import { resolveEndOfTurnStatuses, resolveStartOfTurnStatuses } from './statuses.js';
import { applyHeldTurnStart } from './heldEffects.js';
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
} from './talentEffects.js';
import {
  executeEnemyIntent,
  generateEnemyFromTemplate,
  getNextIntent,
  maybeAdvanceBossPhase,
} from '../combatAIService.js';
import { applyUpgradeBonuses } from '../cardService.js';
import { createEmptyStats, rankForLevel } from '../playerCharacterService.js';
import { BALANCE_PROFILES, PLAYER_POLICY } from '../../config/combatBalanceConfig.js';

const MAX_VOLUNTARY_DISCARDS = 2;

/** Mulberry32 — RNG déterministe [0,1). */
export function createSeededRng(seed) {
  let t = Number(seed) >>> 0 || 1;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeStats(partial) {
  return { ...createEmptyStats(), ...(partial || {}) };
}

/**
 * Représentation sans DB des améliorations de collection. Les valeurs sont
 * appliquées par le même `applyUpgradeBonuses` que les cartes persistées.
 */
function balanceUpgradeBonuses(card) {
  if ((Number(card.damage) || 0) > 0) {
    return { level_1: { damage: 1 }, level_2: { damage: 2 } };
  }
  if ((Number(card.block) || 0) > 0) {
    return { level_1: { block: 1 }, level_2: { block: 2 } };
  }
  if ((Number(card.heal) || 0) > 0) {
    return { level_1: { heal: 1 }, level_2: { heal: 2 } };
  }
  return {};
}

function applyBalanceDeckUpgrade(card, upgradeLevel) {
  const computed = applyUpgradeBonuses(
    {
      slug: card.slug,
      type: card.type,
      stat_type: card.statType,
      stat_type_secondary: card.statTypeSecondary,
      crit_chance: card.critChance,
      base_cost: card.cost,
      base_damage: card.damage,
      base_block: card.block,
      base_heal: card.heal,
      passive_bonus_json: card.passiveBonus || {},
      upgradeBonuses: balanceUpgradeBonuses(card),
    },
    upgradeLevel,
  );
  // Ne pas écraser le reste de la carte avec un objet « computed » incomplet.
  return {
    ...card,
    cost: computed.cost,
    damage: computed.damage,
    block: computed.block,
    heal: computed.heal,
    critChance: computed.critChance || 0,
    statTypeSecondary: computed.statTypeSecondary ?? card.statTypeSecondary ?? null,
    passiveBonus: computed.passiveBonus,
    upgradeLevel,
  };
}

function buildProfileDeckEntries(profile) {
  if (profile.deck !== 'practice') {
    throw new Error(`Deck de balance inconnu: ${profile.deck}`);
  }
  return buildPracticeDeckEntries().map(entry => ({
    ...entry,
    card: applyBalanceDeckUpgrade(
      entry.card,
      profile.deckUpgradeSlugs?.includes(entry.card.slug) ? profile.deckUpgradeLevel || 0 : 0,
    ),
  }));
}

function checkOutcome(session) {
  if ((session.enemy.hp || 0) <= 0) return 'victory';
  if ((session.player.hp || 0) <= 0) return 'defeat';
  return null;
}

function effectiveCost(card, talentMods, player = {}) {
  return effectiveCardCost(card, talentMods, player).cost;
}

function estimateIncomingDamage(enemy) {
  const intent = enemy?.intent;
  if (!intent || intent.type !== 'attack') return 0;
  return Number(intent.displayDamage ?? intent.damage) || 0;
}

/**
 * Score heuristique d'une carte pour la politique greedy.
 * Plus haut = prioritaire.
 */
export function scoreCardForGreedy(card, session) {
  const { player, enemy, stats, talentEffects } = session;
  const talentMods = computeTalentDamageMods(talentEffects.applied, player, card);
  const cost = effectiveCost(card, talentMods, player);
  if (cost > (Number(player.chakra) || 0)) return -Infinity;

  const incoming = estimateIncomingDamage(enemy);

  if (card.type === 'attack' || (Number(card.damage) || 0) > 0) {
    const dmg = computeCardDamage(card, {
      stats,
      playerStatuses: player.statuses || [],
      enemyStatuses: enemy.statuses || [],
      enemyPosture: enemy.posture,
      enemyAffinity: enemy.elementAffinity,
      talentMods,
      player,
      // Score sans crit : rng haut → rollCrit ne proc pas
      rng: () => 0.999,
    });
    const total = dmg.denied ? 0 : dmg.total;
    const killBonus = total >= (Number(enemy.hp) || 0) + (Number(enemy.block) || 0) ? 10_000 : 0;
    return killBonus + total * 100 + (3 - cost) * 2;
  }

  if ((Number(card.block) || 0) > 0 || card.type === 'defense') {
    const block = computeCardBlock(card, stats, player.statuses || []);
    const threatWeight = incoming > (Number(player.block) || 0) ? 80 : 25;
    return block * threatWeight + (3 - cost);
  }

  if ((Number(card.heal) || 0) > 0) {
    const missing = (Number(player.maxHp) || 0) - (Number(player.hp) || 0);
    if (missing <= 0) return -5;
    return Math.min(missing, Number(card.heal) || 0) * 40;
  }

  if (card.type === 'summon' || card.summon) {
    if (player.ally && (player.ally.hp || 0) > 0) return -20;
    return 55 + (incoming > 8 ? 20 : 0);
  }

  if ((card.effects || []).some(e => e.type === 'draw')) return 15;
  return 1;
}

function weakestCard(hand) {
  let discardTarget = hand[0];
  let worst = Infinity;
  for (const card of hand) {
    const intrinsic =
      (Number(card.damage) || 0) * 10 +
      (Number(card.block) || 0) * 3 +
      (Number(card.heal) || 0) * 2;
    if (intrinsic < worst) {
      worst = intrinsic;
      discardTarget = card;
    }
  }

  return discardTarget;
}

function tryDiscardForBetterPlay(session) {
  const { player, persistentHand } = session;
  const used = player.voluntaryDiscards || 0;
  if (player.discardedForChakra || (persistentHand && used >= MAX_VOLUNTARY_DISCARDS)) {
    return null;
  }
  const discardTarget = weakestCard(player.hand || []);
  if (!discardTarget) return null;

  const moved = moveCardFromHand(player, discardTarget.instanceId, 'discard');
  const nextSession = {
    ...session,
    player: {
      ...moved.player,
      chakra: (Number(moved.player.chakra) || 0) + 1,
      discardedForChakra: true,
      ...(persistentHand && { voluntaryDiscards: used + 1 }),
    },
  };

  let bestScore = -Infinity;
  for (const card of nextSession.player.hand || []) {
    bestScore = Math.max(bestScore, scoreCardForGreedy(card, nextSession));
  }
  if (bestScore < 50) return null;

  return {
    session: nextSession,
    logs: [{ type: 'discard_for_chakra', instanceId: discardTarget.instanceId }],
  };
}

function tryDiscardForDraw(session, rng) {
  const { player } = session;
  const used = player.voluntaryDiscards || 0;
  if (!session.persistentHand || used >= MAX_VOLUNTARY_DISCARDS) return null;
  const discardTarget = weakestCard(player.hand || []);
  if (!discardTarget) return null;

  const moved = moveCardFromHand(player, discardTarget.instanceId, 'discard');
  // N'inclut pas la carte échangée dans le remélange de cette pioche.
  const drawn = drawCards({ ...moved.player, discardPile: player.discardPile }, 1, rng);
  if (!drawn.drawn.length) return null;

  return {
    session: {
      ...session,
      player: {
        ...drawn.player,
        discardPile: [...drawn.player.discardPile, moved.card],
        voluntaryDiscards: used + 1,
      },
    },
    logs: [{ type: 'discard_for_draw', instanceId: discardTarget.instanceId }],
  };
}

function simPlayCard(session, instanceId, rng) {
  const logs = [];
  const card = (session.player.hand || []).find(c => c.instanceId === instanceId);
  if (!card) return { session, logs };

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
    rng,
  });

  let nextPlayer = played.player;
  let nextEnemy = played.enemy;
  const talentAfter = applyTalentAfterCardPlay(nextPlayer, card, session.talentEffects.applied, {
    enemy: nextEnemy,
  });
  nextPlayer = talentAfter.player;
  if (talentAfter.enemy) nextEnemy = talentAfter.enemy;

  if (talentAfter.extraDraw > 0) {
    const drawn = drawCards(nextPlayer, talentAfter.extraDraw, rng);
    nextPlayer = drawn.player;
  }

  const moved = moveCardFromHand(
    nextPlayer,
    instanceId,
    resolveCardPileDestination(card, session.talentEffects.applied),
  );

  const next = {
    ...session,
    player: moved.player,
    enemy: nextEnemy,
  };
  const outcome = checkOutcome(next);
  if (outcome) {
    next.state = outcome;
    next.currentPhase = 'game_over';
  }

  logs.push(...played.logs, ...talentAfter.logs);
  return {
    session: next,
    logs,
    chakraPaid: effectiveCardCost(card, talentMods, session.player).cost,
  };
}

/**
 * Joue un tour joueur selon greedy_damage_then_block.
 */
export function playGreedyPlayerTurn(session, rng, onCardPlayed) {
  const logs = [];
  let s = session;
  let safety = 0;

  while (safety < 20 && s.state === 'in_progress' && s.currentPhase === 'player_turn') {
    safety += 1;
    const hand = s.player.hand || [];
    if (!hand.length) break;

    let best = null;
    let bestScore = -Infinity;
    for (const card of hand) {
      const score = scoreCardForGreedy(card, s);
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }

    if (!best || bestScore === -Infinity) {
      const action = tryDiscardForBetterPlay(s) || tryDiscardForDraw(s, rng);
      if (!action) break;
      s = action.session;
      logs.push(...action.logs);
      continue;
    }

    const played = simPlayCard(s, best.instanceId, rng);
    onCardPlayed?.({
      card: best,
      chakraPaid: played.chakraPaid,
      enemyHpLost: Math.max(0, s.enemy.hp - Math.max(0, played.session.enemy.hp)),
    });
    s = played.session;
    logs.push(...played.logs);
    if (s.state !== 'in_progress') break;
  }

  return { session: s, logs };
}

/**
 * Résout fin de tour joueur → tour ennemi → nouveau tour joueur (miroir endTurn).
 */
export function simEndTurn(session, rng, maxTurns = Infinity) {
  const logs = [];
  const s = { ...session, player: { ...session.player }, enemy: { ...session.enemy } };

  const endTalent = applyTalentEndOfPlayerTurn(s.player, s.talentEffects.applied);
  s.player = endTalent.player;

  const hpBeforePlayerEnd = Number(s.player.hp) || 0;
  const playerEnd = resolveEndOfTurnStatuses(s.player, { persistBlock: true });
  s.player = playerEnd.entity;
  s.damageTakenTotal =
    (Number(s.damageTakenTotal) || 0) + Math.max(0, hpBeforePlayerEnd - s.player.hp);

  let outcome = checkOutcome(s);
  if (outcome) {
    s.state = outcome;
    s.currentPhase = 'game_over';
    return { session: s, logs };
  }

  s.currentPhase = 'enemy_turn';

  if ((s.enemy.block || 0) > 0) {
    s.enemy = { ...s.enemy, block: 0 };
  }
  const enemyStart = resolveStartOfTurnStatuses(s.enemy);
  s.enemy = enemyStart.entity;

  {
    const phase = maybeAdvanceBossPhase(s.enemy, {
      announceIntent: e => getNextIntent(e, 0, rng),
    });
    if (phase.changed) s.enemy = phase.enemy;
  }

  outcome = checkOutcome(s);
  if (outcome) {
    s.state = outcome;
    s.currentPhase = 'game_over';
    return { session: s, logs };
  }

  const hpBefore = Number(s.player.hp) || 0;
  const enemyAct = executeEnemyIntent(s.enemy, s.player, rng, {
    talentCodes: s.talentEffects.applied,
  });
  s.enemy = enemyAct.enemy;
  s.player = enemyAct.player;
  logs.push(...enemyAct.logs);

  if (enemyAct.phantomStepDraw > 0) {
    const drawn = drawCards(s.player, enemyAct.phantomStepDraw, rng);
    s.player = drawn.player;
  }

  const damageTaken = Math.max(0, hpBefore - (Number(s.player.hp) || 0));
  s.damageTakenTotal = (Number(s.damageTakenTotal) || 0) + damageTaken;

  const tank = applyTalentAfterDamageTaken(s.player, s.talentEffects.applied, {
    enemy: s.enemy,
    damageDealt: enemyAct.damageTakenByPlayer || 0,
  });
  s.player = tank.player;
  if (tank.enemy) s.enemy = tank.enemy;

  outcome = checkOutcome(s);
  if (outcome) {
    s.state = outcome;
    s.currentPhase = 'game_over';
    return { session: s, logs };
  }

  const enemyEnd = resolveEndOfTurnStatuses(s.enemy, { persistBlock: true });
  s.enemy = enemyEnd.entity;

  {
    const phase = maybeAdvanceBossPhase(s.enemy, {
      announceIntent: e => getNextIntent(e, 0, rng),
    });
    if (phase.changed) s.enemy = phase.enemy;
  }

  outcome = checkOutcome(s);
  if (outcome) {
    s.state = outcome;
    s.currentPhase = 'game_over';
    return { session: s, logs };
  }

  if (s.currentTurn >= maxTurns) {
    s.state = 'defeat';
    s.currentPhase = 'game_over';
    s.timeout = true;
    return { session: s, logs };
  }

  s.currentTurn += 1;
  s.currentPhase = 'player_turn';

  if ((s.player.block || 0) > 0) {
    s.player = { ...s.player, block: 0 };
  }

  const hpBeforePlayerStart = Number(s.player.hp) || 0;
  const playerStart = resolveStartOfTurnStatuses(s.player);
  const poison = playerStart.logs.find(log => log.type === 'poison');
  if (poison) {
    s.damageTakenTotal =
      (Number(s.damageTakenTotal) || 0) + Math.max(0, hpBeforePlayerStart - poison.hp);
  }
  s.player = {
    ...playerStart.entity,
    chakra: s.player.maxChakra ?? BASE_CHAKRA,
    discardedForChakra: false,
    ...(s.persistentHand && { voluntaryDiscards: 0 }),
    elementalFusionDrawnThisTurn: false,
  };

  const talentStart = applyTalentStartOfTurn(s.player, s.talentEffects.applied, {
    turn: s.currentTurn,
  });
  s.player = s.persistentHand ? talentStart.player : applyHeldTurnStart(talentStart.player).player;

  const allyAct = resolveAllyAttack(s.player, s.enemy);
  s.player = allyAct.player;
  s.enemy = allyAct.enemy;

  outcome = checkOutcome(s);
  if (outcome) {
    s.state = outcome;
    s.currentPhase = 'game_over';
    return { session: s, logs };
  }

  const leftover = s.player.hand || [];
  if (s.persistentHand) {
    const missing = Math.max(0, DRAW_PER_TURN - leftover.length);
    const drawn = drawCards(s.player, missing, rng);
    s.player = applyHeldTurnStart(drawn.player).player;
    return { session: s, logs };
  }

  s.player = {
    ...s.player,
    hand: [],
    discardPile: [...(s.player.discardPile || []), ...leftover],
  };
  const drawn = drawCards(s.player, DRAW_PER_TURN, rng);
  s.player = drawn.player;

  return { session: s, logs };
}

/**
 * Initialise une session de combat pure, avec main persistante en opt-in.
 */
export function createSimSession({
  profileId = 'beginner',
  templateId = 'ronin_bandit',
  difficulty = 1,
  seed = 1,
  deckEntries = null,
  profileOverride = null,
  persistentHand = false,
} = {}) {
  const profile = profileOverride || BALANCE_PROFILES[profileId];
  if (!profile) throw new Error(`Profil inconnu: ${profileId}`);
  if (profileOverride && (profile.id !== profileId || !deckEntries)) {
    throw new Error('Un profil externe doit correspondre à profileId et fournir son deck.');
  }

  const rng = createSeededRng(seed);
  const stats = mergeStats(profile.stats);
  const classified = classifyTalentEffects([...profile.talentCodes]);
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);

  const entries = deckEntries || buildProfileDeckEntries(profile);
  const runtimeCards = buildRuntimeDeck(
    entries,
    (card, n) => `${card.slug || card.id}-${n}-s${seed}`,
  );
  const shuffled = shuffle(runtimeCards, rng);

  let player = {
    name: profile.label,
    hp: maxHp,
    maxHp,
    block: Math.max(0, Number(stats.startingBlock) || 0),
    chakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    maxChakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    statuses: [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
    ...(persistentHand && { voluntaryDiscards: 0 }),
    ally: null,
    taijutsuPlayedThisTurn: 0,
    ninjutsuPlayedThisTurn: 0,
    genjutsuPlayedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    elementsPlayedThisTurn: [],
    elementalFusionDrawnThisTurn: false,
    perfectTankUsed: false,
  };

  const combatStart = applyTalentCombatStart(player, classified.applied);
  player = combatStart.player;

  const drawn = drawCards(player, DRAW_PER_TURN, rng);
  player = drawn.player;

  const talentStart = applyTalentStartOfTurn(player, classified.applied, { turn: 1 });
  player = applyHeldTurnStart(talentStart.player).player;

  const enemy = generateEnemyFromTemplate(templateId, difficulty);
  // Intent seedé (IA weighted) pour reproductibilité
  enemy.intent = getNextIntent(enemy, 1, rng);

  return {
    state: 'in_progress',
    currentTurn: 1,
    currentPhase: 'player_turn',
    player,
    enemy,
    stats,
    talentEffects: {
      codes: [...profile.talentCodes],
      applied: classified.applied,
      stubbed: classified.stubbed,
    },
    damageTakenTotal: 0,
    profileId,
    profileLevel: profile.level,
    profileRank: rankForLevel(profile.level),
    deck: profile.deck,
    deckUpgradeLevel: profile.deckUpgradeLevel || 0,
    templateId,
    seed,
    persistentHand,
    policy: PLAYER_POLICY.id,
    rng,
  };
}

/**
 * Simule un combat complet jusqu'à victoire / défaite / cap de tours.
 */
export function simulateCombat({
  profileId,
  templateId,
  difficulty = 1,
  seed,
  maxTurns = 40,
  profileOverride = null,
  deckEntries = null,
} = {}) {
  let session = createSimSession({
    profileId,
    templateId,
    difficulty,
    seed,
    profileOverride,
    deckEntries,
  });
  const rng = session.rng;

  while (session.state === 'in_progress') {
    const turn = playGreedyPlayerTurn(session, rng);
    session = turn.session;
    if (session.state !== 'in_progress') break;

    const ended = simEndTurn(session, rng, maxTurns);
    session = ended.session;
  }

  const won = session.state === 'victory';
  return {
    outcome: session.state,
    won,
    turns: session.currentTurn,
    timeout: Boolean(session.timeout),
    hpRemaining: won ? Number(session.player.hp) || 0 : 0,
    maxHp: Number(session.player.maxHp) || 0,
    damageTaken: Number(session.damageTakenTotal) || 0,
    profileId,
    profileLevel: session.profileLevel,
    profileRank: session.profileRank,
    deck: session.deck,
    deckUpgradeLevel: session.deckUpgradeLevel,
    templateId,
    seed,
  };
}

/**
 * Agrège N combats seedés pour une cellule (profil × encounter).
 */
export function aggregateFights({
  profileId,
  templateId,
  difficulty = 1,
  baseSeed,
  count,
  maxTurns = 40,
  profileOverride = null,
  deckEntries = null,
}) {
  const fights = [];
  for (let i = 0; i < count; i += 1) {
    fights.push(
      simulateCombat({
        profileId,
        templateId,
        difficulty,
        seed: (baseSeed + i * 9973) >>> 0,
        maxTurns,
        profileOverride,
        deckEntries,
      }),
    );
  }

  const wins = fights.filter(f => f.won);
  const n = fights.length || 1;
  const avg = (arr, key) =>
    arr.length ? arr.reduce((s, x) => s + (Number(x[key]) || 0), 0) / arr.length : 0;

  return {
    profileId,
    templateId,
    difficulty,
    fights: n,
    wins: wins.length,
    winRate: wins.length / n,
    avgTurns: avg(fights, 'turns'),
    avgTurnsOnWin: avg(wins, 'turns'),
    avgTurnsOnLoss: avg(
      fights.filter(f => !f.won),
      'turns',
    ),
    avgHpRemainingOnWin: wins.length ? avg(wins, 'hpRemaining') : null,
    avgDamageTaken: avg(fights, 'damageTaken'),
    timeouts: fights.filter(f => f.timeout).length,
  };
}

export { PLAYER_POLICY };
