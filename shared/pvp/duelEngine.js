/**
 * Moteur de duel PvP 1v1 — autorité Host (client).
 *
 * Le serveur NE recalcule PAS chaque carte : il bootstrap l'état initial,
 * relaie les actions Guest→Host et l'état Host→Guest, puis valide un résumé
 * en fin de match (checksum / trust-host).
 *
 * Formules alignées sur le combat PvE (scale damage/block/heal).
 */

import { createSeededRng } from './seededRng.js';
import { duelChecksum } from './checksum.js';
import { applyCardPlay } from '../../backend/src/services/deckCombat/cardEffects.js';
import {
  applyHeldTurnStart,
  heldEffectMods,
} from '../../backend/src/services/deckCombat/heldEffects.js';
import {
  resolveEndOfTurnStatuses,
  resolveStartOfTurnStatuses,
} from '../../backend/src/services/deckCombat/statuses.js';
import { drawCards, moveCardFromHand } from '../../backend/src/services/deckCombat/deckRuntime.js';
import {
  applyDamageThroughBlock,
  getStatusValue,
} from '../../backend/src/services/deckCombat/formulas.js';
import {
  applyTalentAfterCardPlay,
  applyTalentAfterDamageTaken,
  applyTalentCombatStart,
  applyTalentEndOfPlayerTurn,
  applyTalentIncomingAttackMods,
  applyTalentStartOfTurn,
  applyIncomingTalentCap,
  computeTalentDamageMods,
  countDeckElements,
  resolveCardPileDestination,
} from '../../backend/src/services/deckCombat/talentEffects.js';

export const BASE_CHAKRA = 3;
export const DRAW_PER_TURN = 5;
export const MAX_HAND_SIZE = 10;
export const BASE_MAX_HP = 100;

/**
 * @param {object} bootstrap — snapshot serveur (fighters, seed, matchId, …)
 * @returns {object} état de duel mutable
 */
export function createDuelFromBootstrap(bootstrap) {
  if (!bootstrap?.fighters?.host || !bootstrap?.fighters?.guest) {
    throw new Error('Bootstrap PvP invalide : fighters host/guest requis.');
  }

  const rng = createSeededRng(bootstrap.seed || bootstrap.matchId || 'pvp');

  let host = hydrateFighter(bootstrap.fighters.host, 'host', rng);
  let guest = hydrateFighter(bootstrap.fighters.guest, 'guest', rng);
  const startLogs = [{ type: 'duel_start', turn: 1 }];

  for (const [seat, fighter] of [
    ['host', host],
    ['guest', guest],
  ]) {
    const combatStart = applyTalentCombatStart(fighter, fighter.talentCodes);
    const turnStart = applyTalentStartOfTurn(combatStart.player, fighter.talentCodes, { turn: 1 });
    const heldStart =
      seat === 'host'
        ? applyHeldTurnStart(turnStart.player)
        : { player: turnStart.player, logs: [] };
    const initializedFighter = { ...heldStart.player, turnsPlayed: 1 };
    if (seat === 'host') host = initializedFighter;
    else guest = initializedFighter;
    startLogs.push(
      ...combatStart.logs.map(log => ({ ...log, seat })),
      ...turnStart.logs.map(log => ({ ...log, seat })),
      ...heldStart.logs.map(log => ({ ...log, seat }))
    );
  }

  // Le Host commence (siège host).
  return {
    matchId: bootstrap.matchId,
    seed: bootstrap.seed,
    status: 'in_progress',
    phase: 'turn',
    turn: 1,
    activeSeat: 'host',
    winnerSeat: null,
    forfeitSeat: null,
    fighters: { host, guest },
    logs: startLogs,
    antiCheatMode: bootstrap.antiCheatMode || 'trust_host',
  };
}

/**
 * Applique une action Host-authoritative.
 * @param {object} state
 * @param {{ kind: string, seat: 'host'|'guest', instanceId?: string }} action
 * @param {{ seed?: string }} [opts]
 * @returns {{ state: object, logs: object[], error?: string }}
 */
