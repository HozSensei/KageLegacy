import { ALL_CARDS } from './seedCards.js';
import { prototypeCard } from './data/cardBalancePrototype.js';
import { applyUpgradeBonuses } from '../src/services/cardService.js';
import { DECK_CONSTRAINTS, validateDeck } from '../src/services/deckService.js';
import { BASE_CHAKRA } from '../src/services/deckCombat/constants.js';
import { applySoloCardBalance } from '../src/services/deckCombat/soloCardBalance.js';
import { mergeStatBonuses } from '../src/services/playerCharacterService.js';
import { shuffle } from '../src/services/deckCombat/deckRuntime.js';
import {
  createSeededRng,
  createSimSession,
  playGreedyPlayerTurn,
  simEndTurn,
} from '../src/services/deckCombat/combatBalanceSim.js';

const ART_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];
const RARITY_BUDGETS = {
  common: [0, 5],
  rare: [5, 10],
  legendary: [10, 15],
  mythic: [15, 20],
};

function passiveTotal(passive = {}) {
  return ART_KEYS.reduce((sum, key) => sum + Math.max(0, Number(passive[key]) || 0), 0);
}

function activeProfile(card) {
  const effects = card.effects || [];
  const profile = [];
  if ((Number(card.baseDamage ?? card.damage) || 0) > 0) profile.push('damage');
  if ((Number(card.baseBlock ?? card.block) || 0) > 0) profile.push('block');
  if ((Number(card.baseHeal ?? card.heal) || 0) > 0) profile.push('heal');
  if (card.summon || card.type === 'summon') profile.push('summon');
  for (const effect of effects) {
    if (effect.type === 'apply_status') profile.push(`status:${effect.status}`);
    else profile.push(effect.type);
  }
  return [...new Set(profile)];
}

const EFFECT_ROLES = {
  aoe: 'damage',
  multi_strike: 'damage',
  counter: 'defense',
  gain_block: 'defense',
  evade_next: 'defense',
  evade_percent: 'defense',
  heal_self: 'healing',
  cleanse_self: 'cleanse',
  draw: 'draw',
  gain_chakra: 'resource',
  gain_energy: 'resource',
  reduce_next_card_cost: 'resource',
  combo_previous: 'combo',
  bonus_if: 'conditional',
  exile_enemy_card: 'control',
  seal_intent: 'control',
};
const STATUS_ROLES = {
  burn: 'damage_over_time',
  poison: 'damage_over_time',
  regen: 'healing',
  vulnerable: 'debuff',
  weak: 'debuff',
};

function functionalRoles(profile) {
  const roles = profile.map(effect => {
    if (effect === 'block') return 'defense';
    if (effect === 'heal') return 'healing';
    if (effect === 'damage' || effect === 'summon') return effect;
    if (effect.startsWith('status:')) {
      const status = effect.slice('status:'.length);
      return STATUS_ROLES[status] ?? (status.endsWith('_pct') ? 'buff' : effect);
    }
    return EFFECT_ROLES[effect] ?? `effect:${effect}`;
  });
  return [...new Set(roles)].sort();
}

