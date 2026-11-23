/**
 * Smoke tests unitaires (sans DB) pour le système de cartes.
 */
import { deepEqual } from 'node:assert/strict';
import { applyUpgradeBonuses, serializeCardDefinition } from '../src/services/cardService.js';
import {
  validateDeck,
  isClanCard,
  createEmptyPassiveStats,
  DECK_CONSTRAINTS,
  DECK_MIN_SIZE,
  DECK_MAX_SIZE,
  MAX_CLAN_CARDS,
  MAX_LEGENDARY_OR_MYTHIC,
} from '../src/services/deckService.js';
import { ALL_CARDS, STARTER_CARDS, validateCatalog } from './seedCards.js';
import { CLAN_LEGENDARY_CARDS } from './data/cardExpansionClans.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sampleDef = {
  id: 1,
  slug: 'poing-rapide',
  name_fr: 'Poing rapide',
  name_en: 'Swift Fist',
  type: 'attack',
  stat_type: 'taijutsu',
  element: null,
  rarity: 'common',
  base_cost: 1,
  base_damage: 6,
  base_block: 0,
  base_heal: 0,
  effects_json: '[]',
  summon_json: null,
  exhaust: 0,
  passive_bonus_json: JSON.stringify({ taijutsu: 2, vitesse: 1 }),
  passive_description_fr: '+2 Taijutsu',
  passive_description_en: '+2 Taijutsu',
  description_fr: '6 dégâts',
  description_en: '6 damage',
  lore_fr: null,
  lore_en: null,
  upgradable: 1,
  upgrade_bonuses_json: JSON.stringify({
    level_1: { damage: 3, passive: { taijutsu: 1 } },
    level_2: { damage: 6, cost: -1, passive: { taijutsu: 2, vitesse: 1 } },
  }),
  image_url: null,
  artist: 'Generated',
  season_introduced: null,
  is_exclusive: 0,
  created_at: new Date(),
};

const base = applyUpgradeBonuses(sampleDef, 0);
assert(base.damage === 6, 'base damage');
assert(base.passiveBonus.taijutsu === 3, 'base passive taijutsu (vitesse→tai)');
assert(base.critChance === 10, 'base crit from vitesse passive');

const plus = applyUpgradeBonuses(sampleDef, 1);
assert(plus.damage === 9, 'level1 damage');
assert(plus.passiveBonus.taijutsu === 4, 'level1 passive');

const plusPlus = applyUpgradeBonuses(sampleDef, 2);
assert(plusPlus.damage === 12, 'level2 damage');
assert(plusPlus.cost === 0, 'level2 cost');
assert(plusPlus.passiveBonus.taijutsu === 6, 'level2 passive taijutsu (vitesse→tai)');
assert(plusPlus.passiveBonus.vitesse == null, 'level2 no vitesse key');
assert(plusPlus.critChance === 10, 'level2 crit from historic vitesse passive');

const serialized = serializeCardDefinition(sampleDef, { upgradeLevel: 1 });
assert(serialized.nameFr === 'Poing rapide+', 'name suffix +');
assert(serialized.passiveBonus.taijutsu === 4, 'serialized passive');

const characterBonuses = applyUpgradeBonuses({
  ...sampleDef,
  passive_bonus_json: JSON.stringify({
    maxHp: 5,
    maxChakra: 2,
    startingBlock: 3,
    dexterity: 8,
    force: 4,
  }),
});
assert(characterBonuses.passiveBonus.maxHp === 5, 'max HP passive survives normalization');
assert(characterBonuses.passiveBonus.maxChakra === 2, 'max Chakra passive survives normalization');
assert(
  characterBonuses.passiveBonus.startingBlock === 3,
  'starting Armor passive survives normalization',
);
assert(
  !characterBonuses.passiveBonus.dexterity && !characterBonuses.passiveBonus.force,
  'obsolete passives are discarded',
);
assert(
  ['maxHp', 'maxChakra', 'startingBlock'].every(key =>
    Object.hasOwn(createEmptyPassiveStats(), key),
  ),
  'deck aggregation accepts character bonuses',
);