export function applyDuelAction(state, action, opts = {}) {
  if (!state || state.status !== 'in_progress') {
    return { state, logs: [], error: 'Duel terminé ou invalide.' };
  }
  if (!action?.kind || !action?.seat) {
    return { state, logs: [], error: 'Action invalide.' };
  }
  if (action.seat !== state.activeSeat && action.kind !== 'forfeit') {
    return { state, logs: [], error: 'Ce n’est pas le tour de ce siège.' };
  }

  const rng = createSeededRng(
    `${opts.seed || state.seed || state.matchId}-${state.turn}-${action.kind}-${action.instanceId || ''}`
  );

  let next = cloneState(state);
  const logs = [];

  try {
    switch (action.kind) {
      case 'play_card': {
        const result = playCard(next, action.seat, action.instanceId, rng);
        next = result.state;
        logs.push(...result.logs);
        break;
      }
      case 'discard_chakra': {
        const result = discardForChakra(next, action.seat, action.instanceId);
        next = result.state;
        logs.push(...result.logs);
        break;
      }
      case 'reserve_card': {
        const result = reserveCard(next, action.seat, action.instanceId);
        next = result.state;
        logs.push(...result.logs);
        break;
      }
      case 'end_turn': {
        const result = endTurn(next, action.seat, rng);
        next = result.state;
        logs.push(...result.logs);
        break;
      }
      case 'forfeit': {
        const result = forfeit(next, action.seat);
        next = result.state;
        logs.push(...result.logs);
        break;
      }
      default:
        return { state, logs: [], error: `Action inconnue : ${action.kind}` };
    }
  } catch (err) {
    return { state, logs: [], error: err.message || 'Erreur moteur duel.' };
  }

  next.logs = [...(next.logs || []), ...logs].slice(-80);
  return { state: next, logs };
}

/**
 * Vue publique pour un siège (masque la main adverse).
 * @param {object} state
 * @param {'host'|'guest'} viewerSeat
 */
export function publicDuelState(state, viewerSeat) {
  if (!state) return null;
  const { checksum, summary } = duelChecksum(state);

  const sanitize = (fighter, seat) => {
    if (!fighter) return null;
    const isSelf = seat === viewerSeat;
    return {
      seat: fighter.seat,
      userId: fighter.userId,
      name: fighter.name,
      level: fighter.level,
      hp: fighter.hp,
      maxHp: fighter.maxHp,
      block: fighter.block || 0,
      chakra: fighter.chakra,
      maxChakra: fighter.maxChakra ?? BASE_CHAKRA,
      statuses: fighter.statuses || [],
      ally: fighter.ally || null,
      hand: isSelf ? fighter.hand || [] : undefined,
      handCount: (fighter.hand || []).length,
      drawCount: (fighter.drawPile || []).length,
      discardCount: (fighter.discardPile || []).length,
      exhaustCount: (fighter.exhaustPile || []).length,
      discardedForChakra: Boolean(fighter.discardedForChakra),
      reservedThisTurn: Boolean(fighter.reservedThisTurn),
      reservedCard: isSelf ? fighter.reservedCard || null : undefined,
      hasReservedCard: Boolean(fighter.reservedCard),
      chakraCarry: fighter.chakraCarry || 0,
      nextCardCostReduction: isSelf ? fighter.nextCardCostReduction || 0 : undefined,
      stats: isSelf ? fighter.stats : undefined,
    };
  };

  return {
    matchId: state.matchId,
    status: state.status,
    phase: state.phase,
    turn: state.turn,
    activeSeat: state.activeSeat,
    winnerSeat: state.winnerSeat,
    forfeitSeat: state.forfeitSeat,
    viewerSeat,
    fighters: {
      host: sanitize(state.fighters.host, 'host'),
      guest: sanitize(state.fighters.guest, 'guest'),
    },
    logs: (state.logs || []).slice(-20).map(log => {
      if (log.seat === viewerSeat || (log.type !== 'draw' && log.type !== 'discard_chakra')) {
        return log;
      }
      const { instanceId, instanceIds, ...visible } = log;
      return visible;
    }),
    checksum,
    summary,
  };
}