const findings = [];
const byArt = Object.fromEntries([...ART_KEYS, 'common'].map(key => [key, []]));
const roleCounts = Object.fromEntries([...ART_KEYS, 'common'].map(key => [key, {}]));
for (const card of ALL_CARDS) {
  const isCommon = card.type === 'item' || card.type === 'summon' || card.slug.startsWith('clan-');
  const expectedArt = isCommon ? 'common' : card.statType;
  const passiveBudget = RARITY_BUDGETS[card.rarity];
  const levels = [0, 1, 2].map(level => {
    const base = { ...(card.passiveBonus || {}) };
    if (level > 0) {
      for (const [key, value] of Object.entries(
        card.upgradeBonuses?.[`level_${level}`]?.passive || {}
      )) {
        base[key] = (Number(base[key]) || 0) + (Number(value) || 0);
      }
    }
    return { level, bonuses: base, total: passiveTotal(base) };
  });
  const overBudget = levels.filter(item => item.total > passiveBudget[1]);
  const underBudget = levels.filter(item => item.total < passiveBudget[0]);

  if (card.statType !== expectedArt) {
    findings.push({ kind: 'art', slug: card.slug, expected: expectedArt, actual: card.statType });
  }
  if (card.statType === 'medicine' && (Number(card.baseDamage) || 0) > 0) {
    findings.push({ kind: 'medicine_damage', slug: card.slug, damage: card.baseDamage });
  }
  if (card.slug.startsWith('clan-') && !card.heldEffect) {
    findings.push({ kind: 'heritage_missing_held_effect', slug: card.slug });
  }
  if (overBudget.length || underBudget.length) {
    findings.push({
      kind: 'passive_budget',
      slug: card.slug,
      rarity: card.rarity,
      allowed: passiveBudget,
      levels,
    });
  }
  const profile = activeProfile(card);
  const roles = functionalRoles(profile);
  for (const role of roles) {
    roleCounts[card.statType][role] = (roleCounts[card.statType][role] || 0) + 1;
  }
  byArt[card.statType]?.push({
    slug: card.slug,
    rarity: card.rarity,
    cost: card.baseCost,
    profile,
    roles,
    passive: { levels, heldEffect: card.heldEffect ?? null },
  });
}

const SCENARIOS = [
  { id: 'current', chakra: BASE_CHAKRA },
  { id: 'five_unchanged', chakra: 5 },
  { id: 'five_repriced', chakra: 5, reprice: true },
  { id: 'prototype', chakra: 5 },
  { id: 'solo_live', chakra: 5, persistentHand: true, deckPassives: true },
];
const SIZES = Array.from({ length: 11 }, (_, i) => 20 + i);
const ENCOUNTERS = ['ronin_bandit', 'kurogane_scout'];
const COMPOSITIONS = ART_KEYS.flatMap((art, i) => [
  { arts: [art], split: [100], kind: 'mono' },
  ...ART_KEYS.slice(i + 1).flatMap(other =>
    [
      [25, 75],
      [50, 50],
      [75, 25],
    ].map(split => ({ arts: [art, other], split, kind: 'duo' }))
  ),
]);
const isAttack = card => card.damage > 0;

function runtimeCard(definition, level) {
  return { ...definition, ...applyUpgradeBonuses(definition, level), upgradeLevel: level };
}

function scenarioCard(card, scenario) {
  if (scenario.id === 'solo_live') return applySoloCardBalance(card);
  if (scenario.id === 'prototype') return prototypeCard(structuredClone(card));
  if (!scenario.reprice || card.statType !== 'ninjutsu' || !isAttack(card)) return card;
  return { ...card, cost: Math.max(card.cost, Math.min(5, Math.max(3, card.cost + 2))) };
}

