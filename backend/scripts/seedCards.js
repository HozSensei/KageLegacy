/**
 * Seed catalogue de cartes (noms ORIGINAUX — pas de refs franchise).
 * Usage: npm run db:seed-cards  (depuis backend/)
 *        node scripts/seedCards.js
 *
 * Idempotent : upsertCardDefinition met à jour si le slug existe déjà.
 */
import { upsertCardDefinition } from '../src/services/cardService.js';
import { EXPANSION_CARDS } from './data/cardExpansion.js';
import {
  assertOriginalNaming,
  assertUniqueSlugs,
  summarizeCatalog,
} from './lib/cardFactory.js';

/** Cartes de départ historiques (conservées telles quelles). */
const STARTER_CARDS = [
  {
    slug: 'poing-rapide',
    nameFr: 'Poing rapide',
    nameEn: 'Swift Fist',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    baseCost: 1,
    baseDamage: 6,
    effects: [],
    passiveBonus: { taijutsu: 2, vitesse: 1 },
    passiveDescriptionFr: 'Bonus passif : +2 Taijutsu, +1 Vitesse',
    passiveDescriptionEn: 'Passive: +2 Taijutsu, +1 Speed',
    descriptionFr: 'Inflige 6 dégâts.',
    descriptionEn: 'Deal 6 damage.',
    loreFr: 'La première frappe enseignée dans chaque dojo de frontière.',
    loreEn: 'The first strike taught in every border dojo.',
    upgradeBonuses: {
      level_1: { damage: 3, passive: { taijutsu: 1 } },
      level_2: { damage: 6, cost: -1, passive: { taijutsu: 2, vitesse: 1 } },
    },
  },
  {
    slug: 'poing-du-dragon',
    nameFr: 'Poing du dragon',
    nameEn: 'Dragon Fist',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'rare',
    baseCost: 2,
    baseDamage: 12,
    effects: [],
    passiveBonus: { taijutsu: 3, vitesse: 1 },
    passiveDescriptionFr: 'Bonus passif : +3 Taijutsu, +1 Vitesse',
    passiveDescriptionEn: 'Passive: +3 Taijutsu, +1 Speed',
    descriptionFr: 'Inflige 12 dégâts.',
    descriptionEn: 'Deal 12 damage.',
    loreFr: 'Une technique ancestrale des maîtres de taijutsu.',
    loreEn: 'An ancestral technique of taijutsu masters.',
    upgradeBonuses: {
      level_1: { damage: 4, passive: { taijutsu: 2, vitesse: 1 } },
      level_2: { damage: 8, cost: -1, passive: { taijutsu: 4, vitesse: 2 } },
    },
  },
  {
    slug: 'barrage-de-lames',
    nameFr: 'Barrage de lames',
    nameEn: 'Blade Barrage',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    baseCost: 2,
    baseDamage: 4,
    effects: [{ type: 'multi_strike', hits: 3 }],
    passiveBonus: { dexterity: 2 },
    passiveDescriptionFr: 'Bonus passif : +2 Dextérité',
    passiveDescriptionEn: 'Passive: +2 Dexterity',
    descriptionFr: 'Inflige 4 dégâts, trois fois.',
    descriptionEn: 'Deal 4 damage, three times.',
    upgradeBonuses: {
      level_1: { damage: 1, passive: { dexterity: 1 } },
      level_2: { damage: 2, passive: { dexterity: 2, vitesse: 1 } },
    },
  },
  {
    slug: 'souffle-ardent',
    nameFr: 'Souffle ardent',
    nameEn: 'Ember Breath',
    type: 'attack',
    statType: 'ninjutsu',
    element: 'katon',
    rarity: 'rare',
    baseCost: 2,
    baseDamage: 10,
    effects: [{ type: 'apply_status', status: 'burn', value: 2 }],
    passiveBonus: { ninjutsu: 3 },
    passiveDescriptionFr: 'Bonus passif : +3 Ninjutsu',
    passiveDescriptionEn: 'Passive: +3 Ninjutsu',
    descriptionFr: 'Inflige 10 dégâts et Brûlure 2.',
    descriptionEn: 'Deal 10 damage and Burn 2.',
    upgradeBonuses: {
      level_1: { damage: 4, passive: { ninjutsu: 1 } },
      level_2: { damage: 8, passive: { ninjutsu: 3 } },
    },
  },
  {
    slug: 'lance-de-foudre',
    nameFr: 'Lance de foudre',
    nameEn: 'Thunder Lance',
    type: 'attack',
    statType: 'ninjutsu',
    element: 'raiton',
    rarity: 'legendary',
    baseCost: 3,
    baseDamage: 18,
    effects: [{ type: 'apply_status', status: 'vulnerable', value: 1 }],
    passiveBonus: { ninjutsu: 4, vitesse: 2 },
    passiveDescriptionFr: 'Bonus passif : +4 Ninjutsu, +2 Vitesse',
    passiveDescriptionEn: 'Passive: +4 Ninjutsu, +2 Speed',
    descriptionFr: 'Inflige 18 dégâts. Applique Vulnérable.',
    descriptionEn: 'Deal 18 damage. Apply Vulnerable.',
    upgradeBonuses: {
      level_1: { damage: 6, passive: { ninjutsu: 2 } },
      level_2: { damage: 10, cost: -1, passive: { ninjutsu: 3, vitesse: 1 } },
    },
  },
  {
    slug: 'vague-brumeuse',
    nameFr: 'Vague brumeuse',
    nameEn: 'Mist Wave',
    type: 'attack',
    statType: 'ninjutsu',
    element: 'suiton',
    rarity: 'common',
    baseCost: 1,
    baseDamage: 5,
    effects: [{ type: 'draw', value: 1 }],
    passiveBonus: { ninjutsu: 1, intelligence: 1 },
    passiveDescriptionFr: 'Bonus passif : +1 Ninjutsu, +1 Intelligence',
    passiveDescriptionEn: 'Passive: +1 Ninjutsu, +1 Intelligence',
    descriptionFr: 'Inflige 5 dégâts. Piochez 1 carte.',
    descriptionEn: 'Deal 5 damage. Draw 1 card.',
    upgradeBonuses: {
      level_1: { damage: 3, passive: { intelligence: 1 } },
      level_2: { damage: 5, passive: { ninjutsu: 2, intelligence: 1 } },
    },
  },
  {
    slug: 'garde-haute',
    nameFr: 'Garde haute',
    nameEn: 'High Guard',
    type: 'defense',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    baseCost: 1,
    baseBlock: 8,
    effects: [],
    passiveBonus: { taijutsu: 1, maxHp: 2 },
    passiveDescriptionFr: 'Bonus passif : +1 Taijutsu, +2 PV max',
    passiveDescriptionEn: 'Passive: +1 Taijutsu, +2 max HP',
    descriptionFr: 'Gagne 8 d’armure.',
    descriptionEn: 'Gain 8 block.',
    upgradeBonuses: {
      level_1: { block: 4, passive: { maxHp: 2 } },
      level_2: { block: 8, passive: { taijutsu: 1, maxHp: 4 } },
    },
  },
  {
    slug: 'mur-de-pierre',
    nameFr: 'Mur de pierre',
    nameEn: 'Stone Wall',
    type: 'defense',
    statType: 'ninjutsu',
    element: 'doton',
    rarity: 'rare',
    baseCost: 2,
    baseBlock: 14,
    effects: [],
    passiveBonus: { maxHp: 5 },
    passiveDescriptionFr: 'Bonus passif : +5 PV max',
    passiveDescriptionEn: 'Passive: +5 max HP',
    descriptionFr: 'Gagne 14 d’armure.',
    descriptionEn: 'Gain 14 block.',
    upgradeBonuses: {
      level_1: { block: 6, passive: { maxHp: 3 } },
      level_2: { block: 10, cost: -1, passive: { maxHp: 5 } },
    },
  },
  {
    slug: 'voile-d-ombre',
    nameFr: 'Voile d’ombre',
    nameEn: 'Shadow Veil',
    type: 'defense',
    statType: 'genjutsu',
    element: null,
    rarity: 'rare',
    baseCost: 1,
    baseBlock: 5,
    effects: [{ type: 'evade_next', chance: 0.5 }],
    passiveBonus: { genjutsu: 2, dexterity: 1 },
    passiveDescriptionFr: 'Bonus passif : +2 Genjutsu, +1 Dextérité',
    passiveDescriptionEn: 'Passive: +2 Genjutsu, +1 Dexterity',
    descriptionFr: 'Gagne 5 d’armure. 50% d’esquiver la prochaine attaque.',
    descriptionEn: 'Gain 5 block. 50% chance to evade the next attack.',
    upgradeBonuses: {
      level_1: { block: 3, passive: { genjutsu: 1 } },
      level_2: { block: 5, passive: { genjutsu: 2, dexterity: 1 } },
    },
  },
  {
    slug: 'contre-tranchant',
    nameFr: 'Contre tranchant',
    nameEn: 'Cutting Counter',
    type: 'defense',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    baseCost: 2,
    baseBlock: 10,
    effects: [{ type: 'counter', damage: 6 }],
    passiveBonus: { taijutsu: 1, dexterity: 1 },
    passiveDescriptionFr: 'Bonus passif : +1 Taijutsu, +1 Dextérité',
    passiveDescriptionEn: 'Passive: +1 Taijutsu, +1 Dexterity',
    descriptionFr: 'Gagne 10 d’armure. Renvoie 6 dégâts.',
    descriptionEn: 'Gain 10 block. Reflect 6 damage.',
    upgradeBonuses: {
      level_1: { block: 4, passive: { dexterity: 1 } },
      level_2: { block: 6, passive: { taijutsu: 2, dexterity: 1 } },
    },
  },
  {
    slug: 'paume-apaisante',
    nameFr: 'Paume apaisante',
    nameEn: 'Soothing Palm',
    type: 'skill',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    baseCost: 2,
    baseHeal: 12,
    effects: [],
    passiveBonus: { medicine: 3 },
    passiveDescriptionFr: 'Bonus passif : +3 Médecine',
    passiveDescriptionEn: 'Passive: +3 Medicine',
    descriptionFr: 'Restaure 12 PV.',
    descriptionEn: 'Restore 12 HP.',
    upgradeBonuses: {
      level_1: { heal: 5, passive: { medicine: 1 } },
      level_2: { heal: 8, cost: -1, passive: { medicine: 3 } },
    },
  },
  {
    slug: 'concentration',
    nameFr: 'Concentration',
    nameEn: 'Focus',
    type: 'skill',
    statType: 'genjutsu',
    element: null,
    rarity: 'common',
    baseCost: 0,
    effects: [{ type: 'draw', value: 2 }],
    passiveBonus: { intelligence: 2 },
    passiveDescriptionFr: 'Bonus passif : +2 Intelligence',
    passiveDescriptionEn: 'Passive: +2 Intelligence',
    descriptionFr: 'Piochez 2 cartes.',
    descriptionEn: 'Draw 2 cards.',
    upgradeBonuses: {
      level_1: { passive: { intelligence: 1 } },
      level_2: { passive: { intelligence: 2, genjutsu: 1 } },
    },
  },
  {
    slug: 'mirage-persistant',
    nameFr: 'Mirage persistant',
    nameEn: 'Lingering Mirage',
    type: 'skill',
    statType: 'genjutsu',
    element: null,
    rarity: 'rare',
    baseCost: 1,
    effects: [{ type: 'apply_status', target: 'enemy', status: 'weak', value: 2, duration: 2 }],
    passiveBonus: { genjutsu: 3 },
    passiveDescriptionFr: 'Bonus passif : +3 Genjutsu',
    passiveDescriptionEn: 'Passive: +3 Genjutsu',
    descriptionFr: 'Applique Faiblesse 2 pendant 2 tours.',
    descriptionEn: 'Apply Weak 2 for 2 turns.',
    upgradeBonuses: {
      level_1: { passive: { genjutsu: 2 } },
      level_2: { cost: -1, passive: { genjutsu: 3, intelligence: 1 } },
    },
  },
  {
    slug: 'vent-porteur',
    nameFr: 'Vent porteur',
    nameEn: 'Tailwind',
    type: 'skill',
    statType: 'ninjutsu',
    element: 'futon',
    rarity: 'common',
    baseCost: 1,
    effects: [{ type: 'apply_status', target: 'self', status: 'dexterity', value: 2, duration: 3 }],
    passiveBonus: { vitesse: 2 },
    passiveDescriptionFr: 'Bonus passif : +2 Vitesse',
    passiveDescriptionEn: 'Passive: +2 Speed',
    descriptionFr: '+2 Dextérité pendant 3 tours.',
    descriptionEn: '+2 Dexterity for 3 turns.',
    upgradeBonuses: {
      level_1: { passive: { vitesse: 1 } },
      level_2: { passive: { vitesse: 2, dexterity: 1 } },
    },
  },
  {
    slug: 'kunai-de-fer',
    nameFr: 'Kunai de fer',
    nameEn: 'Iron Kunai',
    type: 'item',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    baseCost: 0,
    baseDamage: 4,
    exhaust: true,
    effects: [],
    passiveBonus: { dexterity: 2 },
    passiveDescriptionFr: 'Bonus passif : +2 Dextérité',
    passiveDescriptionEn: 'Passive: +2 Dexterity',
    descriptionFr: 'Inflige 4 dégâts. Exhaust.',
    descriptionEn: 'Deal 4 damage. Exhaust.',
    upgradeBonuses: {
      level_1: { damage: 2, passive: { dexterity: 1 } },
      level_2: { damage: 4, passive: { dexterity: 2 } },
    },
  },
  {
    slug: 'pilule-du-soldat',
    nameFr: 'Pilule du soldat',
    nameEn: 'Soldier Pill',
    type: 'item',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    baseCost: 1,
    exhaust: true,
    effects: [{ type: 'apply_status', status: 'force', value: 3, duration: 3 }],
    passiveBonus: { taijutsu: 1, vitesse: 1 },
    passiveDescriptionFr: 'Bonus passif : +1 Taijutsu, +1 Vitesse',
    passiveDescriptionEn: 'Passive: +1 Taijutsu, +1 Speed',
    descriptionFr: '+3 Force pendant 3 tours. Exhaust.',
    descriptionEn: '+3 Strength for 3 turns. Exhaust.',
    upgradeBonuses: {
      level_1: { passive: { taijutsu: 1 } },
      level_2: { passive: { taijutsu: 1, vitesse: 1 } },
    },
  },
  {
    slug: 'parchemin-de-scellement',
    nameFr: 'Parchemin de scellement',
    nameEn: 'Sealing Scroll',
    type: 'item',
    statType: 'ninjutsu',
    element: null,
    rarity: 'rare',
    baseCost: 2,
    exhaust: true,
    effects: [{ type: 'exile_enemy_card' }],
    passiveBonus: { intelligence: 3 },
    passiveDescriptionFr: 'Bonus passif : +3 Intelligence',
    passiveDescriptionEn: 'Passive: +3 Intelligence',
    descriptionFr: 'Exile une carte adverse. Exhaust.',
    descriptionEn: 'Exile an enemy card. Exhaust.',
    upgradeBonuses: {
      level_1: { cost: -1, passive: { intelligence: 1 } },
      level_2: { passive: { intelligence: 3 } },
    },
  },
  {
    slug: 'ampoule-de-chakra',
    nameFr: 'Ampoule de chakra',
    nameEn: 'Chakra Vial',
    type: 'item',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    baseCost: 0,
    exhaust: true,
    effects: [{ type: 'gain_energy', value: 2 }],
    passiveBonus: { medicine: 1, intelligence: 1 },
    passiveDescriptionFr: 'Bonus passif : +1 Médecine, +1 Intelligence',
    passiveDescriptionEn: 'Passive: +1 Medicine, +1 Intelligence',
    descriptionFr: 'Gagne 2 Chakra. Exhaust.',
    descriptionEn: 'Gain 2 Chakra. Exhaust.',
    upgradeBonuses: {
      level_1: { passive: { medicine: 1 } },
      level_2: { passive: { medicine: 1, intelligence: 1 } },
    },
  },
  {
    slug: 'clone-de-combat',
    nameFr: 'Clone de combat',
    nameEn: 'Combat Clone',
    type: 'summon',
    statType: 'ninjutsu',
    element: null,
    rarity: 'rare',
    baseCost: 3,
    summon: {
      name: 'Clone',
      hp: 20,
      attack: 6,
      abilities: ['taunt'],
      description: 'Taunt : Absorbe les dégâts à votre place',
    },
    effects: [],
    passiveBonus: { ninjutsu: 2, maxHp: 3 },
    passiveDescriptionFr: 'Bonus passif : +2 Ninjutsu, +3 PV max',
    passiveDescriptionEn: 'Passive: +2 Ninjutsu, +3 max HP',
    descriptionFr: 'Invoque un clone (20 PV, 6 ATK, Taunt).',
    descriptionEn: 'Summon a clone (20 HP, 6 ATK, Taunt).',
    upgradeBonuses: {
      level_1: { passive: { maxHp: 3 } },
      level_2: { cost: -1, passive: { ninjutsu: 2, maxHp: 3 } },
    },
  },
  {
    slug: 'esprit-du-renard',
    nameFr: 'Esprit du renard',
    nameEn: 'Fox Spirit',
    type: 'summon',
    statType: 'genjutsu',
    element: null,
    rarity: 'legendary',
    baseCost: 4,
    summon: {
      name: 'Renard spectral',
      hp: 28,
      attack: 8,
      abilities: ['evade', 'regen'],
      description: 'Régénère 3 PV par tour',
    },
    effects: [],
    passiveBonus: { genjutsu: 4, intelligence: 2 },
    passiveDescriptionFr: 'Bonus passif : +4 Genjutsu, +2 Intelligence',
    passiveDescriptionEn: 'Passive: +4 Genjutsu, +2 Intelligence',
    descriptionFr: 'Invoque un esprit renard (28 PV, 8 ATK).',
    descriptionEn: 'Summon a fox spirit (28 HP, 8 ATK).',
    upgradeBonuses: {
      level_1: { passive: { genjutsu: 2 } },
      level_2: { cost: -1, passive: { genjutsu: 3, intelligence: 2 } },
    },
  },
  {
    slug: 'frappe-opportuniste',
    nameFr: 'Frappe opportuniste',
    nameEn: 'Opportunistic Strike',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'rare',
    baseCost: 1,
    baseDamage: 8,
    effects: [{ type: 'bonus_if', condition: 'enemy_vulnerable', value: 6 }],
    passiveBonus: { dexterity: 2, vitesse: 1 },
    passiveDescriptionFr: 'Bonus passif : +2 Dextérité, +1 Vitesse',
    passiveDescriptionEn: 'Passive: +2 Dexterity, +1 Speed',
    descriptionFr: '8 dégâts. +6 si l’ennemi est Vulnérable.',
    descriptionEn: '8 damage. +6 if the enemy is Vulnerable.',
    upgradeBonuses: {
      level_1: { damage: 3, passive: { dexterity: 1 } },
      level_2: { damage: 5, passive: { dexterity: 2, vitesse: 1 } },
    },
  },
  {
    slug: 'bande-de-soie',
    nameFr: 'Bande de soie',
    nameEn: 'Silk Wrap',
    type: 'item',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    baseCost: 1,
    baseHeal: 8,
    exhaust: true,
    effects: [],
    passiveBonus: { medicine: 2, maxHp: 2 },
    passiveDescriptionFr: 'Bonus passif : +2 Médecine, +2 PV max',
    passiveDescriptionEn: 'Passive: +2 Medicine, +2 max HP',
    descriptionFr: 'Restaure 8 PV. Exhaust.',
    descriptionEn: 'Restore 8 HP. Exhaust.',
    upgradeBonuses: {
      level_1: { heal: 4, passive: { medicine: 1 } },
      level_2: { heal: 6, passive: { medicine: 2, maxHp: 2 } },
    },
  },
];