// —— Internals ————————————————————————————————————————————————

function hydrateFighter(raw, seat, rng) {
  const stats = raw.stats || {};
  const maxHp = Number(raw.maxHp) || BASE_MAX_HP + (Number(stats.maxHp) || 0);
  let drawPile = shuffle([...(raw.drawPile || raw.cards || [])], rng);
  let hand = [...(raw.hand || [])];
  let discardPile = [...(raw.discardPile || [])];

  if (!hand.length && drawPile.length) {
    const drawn = drawFromPile(drawPile, discardPile, hand, DRAW_PER_TURN, rng);
    drawPile = drawn.drawPile;
    discardPile = drawn.discardPile;
    hand = drawn.hand;
  }

  return {
    seat,
    userId: raw.userId,
    name: raw.name || (seat === 'host' ? 'Host' : 'Guest'),
    level: raw.level || 1,
    hp: raw.hp != null ? Number(raw.hp) : maxHp,
    maxHp,
    block: Number(raw.block) || 0,
    chakra: raw.chakra != null ? Number(raw.chakra) : BASE_CHAKRA,
    maxChakra: raw.maxChakra != null ? Number(raw.maxChakra) : BASE_CHAKRA,
    statuses: raw.statuses || [],
    ally: raw.ally || null,
    hand,
    drawPile,
    discardPile,
    exhaustPile: raw.exhaustPile || [],
    discardedForChakra: Boolean(raw.discardedForChakra),
    reservedThisTurn: Boolean(raw.reservedThisTurn),
    reservedCard: raw.reservedCard || null,
    nextCardCostReduction: Math.max(0, Number(raw.nextCardCostReduction) || 0),
    chakraCarry: Math.min(1, Math.max(0, Number(raw.chakraCarry) || 0)),
    stats,
    talentCodes: Array.isArray(raw.talentCodes) ? raw.talentCodes : [],
    turnsPlayed: Number(raw.turnsPlayed) || 0,
  };
}