const costCurves = {};
const soloReview = { cards: ALL_CARDS.length, levelsReviewed: 0, changedCards: 0, byArt: {} };
for (const definition of ALL_CARDS) {
  const art = (soloReview.byArt[definition.statType] ??= { reviewed: 0, changed: 0, roles: {} });
  art.reviewed++;
  let changed = false;
  const entry = byArt[definition.statType].find(card => card.slug === definition.slug);
  entry.solo = [];
  for (const level of [0, 1, 2]) {
    const card = runtimeCard(definition, level);
    const solo = applySoloCardBalance(card);
    const activeChanges = ['cost', 'damage', 'block', 'heal', 'effects'].filter(
      key => JSON.stringify(card[key]) !== JSON.stringify(solo[key])
    );
    changed ||= activeChanges.length > 0;
    soloReview.levelsReviewed++;
    if (level === 0) art.roles[solo.combatRole] = (art.roles[solo.combatRole] || 0) + 1;
    entry.solo.push({
      level,
      role: solo.combatRole,
      cost: solo.cost,
      damagePerHit: solo.damage,
      hits: solo.effects?.find(effect => effect.type === 'multi_strike')?.hits ?? 1,
      block: solo.block,
      heal: solo.heal,
      effects: solo.effects,
      activeChanges,
      appliedPassive: solo.passiveBonus,
    });
    const concerns = [];
    if (solo.cost > 5) concerns.push('requires_bonus_chakra');
    if (solo.cost === 0 && solo.damage > 0) concerns.push('free_damage');
    if (solo.statType === 'medicine' && solo.damage > 0) concerns.push('medicine_direct_damage');
    if (concerns.length) findings.push({ kind: 'solo_review', slug: solo.slug, level, concerns });
    for (const scenario of SCENARIOS) {
      const adjusted = scenarioCard(card, scenario);
      const key = `${scenario.id}/${card.statType}/${isAttack(adjusted) ? 'damage' : 'utility'}/L${level}`;
      const histogram = (costCurves[key] ??= {});
      const { cost } = adjusted;
      histogram[cost] = (histogram[cost] || 0) + 1;
    }
    const reasons = [];
    if (card.statType === 'ninjutsu' && isAttack(card)) {
      if (card.cost <= 1) reasons.push('cheap_ninjutsu_damage');
      if (level > 0 && definition.baseCost >= BASE_CHAKRA && card.cost < BASE_CHAKRA) {
        reasons.push('upgrade_frees_chakra_after_burst');
      }
    }
    if (
      card.statType === 'taijutsu' &&
      isAttack(card) &&
      card.cost >= 2 &&
      !card.effects?.some(
        effect =>
          ['multi_strike', 'combo_previous'].includes(effect.type) ||
          effect.condition === 'previous_card_stat_type'
      )
    ) {
      reasons.push('taijutsu_damage_without_chain_or_multihit');
    }
    if (reasons.length)
      findings.push({
        kind: 'chakra_review',
        slug: card.slug,
        level,
        reasons,
        effects: activeProfile(card),
        budgets: SCENARIOS.map(scenario => {
          const { cost } = scenarioCard(card, scenario);
          return { scenario: scenario.id, cost, remaining: scenario.chakra - cost };
        }),
      });
  }
  if (changed) {
    soloReview.changedCards++;
    art.changed++;
  }
}

function deckSlots({ arts, split }, size) {
  const neutrals = 2;
  const artSlots = size - neutrals;
  const slots = [['common', neutrals]];
  if (arts.length === 1) return [...slots, [arts[0], artSlots]];

  // Arrondir le quart vers le haut pour ne jamais passer sous 25 %.
  const quarter = Math.ceil((artSlots * DECK_CONSTRAINTS.minArtShare) / 100);
  const first =
    split[0] === 25 ? quarter : split[0] === 75 ? artSlots - quarter : Math.ceil(artSlots / 2);
  return [...slots, [arts[0], first], [arts[1], artSlots - first]];
}

function sampleDeck(slots, seen, rng, { diagnosticMono = false } = {}) {
  const deck = [];
  let premium = 0;
  let clan = 0;
  for (const [art, count] of slots) {
    const pool = shuffle(
      ALL_CARDS.filter(card => card.statType === art),
      rng
    ).sort((a, b) => Number(seen.has(a.slug)) - Number(seen.has(b.slug)));
    let added = 0;
    for (const card of pool) {
      if (added === count) break;
      const isPremium = ['legendary', 'mythic'].includes(card.rarity);
      const isClan = card.slug.startsWith('clan-');
      if ((isPremium && premium >= 3) || (isClan && clan >= 1)) continue;
      premium += Number(isPremium);
      clan += Number(isClan);
      deck.push({ card, quantity: 1 });
      added++;
    }
    if (added !== count) throw new Error(`Pool insuffisant : ${art} (${added}/${count})`);
  }
  const validation = validateDeck(deck);
  // Les monos isolent une voie dans le simulateur, sans relâcher les autres règles.
  const monoCompositionOnly =
    diagnosticMono &&
    Object.values(validation.artCounts).filter(count => count > 0).length === 1 &&
    validation.codes.length === 1 &&
    validation.codes[0] === 'invalid_art_count';
  if (!validation.valid && !monoCompositionOnly) throw new Error(validation.errors.join('; '));
  for (const { card } of deck) seen.add(card.slug);
  return deck;
}