/** Catalogue complet (starters + expansion V2). */
export const ALL_CARDS = [...STARTER_CARDS, ...EXPANSION_CARDS];

/** @deprecated Prefer ALL_CARDS — conservé pour imports existants. */
export { STARTER_CARDS };

export function validateCatalog(cards = ALL_CARDS) {
  assertUniqueSlugs(cards);
  assertOriginalNaming(cards);
  for (const card of cards) {
    if (!card.passiveBonus || typeof card.passiveBonus !== 'object') {
      throw new Error(`Missing passiveBonus: ${card.slug}`);
    }
    if (!card.upgradeBonuses?.level_1 || !card.upgradeBonuses?.level_2) {
      throw new Error(`Missing upgradeBonuses: ${card.slug}`);
    }
    if (!['attack', 'defense', 'skill', 'item', 'summon'].includes(card.type)) {
      throw new Error(`Invalid type on ${card.slug}: ${card.type}`);
    }
    if (!['common', 'rare', 'legendary', 'mythic'].includes(card.rarity)) {
      throw new Error(`Invalid rarity on ${card.slug}: ${card.rarity}`);
    }
  }
  return summarizeCatalog(cards);
}

async function main() {
  const summary = validateCatalog(ALL_CARDS);
  console.log(`Seeding ${summary.total} cards…`);
  console.log('  by type   :', summary.byType);
  console.log('  by rarity :', summary.byRarity);
  console.log('  by element:', summary.byElement);

  let ok = 0;
  for (const card of ALL_CARDS) {
    const saved = await upsertCardDefinition(card);
    console.log(`  ✓ ${saved.slug} (#${saved.id}) [${saved.rarity}/${saved.type}]`);
    ok += 1;
  }
  console.log(`Done: ${ok} cards upserted.`);
  process.exit(0);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seedCards.js') || process.argv[1].includes('seedCards'));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
