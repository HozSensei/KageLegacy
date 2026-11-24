import { executeEnemyIntent, getNextIntent, scaleIntent } from '../combatAIService.js';
import { applyCardPlay, resolveAllyAttack } from './cardEffects.js';
import { BASE_MAX_HP, DRAW_PER_TURN, STAT_KEYS } from './constants.js';
import { buildRuntimeDeck, drawCards, moveCardFromHand, shuffle } from './deckRuntime.js';
import { publicFighterIdentity } from './fighterIdentity.js';
import { applyHeldTurnStart } from './heldEffects.js';
import {
  PLAYER_DEBUFF_KEYS,
  resolveEndOfTurnStatuses,
  resolveStartOfTurnStatuses,
} from './statuses.js';
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

const BASE_COOP_CHAKRA = 5;
const MAX_EXCHANGES = 2;
const STAT_BONUSES = [...STAT_KEYS, 'startingBlock'];
const SUPPORT_EFFECTS = new Set(['heal', 'heal_self', 'gain_block', 'cleanse_self']);
const CASTER_EFFECTS = new Set(['draw', 'gain_chakra', 'gain_energy', 'reduce_next_card_cost']);
const ATTACK_EFFECTS = new Set(['multi_strike', 'aoe', 'bonus_if', 'innate_crit', 'crit']);
const HARMFUL_STATUSES = new Set([...PLAYER_DEBUFF_KEYS, 'brûlure', 'faiblesse', 'vulnérabilité']);
const SHARED_PLAYER_LOGS = new Set([
  'damage',
  'heal',
  'block',
  'cleanse',
  'apply_status',
  'poison',
  'burn',
  'bleed',
  'madness',
  'regen',
  'block_fade',
  'summon',
  'ally_attack',
  'ally_damage',
  'evade',
  'counter',
  'intent_sealed',
]);

function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

function fighterIndex(combat, userId) {
  const index = combat.players.findIndex(player => player.id === userId);
  if (index < 0) fail(403, 'Vous ne participez pas à ce combat.');
  return index;
}

// L’aléa du prototype est rejouable et reste dans l’état brut (jamais dans la vue).
function combatRng(combat) {
  return () => {
    combat.rngState = (Math.imul(combat.rngState, 1664525) + 1013904223) >>> 0;
    return combat.rngState / 2 ** 32;
  };
}

function appendLogs(combat, logs, playerId, targetId) {
  combat.logs.push(
    ...logs.map(entry => ({
      ...entry,
      ...(playerId != null && { playerId }),
      ...(targetId != null && { targetId }),
    })),
  );
}

function finish(combat, state) {
  combat.state = state;
  combat.currentPhase = 'game_over';
  combat.activePlayerId = null;
  combat.logs.push({ type: state });
}

function checkOutcome(combat) {
  if (combat.enemy.hp <= 0) finish(combat, 'victory');
  else if (combat.players.every(player => player.hp <= 0)) finish(combat, 'defeat');
  return combat.state !== 'in_progress';
}

/** Intentions qui frappent / affectent un joueur — les autres (défense, buff…) sont sur l’ennemi. */
const PLAYER_TARGETED_INTENTS = new Set(['attack', 'debuff']);

function pickLivingPlayer(combat, round) {
  const preferred = combat.players[(Math.max(1, Number(round) || 1) - 1) % 2];
  if (preferred?.hp > 0) return preferred;
  return combat.players.find(player => player.hp > 0) || null;
}

function withTarget(combat, intent, round) {
  if (!intent) return intent;
  if (!PLAYER_TARGETED_INTENTS.has(intent.type)) {
    const cleaned = { ...intent };
    delete cleaned.targetId;
    delete cleaned.targetName;
    return cleaned;
  }
  const target = pickLivingPlayer(combat, round);
  return { ...intent, targetId: target?.id ?? null, targetName: target?.name ?? null };
}