const neutralProfile = { id: 'audit', label: 'Audit', level: 1, talentCodes: [], stats: {} };

function runFight(deckEntries, scenario, templateId, seed, totals) {
  const passives = scenario.deckPassives
    ? mergeStatBonuses(
        ...deckEntries.flatMap(({ card, quantity }) => Array(quantity).fill(card.passiveBonus))
      )
    : {};
  let session = createSimSession({
    profileId: neutralProfile.id,
    profileOverride: {
      ...neutralProfile,
      stats: { ...passives, maxChakra: scenario.chakra - BASE_CHAKRA + (passives.maxChakra || 0) },
    },
    persistentHand: scenario.persistentHand,
    deckEntries,
    templateId,
    seed,
  });
  const rng = session.rng;
  while (session.state === 'in_progress') {
    const turn = playGreedyPlayerTurn(session, rng, ({ chakraPaid, enemyHpLost }) => {
      totals.chakraPaid += chakraPaid;
      totals.immediateDamage += enemyHpLost;
      if (chakraPaid === 0) totals.freeCardDamage += enemyHpLost;
      if (enemyHpLost > 0) totals.damagingPlays++;
    });
    totals.cardHealing += turn.logs.reduce(
      (sum, log) => sum + (log.type === 'heal' ? log.amount : 0),
      0
    );
    session = turn.session;
    const player = session.player;
    totals.playerTurns++;
    totals.cards += player.cardsPlayedThisTurn;
    totals.taijutsu += player.taijutsuPlayedThisTurn;
    totals.ninjutsu += player.ninjutsuPlayedThisTurn;
    totals.remainingChakra += player.chakra;
    totals.emptyChakraTurns += Number(player.chakra === 0);
    totals.discardTurns += Number(turn.logs.some(log => log.type === 'discard_for_chakra'));
    if (session.state === 'in_progress') {
      const hpBefore = session.enemy.hp;
      session = simEndTurn(session, rng, 30).session;
      totals.betweenTurnHpLoss += hpBefore - Math.max(0, session.enemy.hp);
    }
  }
  totals.fights++;
  if (session.state === 'victory') {
    totals.wins++;
    totals.victoryHpFraction += session.player.hp / session.player.maxHp;
  }
  totals.timeouts += Number(Boolean(session.timeout));
}

function summarizeFights(totals) {
  const ratio = (n, d) => (d > 0 ? Number((n / d).toFixed(3)) : null);
  const perTurn = n => ratio(n, totals.playerTurns);
  return {
    fights: totals.fights,
    wins: totals.wins,
    timeouts: totals.timeouts,
    turnsPerFight: Number((totals.playerTurns / totals.fights).toFixed(3)),
    cardsPerTurn: perTurn(totals.cards),
    winRate: ratio(totals.wins, totals.fights),
    remainingHpFractionOnWin: ratio(totals.victoryHpFraction, totals.wins),
    cardHealingPerTurn: perTurn(totals.cardHealing),
    chakraPaidPerTurn: perTurn(totals.chakraPaid),
    immediateDamagePerTurn: perTurn(totals.immediateDamage),
    immediateDamagePerDamagingPlay: ratio(totals.immediateDamage, totals.damagingPlays),
    immediateDamagePerPaidChakra: ratio(totals.immediateDamage, totals.chakraPaid),
    freeCardDamagePerTurn: perTurn(totals.freeCardDamage),
    netEnemyHpLossBetweenTurnsPerTurn: perTurn(totals.betweenTurnHpLoss),
    netEnemyHpLossPerTurn: perTurn(totals.immediateDamage + totals.betweenTurnHpLoss),
    netEnemyHpLossPerPaidChakra: ratio(
      totals.immediateDamage + totals.betweenTurnHpLoss,
      totals.chakraPaid
    ),
    taijutsuPerTurn: perTurn(totals.taijutsu),
    ninjutsuPerTurn: perTurn(totals.ninjutsu),
    remainingChakraPerTurn: perTurn(totals.remainingChakra),
    emptyChakraTurnRate: perTurn(totals.emptyChakraTurns),
    discardTurnRate: perTurn(totals.discardTurns),
  };
}

