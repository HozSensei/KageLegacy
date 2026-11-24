import {
  allyEvadeChance,
  applyCardPlay,
  effectiveCardCost,
  resolveAllyAttack,
} from './cardEffects.js';
import { publicFighterIdentity } from './fighterIdentity.js';
import { BASE_MAX_HP, DRAW_PER_TURN, STAT_KEYS, TALENT_EFFECT_MVP } from './constants.js';
import { buildRuntimeDeck, drawCards, moveCardFromHand, shuffle } from './deckRuntime.js';
import { applyDamageThroughBlock, getStatusValue } from './formulas.js';
import { applyHeldTurnStart, heldEffectMods } from './heldEffects.js';
import {
  applyBlockFade,
  resolveEndOfTurnStatuses,
  resolveStartOfTurnStatuses,
} from './statuses.js';
import {
  applyIncomingTalentCap,
  applyTalentAfterCardPlay,
  applyTalentAfterDamageTaken,
  applyTalentCombatStart,
  applyTalentEndOfPlayerTurn,
  applyTalentIncomingAttackMods,
  applyTalentStartOfTurn,
  computeTalentDamageMods,
  countDeckElements,
  resolveCardPileDestination,
} from './talentEffects.js';

const BASE_CHAKRA = 5;
const MAX_EXCHANGES = 2;
const AI_DEPTH = 3;

const AI_ACTION_LIMIT = 12;
const PUBLIC_ENEMY_LOGS = new Set([
  'damage',
  'block',
  'heal',
  'apply_status',
  'cleanse',
  'poison',
  'burn',
  'regen',
  'block_fade',
  'summon',
  'ally_attack',
  'ally_damage',
  'evade',
  'counter',
]);

function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

const jsonCopy = value => JSON.parse(JSON.stringify(value));
const noRoll = () => 1 - Number.EPSILON;

function seededRng(duel) {
  return () => {
    duel.rngState = (Math.imul(duel.rngState, 1664525) + 1013904223) >>> 0;
    return duel.rngState / 2 ** 32;
  };
}

function validDeckEntry(entry) {
  const card = entry?.card ?? entry;
  const quantity = Number(entry?.quantity ?? 1);
  return (
    card &&
    typeof card === 'object' &&
    !Array.isArray(card) &&
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    (card.effects == null ||
      (Array.isArray(card.effects) &&
        Array.from(card.effects).every(effect => typeof effect?.type === 'string')))
  );
}