function refreshIntents(combat) {
  const { enemy, currentTurn } = combat;
  const upcoming = { ...enemy, patternIndex: enemy.patternIndex + 1 };
  const intent = withTarget(combat, scaleIntent(enemy.intent, enemy), currentTurn);
  combat.enemy = {
    ...enemy,
    intent,
    nextIntent: withTarget(combat, getNextIntent(upcoming), currentTurn + 1),
  };
}

function announceIntent(combat) {
  combat.logs.push({ type: 'intent', intent: combat.enemy.intent });
}

function createFighter(combat, fighter, index, rng) {
  const { id, name, deckEntries, talentCodes } = fighter;
  const deck = buildRuntimeDeck(structuredClone(deckEntries), (_card, n) => `p${index + 1}-${n}`);
  const bonuses = [fighter.stats, ...deck.map(card => card.passiveBonus)];
  const stats = Object.fromEntries(
    STAT_BONUSES.map(key => [
      key,
      bonuses.reduce((sum, source) => {
        const value = Number(source?.[key]);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0),
    ]),
  );
  const maxHp = Math.max(1, BASE_MAX_HP + stats.maxHp);
  const maxChakra = Math.max(0, BASE_COOP_CHAKRA + stats.maxChakra);
  const talentEffects = { codes: [...talentCodes], ...classifyTalentEffects(talentCodes) };
  const start = applyTalentCombatStart(
    {
      id,
      name,
      ...publicFighterIdentity(fighter),
      stats,
      talentEffects,
      deckElementCount: countDeckElements(deck),
      hp: maxHp,
      maxHp,
      block: Math.max(0, stats.startingBlock),
      chakra: maxChakra,
      maxChakra,
      hand: [],
      drawPile: shuffle(deck, rng),
      discardPile: [],
      exhaustPile: [],
      statuses: [],
      ally: null,
      voluntaryDiscards: 0,
      discardedForChakra: false,
    },
    talentEffects.applied,
  );
  const drawn = drawCards(start.player, DRAW_PER_TURN, rng);
  appendLogs(combat, [...start.logs, { type: 'draw', count: drawn.drawn.length }], id);
  return drawn.player;
}

function beginPlayerTurn(combat, index, rng) {
  const player = combat.players[index];
  const { id, talentEffects } = player;
  const start = resolveStartOfTurnStatuses(player);
  combat.players[index] = start.entity;
  appendLogs(combat, start.logs, id);
  if (start.entity.hp <= 0) {
    checkOutcome(combat);
    return false;
  }

  const prepared = applyTalentStartOfTurn(
    {
      ...start.entity,
      chakra: combat.currentTurn === 1 ? player.chakra : player.maxChakra,
      discardedForChakra: false,
      voluntaryDiscards: 0,
      elementalFusionDrawnThisTurn: false,
    },
    talentEffects.applied,
    { turn: combat.currentTurn },
  );
  const refill = Math.max(0, DRAW_PER_TURN - prepared.player.hand.length);
  const drawn = drawCards(prepared.player, refill, rng);
  const held = applyHeldTurnStart(drawn.player);
  combat.players[index] = held.player;
  appendLogs(combat, prepared.logs, id);
  if (refill > 0) appendLogs(combat, [{ type: 'draw', count: drawn.drawn.length }], id);
  appendLogs(combat, held.logs, id);

  if (combat.currentTurn > 1) {
    const summoned = resolveAllyAttack(held.player, combat.enemy);
    combat.players[index] = summoned.player;
    combat.enemy = summoned.enemy;
    appendLogs(combat, summoned.logs, id);
    if (checkOutcome(combat)) return false;
  }
  combat.currentPhase = 'player_turn';
  combat.activePlayerId = id;
  return true;
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
        Array.from(card.effects).every(effect => effect && typeof effect.type === 'string')))
  );
}

function defaultCoopEnemy() {
  const enemy = {
    templateId: 'coop_sentinel',
    nameFr: 'Sentinelle du duo',
    nameEn: 'Duo Sentinel',
    hp: 180,
    maxHp: 180,
    block: 0,
    statuses: [],
    ai: 'pattern',
    patternIndex: 0,
    pattern: [
      { type: 'attack', damage: 22 },
      { type: 'attack', damage: 26 },
      { type: 'debuff', status: 'poison', duration: 2 },
    ],
  };
  enemy.intent = getNextIntent(enemy);
  return enemy;
}

