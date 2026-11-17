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

  const host = hydrateFighter(bootstrap.fighters.host, 'host', rng);
  const guest = hydrateFighter(bootstrap.fighters.guest, 'guest', rng);

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
    logs: [{ type: 'duel_start', turn: 1 }],
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
      discardedForChakra: Boolean(fighter.discardedForChakra),
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
    logs: (state.logs || []).slice(-20),
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
    stats,
  };
}

function playCard(state, seat, instanceId, rng) {
  const fighter = state.fighters[seat];
  const opponentSeat = seat === 'host' ? 'guest' : 'host';
  const opponent = state.fighters[opponentSeat];
  if (!fighter || !opponent) throw new Error('Combattants manquants.');

  const idx = (fighter.hand || []).findIndex(c => c.instanceId === instanceId);
  if (idx < 0) throw new Error('Carte absente de la main.');

  const card = fighter.hand[idx];
  const cost = Math.max(0, Number(card.cost) || 0);
  if (fighter.chakra < cost) throw new Error('Chakra insuffisant.');

  const hand = [...fighter.hand];
  hand.splice(idx, 1);

  let nextFighter = {
    ...fighter,
    hand,
    chakra: fighter.chakra - cost,
    discardPile: [...(fighter.discardPile || []), card],
  };
  let nextOpponent = { ...opponent };
  const logs = [
    {
      type: 'play_card',
      seat,
      cardId: card.id || card.slug,
      nameFr: card.nameFr,
      nameEn: card.nameEn,
      cost,
    },
  ];

  const summon = normalizeSummon(card);
  if (summon) {
    nextFighter.ally = summon;
    logs.push({
      type: 'summon',
      seat,
      name: summon.nameFr,
      nameFr: summon.nameFr,
      nameEn: summon.nameEn,
      duration: summon.remainingTurns,
    });
  }

  const damage = summon ? 0 : computeDamage(card, nextFighter.stats, rng);
  if (damage > 0) {
    const result = applyIncomingDamage(nextOpponent, damage, seat);
    nextOpponent = result.fighter;
    logs.push(...result.logs);
    logs.push({ type: 'damage', source: seat, target: opponentSeat, amount: damage });
  }

  const blockGain = computeBlock(card, nextFighter.stats);
  if (blockGain > 0) {
    nextFighter = { ...nextFighter, block: (nextFighter.block || 0) + blockGain };
    logs.push({ type: 'block', seat, amount: blockGain });
  }

  const heal = computeHeal(card, nextFighter.stats);
  if (heal > 0) {
    nextFighter = {
      ...nextFighter,
      hp: Math.min(nextFighter.maxHp, nextFighter.hp + heal),
    };
    logs.push({ type: 'heal', seat, amount: heal });
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
  if (fighter.discardedForChakra) throw new Error('Déjà défaussé pour Chakra ce tour.');

  const idx = (fighter.hand || []).findIndex(c => c.instanceId === instanceId);
  if (idx < 0) throw new Error('Carte absente de la main.');

  const hand = [...fighter.hand];
  const [card] = hand.splice(idx, 1);
  const next = {
    ...fighter,
    hand,
    discardPile: [...(fighter.discardPile || []), card],
    chakra: Math.min(fighter.maxChakra ?? BASE_CHAKRA, fighter.chakra + 1),
    discardedForChakra: true,
  };
  state.fighters = { ...state.fighters, [seat]: next };
  return {
    state,
    logs: [{ type: 'discard_chakra', seat, instanceId }],
  };
}

function endTurn(state, seat, rng) {
  const fighter = state.fighters[seat];
  if (!fighter) throw new Error('Combattant manquant.');

  // Fade armure fin de tour
  let nextFighter = {
    ...fighter,
    block: 0,
    discardedForChakra: false,
  };

  const opponentSeat = seat === 'host' ? 'guest' : 'host';
  let nextOpponent = { ...state.fighters[opponentSeat] };
  const logs = [{ type: 'end_turn', seat }];

  const allyAttack = resolveAllyAttack(nextFighter, nextOpponent, seat);
  nextFighter = allyAttack.attacker;
  nextOpponent = allyAttack.target;
  logs.push(...allyAttack.logs);

  if (nextOpponent.ally) {
    const remainingTurns = Math.max(0, (Number(nextOpponent.ally.remainingTurns) || 1) - 1);
    if (remainingTurns === 0) {
      nextOpponent.ally = null;
      logs.push({ type: 'ally_expired', seat: opponentSeat });
    } else {
      nextOpponent.ally = { ...nextOpponent.ally, remainingTurns };
    }
  }

  state.fighters = {
    ...state.fighters,
    [seat]: nextFighter,
    [opponentSeat]: nextOpponent,
  };

  const over = checkVictory(state);
  if (over) {
    logs.push({ type: over, winnerSeat: state.winnerSeat });
    return { state, logs };
  }

  // Début de tour adversaire : refill chakra + pioche
  nextOpponent = {
    ...state.fighters[opponentSeat],
    chakra: state.fighters[opponentSeat].maxChakra ?? BASE_CHAKRA,
    discardedForChakra: false,
  };
  const drawn = drawFromPile(
    [...(nextOpponent.drawPile || [])],
    [...(nextOpponent.discardPile || [])],
    [...(nextOpponent.hand || [])],
    DRAW_PER_TURN,
    rng
  );
  nextOpponent = {
    ...nextOpponent,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
    hand: drawn.hand,
  };
  state.fighters = { ...state.fighters, [opponentSeat]: nextOpponent };
  state.activeSeat = opponentSeat;
  state.turn = (state.turn || 1) + 1;
  logs.push({ type: 'draw', seat: opponentSeat, count: drawn.drawnCount });
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
    const blockAbsorbed = Math.min(fighter.block || 0, remaining);
    fighter.block = (fighter.block || 0) - blockAbsorbed;
    fighter.hp = Math.max(0, fighter.hp - (remaining - blockAbsorbed));
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

function computeDamage(card, stats, rng) {
  const base = Number(card.damage) || 0;
  if (base <= 0) return 0;
  const key = card.statType || 'taijutsu';
  const stat = Number(stats?.[key]) || 0;
  let dmg = Math.round(base * (1 + stat / 100));
  const vitesse = Number(stats?.vitesse) || 0;
  const critChance = Math.min(50, Math.floor(vitesse / 10));
  if (rng() * 100 < critChance) dmg = Math.round(dmg * 1.5);
  return Math.max(0, dmg);
}

function computeBlock(card, stats) {
  const base = Number(card.block) || 0;
  if (base <= 0) return 0;
  const med = Number(stats?.medicine) || 0;
  return Math.max(0, Math.round(base * (1 + med / 100)));
}

function computeHeal(card, stats) {
  const base = Number(card.heal) || 0;
  if (base <= 0) return 0;
  const med = Number(stats?.medicine) || 0;
  return Math.max(0, Math.round(base * (1 + med / 100)));
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