function playCard(state, seat, instanceId, rng) {
  const fighter = state.fighters[seat];
  const opponentSeat = seat === 'host' ? 'guest' : 'host';
  const opponent = state.fighters[opponentSeat];
  if (!fighter || !opponent) throw new Error('Combattants manquants.');

  const card = (fighter.hand || []).find(c => c.instanceId === instanceId);
  if (!card) throw new Error('Carte absente de la main.');

  const normalizedCard = { ...card, type: card.type || card.cardType };
  const opponentEntity = {
    ...opponent,
    posture: opponent.posture || dominantCombatArt(opponent.stats),
    minion: opponent.ally ? { ...opponent.ally } : null,
  };
  const talentCodes = fighter.talentCodes || [];
  const defenderTalentCodes = opponent.talentCodes || [];
  const attackIntent =
    (Number(normalizedCard.damage) || 0) > 0 ||
    (normalizedCard.effects || []).some(effect => effect.type === 'multi_strike');
  const incomingMods = applyTalentIncomingAttackMods(0, opponent, fighter, defenderTalentCodes);
  const evadeChance = getStatusValue(opponent.statuses, 'evade') + incomingMods.evadeBonus;
  const heldEvade = heldEffectMods(opponent).evadeChance;
  const evaded = attackIntent && evadeChance + heldEvade > 0 && rng() < evadeChance + heldEvade;
  const deckElementCount = countDeckElements([
    ...(fighter.hand || []),
    ...(fighter.drawPile || []),
    ...(fighter.discardPile || []),
    ...(fighter.exhaustPile || []),
    ...(fighter.reservedCard ? [fighter.reservedCard] : []),
  ]);
  const talentMods = computeTalentDamageMods(talentCodes, fighter, normalizedCard, {
    enemy: opponent,
    deckElementCount,
    cardsPlayedThisTurn: fighter.cardsPlayedThisTurn || 0,
  });
  const played = applyCardPlay({
    player: fighter,
    enemy: opponentEntity,
    card: normalizedCard,
    stats: fighter.stats,
    talentMods: { ...talentMods, denyAttack: evaded },
    talentCodes,
    incomingDamageModifier: damage => {
      const adjusted = applyTalentIncomingAttackMods(
        damage,
        opponent,
        fighter,
        defenderTalentCodes
      ).damage;
      return applyIncomingTalentCap(adjusted, defenderTalentCodes);
    },
    rng,
  });

  const talentAfterCard = applyTalentAfterCardPlay(played.player, normalizedCard, talentCodes, {
    enemy: played.enemy,
  });
  let nextFighter = talentAfterCard.player;
  let resolvedOpponent = talentAfterCard.enemy || played.enemy;
  if (talentAfterCard.extraDraw > 0) {
    const drawn = drawCards(nextFighter, talentAfterCard.extraDraw, rng);
    nextFighter = drawn.player;
    talentAfterCard.logs.push({
      type: 'draw',
      count: drawn.drawn.length,
      reason: 'elemental_fusion',
    });
  }

  const summon = normalizeSummon(normalizedCard);
  if (summon && nextFighter.ally) {
    nextFighter = {
      ...nextFighter,
      ally: {
        ...nextFighter.ally,
        ...summon,
        remainingTurns: summon.remainingTurns,
      },
    };
  }
  let nextOpponent = {
    ...resolvedOpponent,
    ally: resolvedOpponent.minion || null,
  };
  delete nextOpponent.minion;
  if (attackIntent && evadeChance > 0) {
    nextOpponent.statuses = (nextOpponent.statuses || []).filter(status => status.key !== 'evade');
  }
  if (evaded) {
    if (defenderTalentCodes.includes('phantom_step') && !nextOpponent.phantomStepUsed) {
      const drawn = drawCards(nextOpponent, 1, rng);
      nextOpponent = { ...drawn.player, phantomStepUsed: true };
      talentAfterCard.logs.push({
        type: 'talent',
        effect: 'phantom_step',
        seat: opponentSeat,
      });
      talentAfterCard.logs.push({
        type: 'draw',
        count: drawn.drawn.length,
        reason: 'phantom_step',
      });
    }
  }

  const damageTaken = Math.max(0, (Number(opponent.hp) || 0) - (Number(nextOpponent.hp) || 0));
  if (attackIntent && !evaded) {
    const afterDamageTalent = applyTalentAfterDamageTaken(nextOpponent, defenderTalentCodes, {
      enemy: nextFighter,
      damageDealt: damageTaken,
    });
    nextOpponent = afterDamageTalent.player;
    if (afterDamageTalent.enemy) nextFighter = afterDamageTalent.enemy;
    talentAfterCard.logs.push(...afterDamageTalent.logs);
  }

  const pileDestination = resolveCardPileDestination(normalizedCard, talentCodes);
  const moved = moveCardFromHand(nextFighter, instanceId, pileDestination);
  nextFighter = moved.player;

  const logs = [
    {
      type: 'play_card',
      seat,
      cardId: normalizedCard.id || normalizedCard.slug,
      nameFr: normalizedCard.nameFr,
      nameEn: normalizedCard.nameEn,
      cost: played.chakraSpent,
    },
    ...played.logs.map(log => mapCardLog(log, seat, opponentSeat)),
    ...talentAfterCard.logs.map(log => ({ ...log, seat: log.seat || seat })),
  ];
  if (evaded) {
    const deniedIndex = logs.findIndex(log => log.type === 'attack_denied');
    if (deniedIndex >= 0) logs.splice(deniedIndex, 1);
    logs.push({ type: 'evade', seat: opponentSeat });
  }

  if (attackIntent && !evaded && nextOpponent.hp > 0) {
    const counter = getStatusValue(nextOpponent.statuses, 'counter');
    if (counter > 0) {
      const result = applyIncomingDamage(nextFighter, counter, opponentSeat);
      nextFighter = {
        ...result.fighter,
        statuses: (result.fighter.statuses || []).filter(status => status.key !== 'counter'),
      };
      logs.push(...result.logs);
      logs.push({ type: 'counter', seat: opponentSeat, amount: counter });
    }
  }

  state.fighters = {
    ...state.fighters,
    [seat]: nextFighter,
    [opponentSeat]: nextOpponent,
  };

  const over = checkVictory(state);
  if (over) logs.push({ type: over, winnerSeat: state.winnerSeat });

  return { state, logs };
}