/**
 * Stats de personnage hors passifs du deck ; cartes sérialisées au format PvE.
 * @param {object[]} fighters
 * @param {{ enemy?: object }} [options] — ennemi déjà scalé (missions coop) ; sinon sentinelle.
 */
export function createCoopCombat(fighters, options = {}) {
  if (!Array.isArray(fighters) || fighters.length !== 2) fail(400, 'Deux combattants sont requis.');
  for (const fighter of fighters) {
    const { id, name, stats, deckEntries, talentCodes } = fighter || {};
    const validId = (typeof id === 'string' && id.trim()) || Number.isFinite(id);
    if (
      !validId ||
      typeof name !== 'string' ||
      !name.trim() ||
      !stats ||
      typeof stats !== 'object' ||
      Array.isArray(stats) ||
      !Array.isArray(deckEntries) ||
      !Array.from(deckEntries).every(validDeckEntry) ||
      (talentCodes !== undefined &&
        (!Array.isArray(talentCodes) || talentCodes.some(code => typeof code !== 'string')))
    ) {
      fail(400, 'Combattant coop invalide.');
    }
  }
  if (fighters[0].id === fighters[1].id) fail(400, 'Les combattants doivent être distincts.');

  const enemy =
    options.enemy && typeof options.enemy === 'object' ? options.enemy : defaultCoopEnemy();
  if (!enemy.intent) enemy.intent = getNextIntent(enemy);

  const combat = {
    state: 'in_progress',
    ruleset: 'persistent',
    currentTurn: 1,
    currentPhase: 'player_turn',
    activePlayerId: null,
    enemy,
    logs: [{ type: 'combat_start', templateId: enemy.templateId }],
    rngState: fighters.reduce((seed, { id }) => {
      for (const char of JSON.stringify(id)) seed = Math.imul(seed ^ char.codePointAt(0), 16777619);
      return seed >>> 0;
    }, 2166136261),
  };
  const rng = combatRng(combat);
  combat.players = fighters.map((fighter, index) =>
    createFighter(
      combat,
      {
        ...fighter,
        talentCodes: fighter.talentCodes ?? [],
      },
      index,
      rng,
    ),
  );
  beginPlayerTurn(combat, 0, rng);
  refreshIntents(combat);
  announceIntent(combat);
  return combat;
}

function exchangeCard(combat, index, { type, instanceId }, rng) {
  const player = combat.players[index];
  const forChakra = type === 'discard_chakra';
  if (player.voluntaryDiscards >= MAX_EXCHANGES) fail(400, 'Quota de défausses atteint.');
  if (forChakra && player.discardedForChakra) fail(400, 'Chakra de défausse déjà gagné.');
  const moved = moveCardFromHand(player, instanceId);
  if (!moved.card) fail(404, 'Carte absente de la main.');
  const next = { ...moved.player, voluntaryDiscards: player.voluntaryDiscards + 1 };
  if (forChakra) {
    combat.players[index] = { ...next, chakra: next.chakra + 1, discardedForChakra: true };
    appendLogs(
      combat,
      [{ type: 'discard_for_chakra', instanceId, chakra: next.chakra + 1 }],
      player.id,
    );
  } else {
    // La carte échangée ne peut pas être repiochée immédiatement.
    const drawn = drawCards({ ...next, discardPile: player.discardPile }, 1, rng);
    if (!drawn.drawn.length) fail(400, 'Aucune autre carte à piocher.');
    combat.players[index] = {
      ...drawn.player,
      discardPile: [...drawn.player.discardPile, moved.card],
    };
    appendLogs(
      combat,
      [
        { type: 'discard_for_draw', instanceId },
        { type: 'draw', count: 1 },
      ],
      player.id,
    );
  }
}

