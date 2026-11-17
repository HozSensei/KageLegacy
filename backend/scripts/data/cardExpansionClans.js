/**
 * Cartes légendaires de clan — héritages de lignée (noms originaux).
 * Gros bonus passifs tant que la carte est dans le deck actif.
 * Ne pas confondre avec les factions de classement (Midorihara / Kareno / …).
 */
import { defineCard } from '../lib/cardFactory.js';

const c = defineCard;

/** Lignées originales (migration 114) → cartes `clan-…`. */
export const CLAN_LEGENDARY_CARDS = [
  c({
    slug: 'clan-shizumori',
    nameFr: 'Héritage Shizumori',
    nameEn: 'Shizumori Heritage',
    type: 'skill',
    statType: 'genjutsu',
    rarity: 'legendary',
    cost: 2,
    effects: [
      { type: 'draw', value: 2 },
      { type: 'apply_status', status: 'weak', value: 1, duration: 2 },
    ],
    passive: { intelligence: 8, genjutsu: 6, vitesse: 2 },
    descriptionFr: 'Piochez 2. Applique Faiblesse 1 (2 tours).',
    descriptionEn: 'Draw 2. Apply Weak 1 (2 turns).',
    loreFr: 'Sceau de lignée des stratèges de l’ombre — l’esprit guide chaque pli du deck.',
    loreEn: 'Lineage seal of the shadow strategists — the mind guides every fold of the deck.',
    upgrades: {
      level_1: { passive: { intelligence: 2, genjutsu: 1 } },
      level_2: { cost: -1, passive: { intelligence: 3, genjutsu: 2, vitesse: 1 } },
    },
  }),
  c({
    slug: 'clan-benigiri',
    nameFr: 'Héritage Benigiri',
    nameEn: 'Benigiri Heritage',
    type: 'attack',
    statType: 'ninjutsu',
    element: 'katon',
    rarity: 'legendary',
    cost: 3,
    damage: 12,
    effects: [
      { type: 'apply_status', status: 'burn', value: 2 },
      { type: 'draw', value: 1 },
    ],
    passive: { ninjutsu: 8, genjutsu: 5, intelligence: 3 },
    descriptionFr: 'Inflige 12 dégâts, Brûlure 2. Piochez 1.',
    descriptionEn: 'Deal 12 damage, Burn 2. Draw 1.',
    loreFr: 'Le sang écarlate du clan Benigiri scelle le feu dans chaque technique.',
    loreEn: 'Benigiri crimson blood seals fire into every technique.',
    upgrades: {
      level_1: { damage: 4, passive: { ninjutsu: 2 } },
      level_2: { damage: 7, cost: -1, passive: { ninjutsu: 3, genjutsu: 2 } },
    },
  }),
  c({
    slug: 'clan-kazamine',
    nameFr: 'Héritage Kazamine',
    nameEn: 'Kazamine Heritage',
    type: 'attack',
    statType: 'taijutsu',
    rarity: 'legendary',
    cost: 2,
    damage: 10,
    effects: [
      { type: 'multi_strike', hits: 2 },
      { type: 'apply_status', status: 'vulnerable', value: 1 },
    ],
    passive: { taijutsu: 7, vitesse: 7 },
    descriptionFr: 'Inflige 10 dégâts deux fois. Vulnérable.',
    descriptionEn: 'Deal 10 damage twice. Vulnerable.',
    loreFr: 'Vue perçante et pas légers — la lignée Kazamine frappe avant l’ombre.',
    loreEn: 'Keen sight and light steps — the Kazamine line strikes before the shadow.',
    upgrades: {
      level_1: { damage: 3, passive: { vitesse: 2 } },
      level_2: { damage: 5, cost: -1, passive: { taijutsu: 2, vitesse: 2 } },
    },
  }),
  c({
    slug: 'clan-kumatani',
    nameFr: 'Héritage Kumatani',
    nameEn: 'Kumatani Heritage',
    type: 'defense',
    statType: 'taijutsu',
    rarity: 'legendary',
    cost: 2,
    block: 14,
    effects: [{ type: 'apply_status', target: 'self', status: 'taijutsu_pct', value: 15, duration: 2 }],
    passive: { taijutsu: 6, maxHp: 14, medicine: 3 },
    descriptionFr: 'Gagne 14 d’armure. +15 % dégâts Taijutsu (2 tours).',
    descriptionEn: 'Gain 14 block. +15% Taijutsu damage (2 turns).',
    loreFr: 'Corps massifs et appétit de fer — le clan Kumatani ancre le front.',
    loreEn: 'Massive frames and iron appetite — Clan Kumatani anchors the front line.',
    upgrades: {
      level_1: { block: 5, passive: { maxHp: 4 } },
      level_2: { block: 8, cost: -1, passive: { taijutsu: 2, maxHp: 6 } },
    },
  }),
  c({
    slug: 'clan-yukisawa',
    nameFr: 'Héritage Yukisawa',
    nameEn: 'Yukisawa Heritage',
    type: 'skill',
    statType: 'genjutsu',
    rarity: 'legendary',
    cost: 2,
    effects: [
      { type: 'apply_status', status: 'weak', value: 2, duration: 2 },
      { type: 'apply_status', status: 'vulnerable', value: 1 },
      { type: 'draw', value: 1 },
    ],
    passive: { genjutsu: 8, intelligence: 7 },
    descriptionFr: 'Faiblesse 2 (2 tours), Vulnérable. Piochez 1.',
    descriptionEn: 'Weak 2 (2 turns), Vulnerable. Draw 1.',
    loreFr: 'Murmures de neige — le clan Yukisawa lit les pensées avant qu’elles naissent.',
    loreEn: 'Snow whispers — Clan Yukisawa reads thoughts before they form.',
    upgrades: {
      level_1: { passive: { genjutsu: 2, intelligence: 1 } },
      level_2: { cost: -1, passive: { genjutsu: 3, intelligence: 2 } },
    },
  }),
  c({
    slug: 'clan-nagihara',
    nameFr: 'Héritage Nagihara',
    nameEn: 'Nagihara Heritage',
    type: 'skill',
    statType: 'ninjutsu',
    rarity: 'legendary',
    cost: 2,
    heal: 6,
    effects: [{ type: 'draw', value: 1 }],
    passive: { ninjutsu: 4, taijutsu: 4, genjutsu: 4, medicine: 4 },
    descriptionFr: 'Restaure 6 PV. Piochez 1.',
    descriptionEn: 'Restore 6 HP. Draw 1.',
    loreFr: 'Maîtres polyvalents — la lignée Nagihara forme chaque voie avec la même exigence.',
    loreEn: 'Versatile masters — the Nagihara line trains every path with the same rigor.',
    upgrades: {
      level_1: { heal: 3, passive: { medicine: 1, ninjutsu: 1 } },
      level_2: { heal: 5, cost: -1, passive: { ninjutsu: 1, taijutsu: 1, genjutsu: 1, medicine: 1 } },
    },
  }),
];