const tooSmall = validateDeck(
  Array.from({ length: 5 }, (_, i) => ({ quantity: 1, collectionId: i })),
);
assert(!tooSmall.valid && tooSmall.size === 5, 'reject small deck');

const okCards = [
  ...Array.from({ length: 15 }, (_, i) => ({
    quantity: 1,
    collectionId: i,
    card: { nameFr: `T${i}`, statType: 'taijutsu' },
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    quantity: 1,
    collectionId: 15 + i,
    card: { nameFr: `N${i}`, statType: 'ninjutsu' },
  })),
];
const ok = validateDeck(okCards);
assert(ok.valid && ok.size === DECK_MIN_SIZE, 'accept min deck');
assert(
  DECK_CONSTRAINTS.minPrimaryArtCards === 15 && DECK_CONSTRAINTS.minSecondaryArtCards === 5,
  'public art constraints',
);

function validateComposition({ taijutsu = 0, ninjutsu = 0, genjutsu = 0, medicine = 0, common }) {
  const arts = { taijutsu, ninjutsu, genjutsu, medicine };
  arts.common = common ?? DECK_MIN_SIZE - Object.values(arts).reduce((sum, qty) => sum + qty, 0);
  return validateDeck(
    Object.entries(arts).flatMap(([statType, count]) =>
      Array.from({ length: Math.ceil(count / 3) }, (_, i) => ({
        quantity: Math.min(3, count - i * 3),
        ...(statType === 'ninjutsu'
          ? { stat_type: statType, rarity: 'common' }
          : {
              card: { statType, rarity: 'common' },
            }),
      })),
    ),
  );
}

const exactQuota = validateComposition({ taijutsu: 15, ninjutsu: 5, common: 10 });
assert(exactQuota.valid && exactQuota.size === 30, '15/5 plus 10 neutrals is valid');
deepEqual(exactQuota.artCounts, { taijutsu: 15, ninjutsu: 5, genjutsu: 0, medicine: 0 });
assert(
  exactQuota.nonNeutralCount === 20 &&
    exactQuota.minPrimaryArtCards === 15 &&
    exactQuota.minSecondaryArtCards === 5 &&
    exactQuota.primaryArt === 'taijutsu' &&
    exactQuota.secondaryArt === 'ninjutsu',
  'count quantities by primary art only',
);

const thirdArt = validateComposition({ taijutsu: 15, ninjutsu: 5, genjutsu: 1, common: 0 });
assert(thirdArt.valid && thirdArt.size === 21, '15/5/1 splash is valid');
deepEqual(thirdArt.codes, []);

const underPrimary = validateComposition({ taijutsu: 14, ninjutsu: 5, genjutsu: 1 });
assert(!underPrimary.valid && underPrimary.size === 20, '14/5/1 fails the primary floor');
deepEqual(underPrimary.codes, ['insufficient_primary_art']);
assert(
  underPrimary.errors[0].includes('14/15'),
  `primary error mentions 14/15: ${underPrimary.errors[0]}`,
);

const underSecondary = validateComposition({ taijutsu: 16, ninjutsu: 4 });
assert(!underSecondary.valid, '16/4 fails the secondary floor');
deepEqual(underSecondary.codes, ['insufficient_secondary_art']);
deepEqual(underSecondary.errors, [
  'Deuxième voie insuffisante : Ninjutsu 4/5 (il faut au moins 5 cartes d\'une autre voie).',
]);
deepEqual(underSecondary.errorsEn, [
  'Secondary path too low: Ninjutsu 4/5 (need at least 5 cards of a second path).',
]);

for (const composition of [
  { taijutsu: 10 },
  { taijutsu: 5, ninjutsu: 4, genjutsu: 3 },
  { taijutsu: 3, ninjutsu: 3, genjutsu: 3, medicine: 3 },
  {},
]) {
  const codes = validateComposition(composition).codes;
  assert(
    codes.includes('insufficient_primary_art') || codes.includes('insufficient_secondary_art'),
    `rejects weak spread: ${JSON.stringify(composition)} → ${codes}`,
  );
}
const mostlyNeutral = validateComposition({ taijutsu: 1, ninjutsu: 1 });
assert(
  !mostlyNeutral.valid && mostlyNeutral.nonNeutralCount === 2,
  'mostly-neutral decks fail the 15+5 floors',
);