function allyCardMode(card, confirmedFriendlyFire) {
  let harm = card.damage > 0;
  let support = card.heal > 0 || card.block > 0;
  const effects = card.effects;
  const hasAttack = harm || effects.some(effect => effect?.type === 'multi_strike');
  const hasBlock = card.block > 0 || effects.some(effect => effect?.type === 'gain_block');
  const unsupported = () => fail(400, 'Combinaison non prise en charge pour une cible alliée.');
  if (card.summon || card.type === 'summon') unsupported();

  // Liste fermée : aucun effet inédit, ambigu ou propre à l’ennemi n’est redirigé.
  for (const effect of effects) {
    const type = effect?.type;
    const combo = type === 'combo_previous' || effect?.condition === 'previous_card_stat_type';
    if (combo) {
      if (Number(effect.damage) > 0 && !hasAttack) unsupported();
      if (Number(effect.heal) > 0 && !(card.heal > 0)) unsupported();
      if (Number(effect.block) > 0 && !hasBlock) unsupported();
      if (Number(effect.statusValue) && !effects.some(item => item?.type === 'apply_status'))
        unsupported();
    }
    if (type === 'combo_previous' || CASTER_EFFECTS.has(type)) continue;
    if (SUPPORT_EFFECTS.has(type) && [undefined, 'self', 'ally'].includes(effect.target)) {
      support = true;
    } else if (
      ATTACK_EFFECTS.has(type) &&
      hasAttack &&
      [undefined, 'enemy', 'ally'].includes(effect.target)
    ) {
      harm = true;
    } else if (
      type === 'apply_status' &&
      [undefined, 'enemy', 'ally'].includes(effect.target) &&
      HARMFUL_STATUSES.has(String(effect.status).toLowerCase())
    ) {
      harm = true;
    } else {
      unsupported();
    }
  }
  if (harm && confirmedFriendlyFire !== true) {
    throw Object.assign(new Error('Tir allié à confirmer.'), {
      statusCode: 400,
      code: 'FRIENDLY_FIRE_CONFIRMATION',
    });
  }
  if (harm === support) unsupported();
  return harm ? 'harm' : 'support';
}

function playCard(combat, index, { instanceId, target = 'enemy', confirmedFriendlyFire }, rng) {
  if (target !== 'enemy' && target !== 'ally') fail(400, 'Cible invalide.');
  const player = combat.players[index];
  const card = player.hand.find(item => item.instanceId === instanceId);
  if (!card) fail(404, 'Carte absente de la main.');
  const ally = target === 'ally' ? combat.players[1 - index] : null;
  if (ally && ally.hp <= 0) fail(400, 'Cet allié est K.-O.');
  const mode = ally ? allyCardMode(card, confirmedFriendlyFire) : 'enemy';
  const talentCodes = player.talentEffects.applied;
  const opponent = mode === 'harm' ? ally : combat.enemy;
  const talentMods = computeTalentDamageMods(talentCodes, player, card, {
    enemy: opponent,
    deckElementCount: player.deckElementCount,
    cardsPlayedThisTurn: player.cardsPlayedThisTurn,
  });

  // Le support emprunte seulement les PV et le bloc du destinataire. La source
  // conserve ses stats, ses modificateurs, sa main et les coûts/effets de pioche.
  const support = mode === 'support';
  const played = applyCardPlay({
    player: support ? { ...player, hp: ally.hp, maxHp: ally.maxHp, block: ally.block } : player,
    enemy: opponent,
    card: support
      ? { ...card, effects: card.effects.filter(effect => effect.type !== 'cleanse_self') }
      : card,
    stats: player.stats,
    talentMods,
    talentCodes,
    rng,
  });

  let caster = played.player;
  if (support) {
    if (caster.hp < ally.hp || !Number.isFinite(caster.hp)) fail(400, 'Soin allié invalide.');
    let statuses = ally.statuses;
    for (const effect of card.effects) {
      if (
        effect.type !== 'cleanse_self' ||
        (effect.condition === 'previous_card_stat_type' &&
          effect.statType !== player.previousCardStatType)
      )
        continue;
      const removed = statuses.find(status => PLAYER_DEBUFF_KEYS.has(status.key));
      if (removed) statuses = statuses.filter(status => status !== removed);
      played.logs.push({ type: 'cleanse', removed: removed?.key ?? null });
    }
    combat.players[1 - index] = { ...ally, hp: caster.hp, block: caster.block, statuses };
    caster = { ...caster, hp: player.hp, maxHp: player.maxHp, block: player.block };
  } else if (mode === 'harm') {
    const { hp, block, statuses } = played.enemy;
    combat.players[1 - index] = { ...ally, hp, block, statuses };
  } else {
    combat.enemy = played.enemy;
  }

  const after = applyTalentAfterCardPlay(caster, card, talentCodes);
  const moved = moveCardFromHand(
    after.player,
    instanceId,
    resolveCardPileDestination(card, talentCodes),
  );
  const logs = [...played.logs, ...after.logs];
  combat.players[index] = moved.player;
  if (after.extraDraw > 0) {
    const drawn = drawCards(moved.player, after.extraDraw, rng);
    combat.players[index] = drawn.player;
    logs.push({ type: 'draw', count: drawn.drawn.length, reason: 'elemental_fusion' });
  }
  appendLogs(combat, logs, player.id, ally?.id);
  checkOutcome(combat);
}