function discardForChakra(state, seat, instanceId) {
  const fighter = state.fighters[seat];
  if (!fighter) throw new Error('Combattant manquant.');
  if (fighter.discardedForChakra || fighter.reservedThisTurn) {
    throw new Error('Défausse pour Chakra ou réserve déjà utilisée ce tour.');
  }

  const idx = (fighter.hand || []).findIndex(c => c.instanceId === instanceId);
  if (idx < 0) throw new Error('Carte absente de la main.');

  const hand = [...fighter.hand];
  const [card] = hand.splice(idx, 1);
  const next = {
    ...fighter,
    hand,
    discardPile: [...(fighter.discardPile || []), card],
    chakra: (Number(fighter.chakra) || 0) + 1,
    discardedForChakra: true,
  };
  state.fighters = { ...state.fighters, [seat]: next };
  return {
    state,
    logs: [{ type: 'discard_chakra', seat, instanceId }],
  };
}

function reserveCard(state, seat, instanceId) {
  const fighter = state.fighters[seat];
  if (!fighter) throw new Error('Combattant manquant.');
  if (fighter.discardedForChakra || fighter.reservedThisTurn || fighter.reservedCard) {
    throw new Error('Défausse pour Chakra ou réserve déjà utilisée ce tour.');
  }
  const idx = (fighter.hand || []).findIndex(c => c.instanceId === instanceId);
  if (idx < 0) throw new Error('Carte absente de la main.');

  const hand = [...fighter.hand];
  const [reservedCard] = hand.splice(idx, 1);
  state.fighters = {
    ...state.fighters,
    [seat]: { ...fighter, hand, reservedCard, reservedThisTurn: true },
  };
  return { state, logs: [{ type: 'reserve_card', seat }] };
}