function makeFighter(fighter, index, rng) {
  const { id, name, stats, deckEntries, talentCodes = [] } = fighter;
  if (!(typeof id === 'string' && id.trim()) && !Number.isSafeInteger(id)) {
    fail(400, 'Identifiant du combattant invalide.');
  }
  if (typeof name !== 'string' || !name.trim() || !Array.isArray(talentCodes)) {
    fail(400, 'Combattant invalide.');
  }
  if (
    !Array.isArray(deckEntries) ||
    !deckEntries.length ||
    !Array.from(deckEntries).every(validDeckEntry)
  ) {
    fail(400, 'Deck du combattant invalide.');
  }

  // Les stats entrantes excluent les passifs : chaque copie du deck compte une fois.
  const deck = jsonCopy(buildRuntimeDeck(deckEntries, (_card, n) => `p${index + 1}-${n}`));
  const sources = [stats, ...deck.map(card => card.passiveBonus)];
  const totalStats = Object.fromEntries(
    [...STAT_KEYS, 'startingBlock'].map(key => [
      key,
      sources.reduce((sum, source) => {
        const value = Number(source?.[key]);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    ]),
  );
  const maxHp = Math.max(1, BASE_MAX_HP + totalStats.maxHp);
  const maxChakra = Math.max(0, BASE_CHAKRA + totalStats.maxChakra);
  const applied = [
    ...new Set(
      talentCodes.filter(code => typeof code === 'string' && Object.hasOwn(TALENT_EFFECT_MVP, code)),
    ),
  ];
  return applyTalentCombatStart(
    {
      id,
      name,
      ...publicFighterIdentity(fighter),
      stats: totalStats,
      talentCodes: applied,
      deckElementCount: countDeckElements(deck),
      hp: maxHp,
      maxHp,
      chakra: maxChakra,
      maxChakra,
      block: Math.max(0, totalStats.startingBlock),
      hand: [],
      drawPile: shuffle(deck, rng),
      discardPile: [],
      exhaustPile: [],
      statuses: [],
      ally: null,
      discardedForChakra: false,
      voluntaryDiscards: 0,
    },
    applied,
  );
}

function appendLogs(duel, index, logs) {
  const side = index === 0 ? 'player' : 'enemy';
  for (const log of logs) {
    const entry = { ...log, side, playerId: duel.fighters[index].id };
    if (entry.source === 'player' || entry.source === 'enemy' || entry.type === 'damage')
      entry.source = side;
    if (side === 'enemy' && entry.type === 'apply_status') {
      entry.target = entry.target === 'enemy' ? 'player' : 'enemy';
    }
    duel.logs.push(entry);
  }
}

function finish(duel, state) {
  duel.state = state;
  duel.currentPhase = 'game_over';
  duel.logs.push({ type: state });
}

function checkOutcome(duel) {
  // Il n'y a pas d'état nul : un double K.-O. (p. ex. une riposte) est une défaite.
  if (duel.fighters[0].hp <= 0) finish(duel, 'defeat');
  else if (duel.fighters[1].hp <= 0) finish(duel, 'victory');
  return duel.state !== 'in_progress';
}

// Le résolveur PvE sait déjà traiter la provocation via son minion. Ne pas
// conserver les champs PvE qu'il ajoute (intention, immunités, barrière, etc.).
const asTarget = fighter => ({ ...fighter, minion: fighter.ally?.taunt ? fighter.ally : null });
function afterHit(fighter, { hp, block, statuses, minion }) {
  return { ...fighter, hp, block, statuses, ally: fighter.ally?.taunt ? minion : fighter.ally };
}

function beginTurn(duel, index, rng) {
  const fighter = duel.fighters[index];
  const first = duel.currentTurn === 1;
  let ready = fighter;
  if (!first) {
    const faded = applyBlockFade(fighter);
    ready = faded.entity;
    appendLogs(duel, index, faded.logs);
  }
  const start = resolveStartOfTurnStatuses(ready);
  duel.fighters[index] = start.entity;
  appendLogs(duel, index, start.logs);
  if (checkOutcome(duel)) return;

  const prepared = applyTalentStartOfTurn(
    {
      ...start.entity,
      chakra: first ? fighter.chakra : fighter.maxChakra,
      discardedForChakra: false,
      voluntaryDiscards: 0,
      elementalFusionDrawnThisTurn: false,
    },
    fighter.talentCodes,
    { turn: duel.currentTurn },
  );
  const refill = Math.max(0, DRAW_PER_TURN - prepared.player.hand.length);
  const drawn = drawCards(prepared.player, refill, rng);
  const held = applyHeldTurnStart(drawn.player);
  duel.fighters[index] = held.player;
  appendLogs(duel, index, prepared.logs);
  if (drawn.drawn.length) appendLogs(duel, index, [{ type: 'draw', count: drawn.drawn.length }]);
  appendLogs(duel, index, held.logs);

  const opponent = duel.fighters[1 - index];
  const summoned = resolveAllyAttack(held.player, asTarget(opponent));
  duel.fighters[1 - index] = afterHit(opponent, summoned.enemy);
  appendLogs(duel, index, summoned.logs);
  checkOutcome(duel);
}

function endTurn(duel, index) {
  const fighter = duel.fighters[index];
  const talent = applyTalentEndOfPlayerTurn(fighter, fighter.talentCodes);
  const end = resolveEndOfTurnStatuses(talent.player, { persistBlock: true });
  duel.fighters[index] = end.entity;
  appendLogs(duel, index, [...talent.logs, ...end.logs]);
  return checkOutcome(duel);
}

const canDiscardChakra = fighter =>
  !fighter.discardedForChakra && fighter.voluntaryDiscards < MAX_EXCHANGES;
const hasReplacement = fighter => fighter.drawPile.length + fighter.discardPile.length > 0;

function exchange(fighter, { type, instanceId }, rng) {
  if (fighter.voluntaryDiscards >= MAX_EXCHANGES) fail(400, 'Quota de défausses atteint.');
  const moved = moveCardFromHand(fighter, instanceId);
  if (!moved.card) fail(404, 'Carte absente de la main.');
  const player = { ...moved.player, voluntaryDiscards: fighter.voluntaryDiscards + 1 };
  if (type === 'discard_chakra') {
    if (!canDiscardChakra(fighter)) fail(400, 'Chakra de défausse déjà gagné.');
    player.chakra += 1;
    player.discardedForChakra = true;
    return { player, logs: [{ type: 'discard_for_chakra', instanceId, chakra: player.chakra }] };
  }

  // La carte qu'on échange ne peut pas être sa propre remplaçante.
  if (!hasReplacement(fighter)) fail(400, 'Aucune autre carte à piocher.');
  const drawn = drawCards({ ...player, discardPile: fighter.discardPile }, 1, rng);
  return {
    player: { ...drawn.player, discardPile: [...drawn.player.discardPile, moved.card] },
    logs: [
      { type: 'discard_for_draw', instanceId },
      { type: 'draw', count: drawn.drawn.length },
    ],
  };
}

function cardMods(player, enemy, card) {
  return computeTalentDamageMods(player.talentCodes, player, card, {
    enemy,
    deckElementCount: player.deckElementCount,
    cardsPlayedThisTurn: player.cardsPlayedThisTurn,
  });
}

function play(player, opponent, card, talentMods, rng) {
  let enemy = opponent;
  const defense = [];
  const codes = enemy.talentCodes ?? [];
  const attacks =
    !talentMods.denyAttack &&
    (card.damage > 0 || card.effects.some(effect => effect.type === 'multi_strike'));
  const incoming = damage => applyTalentIncomingAttackMods(damage, enemy, player, codes);
  const evade = attacks ? getStatusValue(enemy.statuses, 'evade') : 0;
  const chance = attacks
    ? Math.min(
        1,
        evade + heldEffectMods(enemy).evadeChance + incoming(0).evadeBonus + allyEvadeChance(enemy),
      )
    : 0;
  const evaded = chance > 0 && rng() < chance;
  if (evade > 0) enemy = { ...enemy, statuses: enemy.statuses.filter(s => s.key !== 'evade') };

  const played = applyCardPlay({
    player,
    enemy: asTarget(enemy),
    card,
    stats: player.stats,
    talentCodes: player.talentCodes,
    talentMods: evaded ? { ...talentMods, denyAttack: true } : talentMods,
    incomingDamageModifier: damage => applyIncomingTalentCap(incoming(damage).damage, codes),
    rng,
  });
  let caster = played.player;
  let target = afterHit(enemy, played.enemy);
  // Seals apply to scripted PvE intents, not to a fighter's hand or turn.
  const logs = played.logs.filter(
    log => log.type !== 'intent_sealed' && !(evaded && log.type === 'attack_denied'),
  );
  const after = applyTalentAfterCardPlay(caster, card, player.talentCodes, { enemy: target });
  caster = moveCardFromHand(
    after.player,
    card.instanceId,
    resolveCardPileDestination(card, player.talentCodes),
  ).player;
  logs.push(...after.logs);
  if (after.extraDraw > 0) {
    const drawn = drawCards(caster, after.extraDraw, rng);
    caster = drawn.player;
    logs.push({ type: 'draw', count: drawn.drawn.length, reason: 'elemental_fusion' });
  }

  if (evaded) {
    defense.push({ type: 'evade' });
    if (codes.includes('phantom_step') && !target.phantomStepUsed) {
      const drawn = drawCards(target, TALENT_EFFECT_MVP.phantom_step.draw, rng);
      target = { ...drawn.player, phantomStepUsed: true };
      defense.push({ type: 'draw', count: drawn.drawn.length, reason: 'phantom_step' });
    }
  } else if (attacks) {
    // Une carte peut préparer une riposte, mais pas la déclencher sur elle-même.
    const counter = getStatusValue(enemy.statuses, 'counter');
    if (counter > 0) {
      const hit = applyDamageThroughBlock(caster, counter);
      caster = { ...caster, hp: hit.hp, block: hit.block };
      target = { ...target, statuses: target.statuses.filter(s => s.key !== 'counter') };
      defense.push({ type: 'counter', amount: hit.damageDealt });
    }
    const reacted = applyTalentAfterDamageTaken(target, codes, {
      enemy: caster,
      damageDealt: enemy.hp - target.hp,
    });
    target = reacted.player;
    caster = reacted.enemy;
    defense.push(...reacted.logs);
  }
  return { player: caster, enemy: target, logs, defense };
}

function act(duel, index, action, rng) {
  const player = duel.fighters[index];
  if (action.type === 'play') {
    const card = player.hand.find(item => item.instanceId === action.instanceId);
    if (!card) fail(404, 'Carte absente de la main.');
    const enemy = duel.fighters[1 - index];
    const played = play(player, enemy, card, cardMods(player, enemy, card), rng);
    duel.fighters[index] = played.player;
    duel.fighters[1 - index] = played.enemy;
    appendLogs(duel, index, played.logs);
    appendLogs(duel, 1 - index, played.defense);
  } else {
    const exchanged = exchange(player, action, rng);
    duel.fighters[index] = exchanged.player;
    appendLogs(duel, index, exchanged.logs);
  }
  checkOutcome(duel);
}

function publicFighter(fighter) {
  const { id, name, hp, maxHp, block, chakra, maxChakra, statuses, ally } = fighter;
  return {
    id,
    name,
    ...publicFighterIdentity(fighter),
    hp,
    maxHp,
    block,
    chakra,
    maxChakra,
    statuses,
    ally,
  };
}

function boardValue({ hp, block, statuses, ally }) {
  const weights = {
    poison: -0.95,
    burn: -0.95,
    weak: -2,
    vulnerable: -2.5,
    force: 1.5,
    regen: 0.8,
    evade: 5,
    counter: 0.7,
    dexterity: 0.9,
    intangible: 4,
    damage_pct: 0.18,
    block_pct: 0.07,
    heal_pct: 0.05,
    taijutsu_pct: 0.12,
    ninjutsu_pct: 0.12,
    genjutsu_pct: 0.12,
  };
  const effects = statuses.reduce(
    (sum, { key, value, duration }) =>
      Object.hasOwn(weights, key) ? sum + weights[key] * value * Math.min(2, duration ?? 1) : sum,
    0,
  );
  return hp + Math.min(block, 24) * 0.4 + effects + (ally ? ally.attack * 1.6 + ally.hp * 0.2 : 0);
}

function planAi(player, opponent, canDraw) {
  // C'est la totalité des informations du planificateur : sa main connue, des
  // piles vides, la façade adverse, et la possibilité (pas le résultat) de piocher.
  const value = (actor, enemy) =>
    enemy.hp <= 0
      ? 1e6
      : actor.hp <= 0
        ? -1e6
        : boardValue(actor) - boardValue(enemy) + Math.min(enemy.block, 24) * 0.15;
  const base = value(player, opponent);
  let best = null;
  let bestScore = 0;

  // Dix cartes maximum ; chaque action simulée en retire une. Explorer les
  // préfixes sans les classer évite d'écarter les préparations de combo.
  function search(actor, enemy, depth, first, bias) {
    if (depth >= AI_DEPTH || actor.hp <= 0 || enemy.hp <= 0) return;
    for (const card of actor.hand) {
      const { instanceId } = card;
      const consider = (type, result, penalty) => {
        const target = result.enemy ?? enemy;
        const action = first ?? { type, instanceId };
        const adjustment = bias + penalty;
        const score = value(result.player, target) - base + adjustment;
        if (score > bestScore) {
          bestScore = score;
          best = action;
        }
        // Ne jamais simuler de recyclage, même des cartes jouées dans ce préfixe.
        search(
          { ...result.player, discardPile: [], exhaustPile: [] },
          target,
          depth + 1,
          action,
          adjustment,
        );
      };
      const mods = cardMods(actor, enemy, card);
      if (
        (!mods.denyNonItem || card.type === 'item') &&
        effectiveCardCost(card, mods, actor).cost <= actor.chakra
      ) {
        const played = play(actor, enemy, card, mods, noRoll);
        const draws = canDraw && played.logs.some(log => log.type === 'draw');
        consider('play', played, draws ? 0.45 : -0.1);
      }
      // Un échange chakra éventuel précède les cartes dont il permet le paiement.
      if (depth === 0 && canDiscardChakra(actor)) {
        consider(
          'discard_chakra',
          exchange(actor, { type: 'discard_chakra', instanceId }, noRoll),
          -1,
        );
      }
    }
  }
  search(player, opponent, 0, null, 0);
  if (best) return best;
  if (!canDraw || player.voluntaryDiscards >= MAX_EXCHANGES) return null;
  const stale = player.hand.find(card => !card.heldEffect);
  return stale ? { type: 'discard_draw', instanceId: stale.instanceId } : null;
}

function runAi(duel, rng) {
  duel.currentPhase = 'enemy_turn';
  beginTurn(duel, 1, rng);
  for (let step = 0; duel.state === 'in_progress' && step < AI_ACTION_LIMIT; step += 1) {
    const [opponent, actor] = duel.fighters;
    const action = planAi(
      { ...actor, drawPile: [], discardPile: [], exhaustPile: [] },
      publicFighter(opponent),
      hasReplacement(actor),
    );
    if (!action) break;
    act(duel, 1, action, rng);
  }
  if (duel.state !== 'in_progress' || endTurn(duel, 1)) return;
  duel.currentTurn += 1;
  duel.currentPhase = 'player_turn';
  beginTurn(duel, 0, rng);
}

/** Snapshots serveur : exactement deux combattants [joueur, IA], cartes PvE sérialisées,
 * stats de talents seules. Seed uint32 (0 par défaut) ; conserver l'état brut côté serveur. */
export function createAsyncDuel(fighters, seed = 0) {
  if (!Array.isArray(fighters) || fighters.length !== 2 || !fighters[0] || !fighters[1]) {
    fail(400, 'Deux combattants sont requis.');
  }
  if (String(fighters[0].id) === String(fighters[1].id))
    fail(400, 'Identifiants de combattants distincts requis.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail(400, 'Seed invalide.');
  const duel = {
    state: 'in_progress',
    ruleset: 'persistent',
    currentTurn: 1,
    currentPhase: 'player_turn',
    rngState: seed,
    logs: [{ type: 'duel_start' }],
  };
  const rng = seededRng(duel);
  const starts = fighters.map((fighter, index) => makeFighter(fighter, index, rng));
  duel.fighters = starts.map(start => start.player);
  starts.forEach((start, index) => {
    const drawn = drawCards(start.player, DRAW_PER_TURN, rng);
    duel.fighters[index] = drawn.player;
    appendLogs(duel, index, [...start.logs, { type: 'draw', count: drawn.drawn.length }]);
  });
  beginTurn(duel, 0, rng);
  duel.logs = jsonCopy(duel.logs);
  return duel;
}

/** Action du joueur uniquement. Une fin de tour résout également le tour IA.
 * Renvoie un nouvel état brut avec les logs de cette transition (pas un historique). */
export function applyAsyncDuelAction(state, action) {
  if (state.state !== 'in_progress') fail(400, 'Combat terminé.');
  if (state.currentPhase !== 'player_turn') fail(400, 'Ce n’est pas votre tour.');
  const duel = { ...state, fighters: [...state.fighters], logs: [] };
  const rng = seededRng(duel);
  switch (action?.type) {
    case 'play':
    case 'discard_chakra':
    case 'discard_draw':
      if (typeof action.instanceId !== 'string' || !action.instanceId)
        fail(400, 'instanceId requis.');
      if (action.type === 'play' && action.target != null && action.target !== 'enemy')
        fail(400, 'Cible invalide.');
      act(duel, 0, action, rng);
      break;
    case 'end_turn':
      if (!endTurn(duel, 0)) runAi(duel, rng);
      break;
    case 'forfeit':
      finish(duel, 'forfeited');
      break;
    default:
      fail(400, 'Action inconnue.');
  }
  duel.logs = jsonCopy(duel.logs);
  return duel;
}

/** Vue CombatArena côté joueur. Pas de statistiques brutes, de mains/piles
 * adverses, d'intentions annoncées ou de tendances prédictives. */
export function publicAsyncDuel(duel) {
  const [player, enemy] = duel.fighters;
  const logs = duel.logs.flatMap(log => {
    if (log.side !== 'enemy') return [log];
    if (!PUBLIC_ENEMY_LOGS.has(log.type)) return [];
    const visible = { ...log };
    delete visible.card;
    delete visible.instanceId;
    delete visible.instanceIds;
    return [visible];
  });
  return jsonCopy({
    ...(duel.id != null && { id: duel.id }),
    state: duel.state,
    ruleset: duel.ruleset,
    currentTurn: duel.currentTurn,
    currentPhase: duel.currentPhase,
    player: {
      ...publicFighter(player),
      hand: player.hand.map(card => ({
        ...card,
        cost: effectiveCardCost(card, cardMods(player, enemy, card)).baseCost,
      })),
      drawCount: player.drawPile.length,
      discardCount: player.discardPile.length,
      exhaustCount: player.exhaustPile.length,
      discardedForChakra: player.discardedForChakra,
      discardsRemaining: MAX_EXCHANGES - player.voluntaryDiscards,
      chakraDiscardAvailable: canDiscardChakra(player),
      previousCardStatType: player.previousCardStatType,
      nextCardCostReduction: player.nextCardCostReduction ?? 0,
    },
    enemy: {
      ...publicFighter(enemy),
      nameFr: enemy.name,
      nameEn: enemy.name,
      intent: null,
      nextIntent: null,
    },
    logs,
    rewards: null,
    suppressRewards: true,
  });
}