function enemyTurn(combat, rng) {
  refreshIntents(combat);
  const start = resolveStartOfTurnStatuses({ ...combat.enemy, block: 0 });
  combat.enemy = start.entity;
  appendLogs(
    combat,
    start.logs.map(log => ({ ...log, side: 'enemy' })),
  );
  if (checkOutcome(combat)) return;

  // Attaque / débuff : cible annoncée. Défense / buff : pas de cible joueur affichée,
  // mais executeEnemyIntent a encore besoin d’un joueur (ex. minions).
  const announcedId = combat.enemy.intent?.targetId;
  const target =
    (announcedId != null
      ? combat.players.find(player => player.id === announcedId && player.hp > 0)
      : null) || pickLivingPlayer(combat, combat.currentTurn);
  if (!target) return;
  const targetId = target.id;
  const index = fighterIndex(combat, targetId);
  const talentCodes = target.talentEffects.applied;
  const act = executeEnemyIntent(combat.enemy, target, rng, { talentCodes });
  let recipient = act.player;
  appendLogs(
    combat,
    act.logs.filter(log => log.type !== 'intent'),
    targetId,
    targetId,
  );
  if (act.phantomStepDraw > 0) {
    const drawn = drawCards(recipient, act.phantomStepDraw, rng);
    recipient = drawn.player;
    appendLogs(
      combat,
      [{ type: 'draw', count: drawn.drawn.length, reason: 'phantom_step' }],
      targetId,
    );
  }
  const after = applyTalentAfterDamageTaken(recipient, talentCodes, {
    enemy: act.enemy,
    damageDealt: act.damageTakenByPlayer,
  });
  combat.players[index] = after.player;
  combat.enemy = after.enemy;
  appendLogs(combat, after.logs, targetId, targetId);
  if (checkOutcome(combat)) return;

  const end = resolveEndOfTurnStatuses(combat.enemy, { persistBlock: true });
  combat.enemy = end.entity;
  appendLogs(
    combat,
    end.logs.map(log => ({ ...log, side: 'enemy' })),
  );
  if (checkOutcome(combat)) return;

  combat.players = combat.players.map(player => {
    if (player.block > 0)
      appendLogs(combat, [{ type: 'block_fade', value: player.block }], player.id);
    return { ...player, block: 0 };
  });
  combat.currentTurn += 1;
  refreshIntents(combat);
  announceIntent(combat);
}

function endPlayerTurn(combat, index, rng) {
  const player = combat.players[index];
  const talent = applyTalentEndOfPlayerTurn(player, player.talentEffects.applied);
  const end = resolveEndOfTurnStatuses(talent.player, { persistBlock: true });
  combat.players[index] = end.entity;
  appendLogs(combat, [...talent.logs, ...end.logs], player.id);
  if (checkOutcome(combat)) return;

  // Le cycle conserve l’ordre des sièges et saute les K.-O. sans leur donner de tour.
  let nextIndex = index + 1;
  while (combat.state === 'in_progress') {
    if (nextIndex === combat.players.length) {
      enemyTurn(combat, rng);
      if (combat.state !== 'in_progress') return;
      nextIndex = 0;
    }
    if (combat.players[nextIndex].hp > 0 && beginPlayerTurn(combat, nextIndex, rng)) return;
    nextIndex += 1;
  }
}