const tooBig = validateDeck(
  Array.from({ length: DECK_MAX_SIZE + 1 }, (_, i) => ({ quantity: 1, collectionId: i })),
);
assert(!tooBig.valid, 'reject oversized deck');

const overCopies = validateDeck([{ quantity: 4, collectionId: 1, card: { nameFr: 'X' } }]);
assert(!overCopies.valid, 'reject over copies');

assert(isClanCard({ slug: 'clan-shizumori', rarity: 'legendary' }), 'clan slug detected');
assert(isClanCard({ card: { slug: 'clan-benigiri' } }), 'nested clan slug detected');
assert(isClanCard({ tags: ['clan'], rarity: 'legendary' }), 'clan tag detected');
assert(!isClanCard({ slug: 'nin-chidori', rarity: 'legendary' }), 'non-clan legendary');

// 15 Tai + 3 Nin = 18 ; les tests rareté y ajoutent 2 cartes (total 20).
const baseCommons = [
  ...Array.from({ length: 15 }, (_, i) => ({
    quantity: 1,
    collectionId: i,
    card: {
      slug: `tai-${i}`,
      rarity: 'common',
      statType: 'taijutsu',
      nameFr: `T${i}`,
      nameEn: `T${i}`,
    },
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    quantity: 1,
    collectionId: 100 + i,
    card: {
      slug: `nin-${i}`,
      rarity: 'common',
      statType: 'ninjutsu',
      nameFr: `N${i}`,
      nameEn: `N${i}`,
    },
  })),
];

const twoClans = validateDeck([
  ...baseCommons,
  {
    quantity: 1,
    collectionId: 900,
    card: {
      slug: 'clan-shizumori',
      rarity: 'legendary',
      statType: 'ninjutsu',
      nameFr: 'A',
      nameEn: 'A',
    },
  },
  {
    quantity: 1,
    collectionId: 901,
    card: {
      slug: 'clan-benigiri',
      rarity: 'legendary',
      statType: 'ninjutsu',
      nameFr: 'B',
      nameEn: 'B',
    },
  },
]);
assert(!twoClans.valid, 'reject two clan cards');
assert(twoClans.codes.includes('too_many_clan'), 'clan code');
assert(
  twoClans.errors.some(e => e.includes(`Maximum ${MAX_CLAN_CARDS} carte de clan`)),
  'clan FR',
);
assert(
  twoClans.errorsEn.some(e => e.includes(`Max ${MAX_CLAN_CARDS} clan card`)),
  'clan EN',
);

const fourLegendaries = validateDeck([
  ...baseCommons.slice(0, 16), // 15 tai + 1 nin
  { quantity: 1, collectionId: 910, card: { slug: 'leg-1', rarity: 'legendary', statType: 'ninjutsu' } },
  { quantity: 1, collectionId: 911, card: { slug: 'leg-2', rarity: 'legendary', statType: 'ninjutsu' } },
  { quantity: 1, collectionId: 912, card: { slug: 'leg-3', rarity: 'mythic', statType: 'ninjutsu' } },
  { quantity: 1, collectionId: 913, card: { slug: 'leg-4', rarity: 'legendary', statType: 'ninjutsu' } },
]);
assert(!fourLegendaries.valid, 'reject 4 legendary/mythic');
assert(fourLegendaries.codes.includes('too_many_legendary'), 'legendary code');
assert(
  fourLegendaries.errors.some(e =>
    e.includes(`Maximum ${MAX_LEGENDARY_OR_MYTHIC} cartes légendaires ou mythiques`),
  ),
  'legendary FR',
);
assert(
  fourLegendaries.errorsEn.some(e =>
    e.includes(`Max ${MAX_LEGENDARY_OR_MYTHIC} legendary or mythic`),
  ),
  'legendary EN',
);