function simulateDecks() {
  const rng = createSeededRng(17491);
  const coverage = {};
  const rows = [];
  const groups = {};
  const counters = () => ({
    fights: 0,
    wins: 0,
    timeouts: 0,
    playerTurns: 0,
    cards: 0,
    taijutsu: 0,
    ninjutsu: 0,
    remainingChakra: 0,
    emptyChakraTurns: 0,
    discardTurns: 0,
    chakraPaid: 0,
    immediateDamage: 0,
    freeCardDamage: 0,
    damagingPlays: 0,
    betweenTurnHpLoss: 0,
    cardHealing: 0,
    victoryHpFraction: 0,
  });
  let deckCount = 0;
  for (const size of SIZES) {
    const seen = new Set();
    for (const spec of COMPOSITIONS) {
      const { arts, split, kind } = spec;
      const composition = arts.join('+') + (kind === 'duo' ? `:${split.join('-')}` : '');
      const slots = deckSlots(spec, size);
      const decks = Array.from({ length: 5 }, () =>
        sampleDeck(slots, seen, rng, { diagnosticMono: kind === 'mono' })
      );
      deckCount += decks.length;
      for (const level of [0, 2]) {
        for (const scenario of SCENARIOS) {
          const totals = counters();
          decks.forEach((deck, index) => {
            const entries = deck.map(({ card, quantity }) => {
              const resolved = runtimeCard(card, level);
              return { quantity, card: scenarioCard(resolved, scenario) };
            });
            ENCOUNTERS.forEach(template =>
              runFight(entries, scenario, template, 9001 + index, totals)
            );
          });
          rows.push({
            size,
            composition,
            kind,
            split: Object.fromEntries(arts.map((art, i) => [art, split[i]])),
            slots: Object.fromEntries(slots),
            level,
            scenario: scenario.id,
            ...summarizeFights(totals),
          });
          const key = `${composition}/L${level}/${scenario.id}`;
          const group = (groups[key] ??= counters());
          for (const counter of Object.keys(group)) group[counter] += totals[counter];
        }
      }
    }
    coverage[size] = {
      included: seen.size,
      missing: ALL_CARDS.filter(card => !seen.has(card.slug)).map(card => card.slug),
    };
  }
  return {
    deckCount,
    coverage,
    encounters: ENCOUNTERS,
    scenarios: SCENARIOS,
    byComposition: Object.fromEntries(
      Object.entries(groups).map(([key, totals]) => [key, summarizeFights(totals)])
    ),
    rows,
  };
}

const summary = {
  total: ALL_CARDS.length,
  target: 250,
  byArt: Object.fromEntries(Object.entries(byArt).map(([key, cards]) => [key, cards.length])),
  roles: roleCounts,
  costCurves,
  soloReview,
  byRarity: ALL_CARDS.reduce((out, card) => {
    out[card.rarity] = (out[card.rarity] || 0) + 1;
    return out;
  }, {}),
  findings: findings.reduce((out, finding) => {
    out[finding.kind] = (out[finding.kind] || 0) + 1;
    if (finding.kind === 'passive_budget') {
      const key = finding.rarity;
      out.passiveByRarity = out.passiveByRarity || {};
      out.passiveByRarity[key] = (out.passiveByRarity[key] || 0) + 1;
    }
    return out;
  }, {}),
};

const compact = process.argv.includes('--summary');
const payload = compact ? { summary } : { summary, cardsByArt: byArt, findings };
if (process.argv.includes('--simulate')) {
  const { rows, ...simulation } = simulateDecks();
  payload.simulation = compact ? simulation : { ...simulation, rows };
}
console.log(JSON.stringify(payload, null, 2));