function endTurn(state, seat, rng) {
  const fighter = state.fighters[seat];
  if (!fighter) throw new Error('Combattant manquant.');

  const opponentSeat = seat === 'host' ? 'guest' : 'host';
  const logs = [{ type: 'end_turn', seat }];
  const endTalent = applyTalentEndOfPlayerTurn(fighter, fighter.talentCodes);
  const playerEnd = resolveEndOfTurnStatuses(endTalent.player);
  let nextFighter = {
    ...playerEnd.entity,
    block: 0,
    discardedForChakra: false,
    reservedThisTurn: false,
    chakraCarry: Math.min(1, Math.max(0, Number(playerEnd.entity.chakra) || 0)),
    hand: [],
    discardPile: [...(fighter.discardPile || []), ...(fighter.hand || [])],
  };
  logs.push(
    ...endTalent.logs.map(log => ({ ...log, seat })),
    ...playerEnd.logs.map(log => ({ ...log, seat }))
  );

  if (nextFighter.ally) {
    const remainingTurns = Math.max(0, (Number(nextFighter.ally.remainingTurns) || 1) - 1);
    if (remainingTurns === 0) {
      nextFighter.ally = null;
      logs.push({ type: 'ally_expired', seat });
    } else {
      nextFighter.ally = { ...nextFighter.ally, remainingTurns };
    }
  }

  state.fighters = { ...state.fighters, [seat]: nextFighter };
  let over = checkVictory(state);
  if (over) {
    logs.push({ type: over, winnerSeat: state.winnerSeat });
    return { state, logs };
  }

  let nextOpponent = state.fighters[opponentSeat];
  if (nextOpponent.block > 0) {
    logs.push({ type: 'block_fade', seat: opponentSeat, value: nextOpponent.block });
  }
  const opponentStart = resolveStartOfTurnStatuses({ ...nextOpponent, block: 0 });
  state.fighters = { ...state.fighters, [opponentSeat]: opponentStart.entity };
  logs.push(...opponentStart.logs.map(log => ({ ...log, seat: opponentSeat })));

  over = checkVictory(state);
  if (over) {
    logs.push({ type: over, winnerSeat: state.winnerSeat });
    return { state, logs };
  }

  const nextOwnerTurn = (Number(nextOpponent.turnsPlayed) || 0) + 1;
  const preparedOpponent = {
    ...opponentStart.entity,
    chakra:
      (nextOpponent.maxChakra ?? BASE_CHAKRA) +
      Math.min(1, Math.max(0, Number(nextOpponent.chakraCarry) || 0)),
    chakraCarry: 0,
    discardedForChakra: false,
    reservedThisTurn: false,
    elementalFusionDrawnThisTurn: false,
  };
  const startTalent = applyTalentStartOfTurn(preparedOpponent, preparedOpponent.talentCodes, {
    turn: nextOwnerTurn,
  });
  const heldStart = applyHeldTurnStart(startTalent.player);
  nextOpponent = { ...heldStart.player, turnsPlayed: nextOwnerTurn };
  logs.push(
    ...startTalent.logs.map(log => ({ ...log, seat: opponentSeat })),
    ...heldStart.logs.map(log => ({ ...log, seat: opponentSeat }))
  );
  state.fighters = { ...state.fighters, [opponentSeat]: nextOpponent };

  over = checkVictory(state);
  if (over) {
    logs.push({ type: over, winnerSeat: state.winnerSeat });
    return { state, logs };
  }

  const allyAttack = resolveAllyAttack(nextOpponent, nextFighter, opponentSeat);
  nextOpponent = allyAttack.attacker;
  nextFighter = allyAttack.target;
  logs.push(...allyAttack.logs);
  state.fighters = {
    ...state.fighters,
    [seat]: nextFighter,
    [opponentSeat]: nextOpponent,
  };

  over = checkVictory(state);
  if (over) {
    logs.push({ type: over, winnerSeat: state.winnerSeat });
    return { state, logs };
  }

  if (nextOpponent.reservedCard) {
    const hand = [...(nextOpponent.hand || [])];
    const discardPile = [...(nextOpponent.discardPile || [])];
    while (hand.length >= MAX_HAND_SIZE) discardPile.push(hand.pop());
    hand.push(nextOpponent.reservedCard);
    nextOpponent = { ...nextOpponent, hand, discardPile, reservedCard: null };
  }
  const drawn = drawCards(nextOpponent, DRAW_PER_TURN, rng);
  nextOpponent = drawn.player;
  state.fighters = { ...state.fighters, [opponentSeat]: nextOpponent };
  state.activeSeat = opponentSeat;
  state.turn = (state.turn || 1) + 1;
  logs.push({ type: 'draw', seat: opponentSeat, count: drawn.drawn.length });
  return { state, logs };
}

function forfeit(state, seat) {
  const winnerSeat = seat === 'host' ? 'guest' : 'host';
  state.status = 'forfeited';
  state.phase = 'game_over';
  state.forfeitSeat = seat;
  state.winnerSeat = winnerSeat;
  return {
    state,
    logs: [{ type: 'forfeit', seat, winnerSeat }],
  };
}

function checkVictory(state) {
  const host = state.fighters.host;
  const guest = state.fighters.guest;
  if (guest.hp <= 0) {
    state.status = 'completed';
    state.phase = 'game_over';
    state.winnerSeat = 'host';
    return 'victory';
  }
  if (host.hp <= 0) {
    state.status = 'completed';
    state.phase = 'game_over';
    state.winnerSeat = 'guest';
    return 'victory';
  }
  return null;
}