const oneClanTwoLegs = validateDeck([
  ...baseCommons, // 15 tai + 3 nin
  {
    quantity: 1,
    collectionId: 920,
    card: { slug: 'clan-kazamine', rarity: 'legendary' }, // neutre
  },
  {
    quantity: 1,
    collectionId: 921,
    card: { slug: 'leg-a', rarity: 'legendary', statType: 'ninjutsu' },
  },
  {
    quantity: 1,
    collectionId: 922,
    card: { slug: 'myth-a', rarity: 'mythic', statType: 'ninjutsu' },
  },
]);
assert(oneClanTwoLegs.valid, 'accept 1 clan + 2 other legendary/mythic');
assert(oneClanTwoLegs.clanCount === 1, 'clan count 1');
assert(oneClanTwoLegs.legendaryOrMythicCount === 3, 'legendary count includes clan');
assert(oneClanTwoLegs.size === 21, 'clan+legs deck size 21');
assert(
  oneClanTwoLegs.primaryCount === 15 && oneClanTwoLegs.secondaryCount === 5,
  'clan+legs still meets 15+5',
);

// Catalogue seed : palier 282 cartes (250 + vague 4)
assert(STARTER_CARDS.length === 22, `starters should be 22, got ${STARTER_CARDS.length}`);
assert(ALL_CARDS.length === 282, `catalog target 282, got ${ALL_CARDS.length}`);
const chainCards = ALL_CARDS.filter(card =>
  (card.effects || []).some(effect => effect.type === 'combo_previous'),
);
assert(chainCards.length === 80, `80 chain cards expected, got ${chainCards.length}`);
for (const art of ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']) {
  assert(
    chainCards.filter(card => card.statType === art).length === 20,
    `20 ${art} chain cards expected`,
  );
}
for (const card of chainCards) {
  const chainEffects = card.effects.filter(effect => effect.type === 'combo_previous');
  assert(
    chainEffects.every(effect => effect.statType !== 'common'),
    `chain art on ${card.slug}`,
  );
  assert(
    chainEffects.every(effect =>
      ['damage', 'heal', 'block', 'statusValue', 'draw', 'chakra', 'costReduction'].some(
        key => Number(effect[key]) > 0,
      ),
    ),
    `chain reward on ${card.slug}`,
  );
}
const catalog = validateCatalog(ALL_CARDS);
assert(catalog.byType.attack >= 70, 'enough attacks');
assert(catalog.byType.defense >= 35, 'enough defenses');
assert(catalog.byType.skill >= 35, 'enough skills');
assert(catalog.byType.item >= 20, 'enough items');
assert(catalog.byType.summon >= 14, 'enough summons');
assert(catalog.byRarity.common >= 100, 'enough commons');
assert(catalog.byRarity.rare >= 50, 'enough rares');
assert(catalog.byRarity.legendary >= 20, 'enough legendaries');
assert((catalog.byRarity.mythic || 0) >= 5, 'some mythics');
for (const el of ['katon', 'suiton', 'raiton', 'doton', 'futon', 'null']) {
  assert((catalog.byElement[el] || 0) >= 10, `element ${el} under-represented`);
}
const STAT_KEYS = new Set([
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'maxHp',
  'maxChakra',
  'startingBlock',
]);
for (const card of ALL_CARDS) {
  for (const key of Object.keys(card.passiveBonus || {})) {
    assert(STAT_KEYS.has(key), `valid passive ${key} on ${card.slug}`);
  }
}