/** Calcule un nouvel état brut ; ne modifie pas l’état reçu. */
export function applyCoopAction(combat, userId, action) {
  const index = fighterIndex(combat, userId);
  if (combat.state !== 'in_progress') fail(400, 'Combat terminé.');
  const next = { ...combat, players: [...combat.players], logs: [] };
  if (action?.type === 'forfeit') {
    next.logs.push({ type: 'forfeit', playerId: userId });
    finish(next, 'defeat');
    return next;
  }
  if (combat.activePlayerId !== userId) fail(400, 'Ce n’est pas votre tour.');
  const rng = combatRng(next);
  switch (action?.type) {
    case 'play':
    case 'discard_chakra':
    case 'discard_draw':
      if (!action.instanceId) fail(400, 'instanceId requis.');
      if (action.type === 'play') playCard(next, index, action, rng);
      else exchangeCard(next, index, action, rng);
      break;
    case 'end_turn':
      endPlayerTurn(next, index, rng);
      break;
    default:
      fail(400, 'Action inconnue.');
  }
  if (next.state === 'in_progress') refreshIntents(next);
  return next;
}

function publicFighter(fighter) {
  const { id, name, hp, maxHp, block, chakra, maxChakra, statuses } = fighter;
  return {
    id,
    name,
    ...publicFighterIdentity(fighter),
    hp,
    maxHp,
    block,
    chakra,
    maxChakra,
    statuses: (statuses || []).map(({ key, value, duration }) => ({ key, value, duration })),
  };
}

function publicLogs(logs, userId) {
  return logs.flatMap(log => {
    if (log.playerId == null || log.playerId === userId || log.type === 'forfeit') return [log];
    if (!SHARED_PLAYER_LOGS.has(log.type)) return [];
    const visible = { ...log };
    delete visible.card;
    delete visible.instanceId;
    delete visible.instanceIds;
    return [visible];
  });
}

export function publicCoopCombat(combat, userId) {
  const index = fighterIndex(combat, userId);
  const player = combat.players[index];
  const { templateId, nameFr, nameEn, hp, maxHp, block, statuses, intent, nextIntent } =
    combat.enemy;
  return structuredClone({
    ...(combat.id != null && { id: combat.id }),
    state: combat.state,
    ruleset: 'persistent',
    currentTurn: combat.currentTurn,
    // CombatArena n’autorise les actions qu’en player_turn, du point de vue du lecteur.
    currentPhase:
      combat.currentPhase === 'player_turn' && combat.activePlayerId !== userId
        ? 'enemy_turn'
        : combat.currentPhase,
    activePlayerId: combat.activePlayerId,
    stats: player.stats,
    talentEffects: player.talentEffects,
    player: {
      ...publicFighter(player),
      statuses: player.statuses,
      hand: player.hand,
      drawCount: player.drawPile.length,
      discardCount: player.discardPile.length,
      exhaustCount: player.exhaustPile.length,
      discardedForChakra: player.discardedForChakra,
      discardsRemaining: MAX_EXCHANGES - player.voluntaryDiscards,
      chakraDiscardAvailable:
        !player.discardedForChakra && player.voluntaryDiscards < MAX_EXCHANGES,
      previousCardStatType: player.previousCardStatType ?? null,
      nextCardCostReduction: player.nextCardCostReduction ?? 0,
      ally: player.ally,
    },
    ally: publicFighter(combat.players[1 - index]),
    enemy: { templateId, nameFr, nameEn, hp, maxHp, block, statuses, intent, nextIntent },
    logs: publicLogs(combat.logs, userId),
    rewards: null,
    suppressRewards: true,
  });
}