function normalizeSummon(card) {
  if (card?.cardType !== 'summon' && !card?.summon) return null;
  const def = card.summon || {};
  const abilities = Array.isArray(def.abilities)
    ? def.abilities.map(ability => String(ability).toLowerCase())
    : [];
  const taunt = Boolean(def.taunt ?? abilities.includes('taunt'));
  const hp = Math.max(1, Number(def.hp) || 20);
  const duration = Math.max(1, Math.floor(Number(def.duration) || (taunt ? 2 : 3)));
  return {
    nameFr: def.nameFr || def.name || card.nameFr || 'Allié',
    nameEn: def.nameEn || def.name || card.nameEn || 'Ally',
    hp,
    maxHp: hp,
    attack: Math.max(0, Number(def.attack) || 0),
    taunt,
    remainingTurns: duration,
  };
}

function applyIncomingDamage(target, damage, sourceSeat) {
  let fighter = { ...target };
  let remaining = Math.max(0, Number(damage) || 0);
  const logs = [];

  if (fighter.ally?.taunt && fighter.ally.hp > 0 && remaining > 0) {
    const absorbed = Math.min(fighter.ally.hp, remaining);
    const hp = fighter.ally.hp - absorbed;
    remaining -= absorbed;
    fighter.ally = hp > 0 ? { ...fighter.ally, hp } : null;
    logs.push({
      type: 'ally_damage',
      seat: fighter.seat,
      source: sourceSeat,
      amount: absorbed,
      allyHp: hp,
      fallen: hp <= 0,
    });
  }

  if (remaining > 0) {
    const result = applyDamageThroughBlock(fighter, remaining);
    fighter = { ...fighter, hp: result.hp, block: result.block };
  }

  return { fighter, logs };
}

function resolveAllyAttack(attacker, target, seat) {
  const ally = attacker.ally;
  if (!ally || ally.hp <= 0 || ally.attack <= 0) {
    return { attacker, target, logs: [] };
  }
  const result = applyIncomingDamage(target, ally.attack, seat);
  return {
    attacker,
    target: result.fighter,
    logs: [
      {
        type: 'ally_attack',
        seat,
        name: ally.nameFr,
        nameFr: ally.nameFr,
        nameEn: ally.nameEn,
        amount: ally.attack,
      },
      ...result.logs,
    ],
  };
}

function dominantCombatArt(stats = {}) {
  return ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'].reduce(
    (best, key) => ((Number(stats[key]) || 0) > (Number(stats[best]) || 0) ? key : best),
    'taijutsu'
  );
}

function mapCardLog(log, seat, opponentSeat) {
  const mapped = { ...log };
  if (mapped.source === 'player') mapped.source = seat;
  if (mapped.type === 'block' && mapped.source === seat) mapped.seat = seat;
  if (mapped.type === 'damage' && mapped.source === seat) mapped.targetSeat = opponentSeat;
  if (mapped.type === 'heal' || mapped.type === 'draw' || mapped.type === 'gain_chakra') {
    mapped.seat = seat;
  }
  if (mapped.type === 'apply_status') {
    mapped.targetSeat = mapped.target === 'player' ? seat : opponentSeat;
  }
  if (mapped.type === 'summon') {
    mapped.seat = seat;
    mapped.nameFr = mapped.nameFr || mapped.name;
  }
  if (mapped.type === 'ally_attack') mapped.seat = seat;
  return mapped;
}

function drawFromPile(drawPile, discardPile, hand, count, rng) {
  let draw = [...drawPile];
  let discard = [...discardPile];
  const nextHand = [...hand];
  let drawnCount = 0;
  let remaining = Math.max(0, count);

  while (remaining > 0) {
    if (draw.length === 0) {
      if (discard.length === 0) break;
      draw = shuffle(discard, rng);
      discard = [];
    }
    const card = draw.shift();
    if (!card) break;
    remaining -= 1;
    drawnCount += 1;
    if (nextHand.length >= MAX_HAND_SIZE) {
      discard.push(card);
    } else {
      nextHand.push(card);
    }
  }

  return { drawPile: draw, discardPile: discard, hand: nextHand, drawnCount };
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
