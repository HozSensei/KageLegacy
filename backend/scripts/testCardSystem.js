/**
 * Smoke tests unitaires (sans DB) pour le système de cartes.
 */
import {
  applyUpgradeBonuses,
  serializeCardDefinition,
} from '../src/services/cardService.js';
import { validateDeck, DECK_MIN_SIZE, DECK_MAX_SIZE } from '../src/services/deckService.js';
import { ALL_CARDS, STARTER_CARDS, validateCatalog } from './seedCards.js';

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
assert(base.passiveBonus.taijutsu === 2, 'base passive taijutsu');

const plus = applyUpgradeBonuses(sampleDef, 1);
assert(plus.damage === 9, 'level1 damage');
assert(plus.passiveBonus.taijutsu === 3, 'level1 passive');

const plusPlus = applyUpgradeBonuses(sampleDef, 2);
assert(plusPlus.damage === 12, 'level2 damage');
assert(plusPlus.cost === 0, 'level2 cost');
assert(plusPlus.passiveBonus.taijutsu === 4, 'level2 passive taijutsu');
assert(plusPlus.passiveBonus.vitesse === 2, 'level2 passive vitesse');

const serialized = serializeCardDefinition(sampleDef, { upgradeLevel: 1 });
assert(serialized.nameFr === 'Poing rapide+', 'name suffix +');
assert(serialized.passiveBonus.taijutsu === 3, 'serialized passive');

const tooSmall = validateDeck(Array.from({ length: 5 }, (_, i) => ({ quantity: 1, collectionId: i })));
assert(!tooSmall.valid && tooSmall.size === 5, 'reject small deck');

const okCards = Array.from({ length: DECK_MIN_SIZE }, (_, i) => ({
  quantity: 1,
  collectionId: i,
  card: { nameFr: `C${i}` },
}));
const ok = validateDeck(okCards);
assert(ok.valid && ok.size === DECK_MIN_SIZE, 'accept min deck');

const tooBig = validateDeck(
  Array.from({ length: DECK_MAX_SIZE + 1 }, (_, i) => ({ quantity: 1, collectionId: i }))
);
assert(!tooBig.valid, 'reject oversized deck');

const overCopies = validateDeck([{ quantity: 4, collectionId: 1, card: { nameFr: 'X' } }]);
assert(!overCopies.valid, 'reject over copies');

// Catalogue seed (~200 cartes, structure scalable vers 300)
assert(STARTER_CARDS.length === 22, `starters should be 22, got ${STARTER_CARDS.length}`);
assert(ALL_CARDS.length >= 190 && ALL_CARDS.length <= 220, `catalog ~200, got ${ALL_CARDS.length}`);
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
for (const card of ALL_CARDS) {
  assert(Object.keys(card.passiveBonus || {}).length > 0, `passive on ${card.slug}`);
}

console.log('✅ testCardSystem passed', `(catalog ${catalog.total})`);
console.log('   types  ', catalog.byType);
console.log('   rarity ', catalog.byRarity);
console.log('   element', catalog.byElement);