const catalogBySlug = new Map(ALL_CARDS.map(card => [card.slug, card]));
for (const [slug, statType, damage, draw] of [
  ['frappe-de-pause', 'taijutsu', 2, 0],
  ['relecture-tactique', 'genjutsu', 0, 1],
]) {
  const card = catalogBySlug.get(slug);
  const combo = card.effects.find(effect => effect.type === 'combo_previous');
  assert(
    JSON.stringify(combo) ===
      JSON.stringify({ type: 'combo_previous', statType, damage, draw, chakra: 0 }),
    `combo payload ${slug}`,
  );
  assert(card.rarity === 'common' && card.baseCost === 0, `combo rarity and cost ${slug}`);
}
const emberEdge = catalogBySlug.get('lame-de-braise');
assert(
  emberEdge.baseDamage === 8 &&
    emberEdge.effects.some(
      effect =>
        effect.type === 'apply_status' &&
        effect.status === 'burn' &&
        effect.duration === 2 &&
        effect.value == null,
    ),
  'ember edge burn tradeoff',
);
const sleepBlade = catalogBySlug.get('lame-du-sommeil');
assert(
  sleepBlade.effects.some(
    effect =>
      effect.type === 'bonus_if' && effect.condition === 'enemy_vulnerable' && effect.value === 4,
  ),
  'sleep blade illusion payoff',
);
for (const slug of ['lame-de-braise', 'lame-du-sommeil', 'frappe-de-pause', 'relecture-tactique']) {
  const card = catalogBySlug.get(slug);
  assert(card.upgradeBonuses.level_1 && card.upgradeBonuses.level_2, `upgrades present ${slug}`);
  assert(card.descriptionFr && card.descriptionEn, `bilingual descriptions ${slug}`);
}

// Clans = cartes légendaires à gros passifs de deck (pas un choix à la création).
assert(CLAN_LEGENDARY_CARDS.length >= 3, 'at least 3 clan legendary cards');

for (const card of CLAN_LEGENDARY_CARDS) {
  assert(card.slug.startsWith('clan-'), `clan slug prefix: ${card.slug}`);
  assert(card.rarity === 'legendary', `clan rarity: ${card.slug}`);
  assert(card.heldEffect?.type, `clan held effect: ${card.slug}`);
  const passiveSum = Object.entries(card.passiveBonus || {}).reduce((s, [k, v]) => {
    assert(STAT_KEYS.has(k), `clan passive key ${k} on ${card.slug} not aggregatable`);
    return s + Number(v);
  }, 0);
  assert(passiveSum >= 12, `clan ${card.slug} needs large deck passive (sum=${passiveSum})`);
  assert(
    ALL_CARDS.some(c => c.slug === card.slug),
    `clan ${card.slug} in ALL_CARDS`,
  );
}

const harmoni = ALL_CARDS.find(c => c.slug === 'harmonie-des-cinq-vents');
assert(harmoni?.statType === 'ninjutsu', 'harmonie primary is ninjutsu');
assert(harmoni?.statTypeSecondary == null, 'harmonie has no secondary art');
assert(!Object.keys(harmoni.passiveBonus || {}).includes('vitesse'), 'harmonie no vitesse passive');
assert(
  !Object.keys(harmoni.passiveBonus || {}).includes('intelligence'),
  'harmonie no intelligence passive',
);

const rarityPassiveBudgets = {
  common: [0, 5],
  rare: [5, 10],
  legendary: [10, 15],
  mythic: [15, 20],
};
for (const card of ALL_CARDS) {
  for (const key of Object.keys(card.passiveBonus || {})) {
    assert(STAT_KEYS.has(key), `catalog passive ${key} on ${card.slug} must be combat art`);
  }
  const requiresCommon = ['item', 'summon'].includes(card.type) || card.slug.startsWith('clan-');
  assert(
    !requiresCommon || card.statType === 'common',
    `${card.slug} must use the common scaling route`,
  );
  const [min, max] = rarityPassiveBudgets[card.rarity];
  for (const level of [0, 1, 2]) {
    const passive = { ...(card.passiveBonus || {}) };
    if (level > 0) {
      for (const [key, value] of Object.entries(
        card.upgradeBonuses?.[`level_${level}`]?.passive || {},
      )) {
        passive[key] = (Number(passive[key]) || 0) + (Number(value) || 0);
      }
    }
    const total = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'].reduce(
      (sum, key) => sum + Number(passive[key] || 0),
      0,
    );
    assert(
      total >= min && total <= max,
      `${card.slug} passive L${level} outside ${min}-${max}: ${total}`,
    );
  }
}

console.log('✅ testCardSystem passed', `(catalog ${catalog.total})`);
console.log('   types  ', catalog.byType);
console.log('   rarity ', catalog.byRarity);
console.log('   element', catalog.byElement);
