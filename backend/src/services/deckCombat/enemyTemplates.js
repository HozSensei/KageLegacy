/**
 * Templates ennemis — noms originaux (pas d'IP tierce).
 *
 * AI levels:
 *   - weighted : random pondéré (mobs)
 *   - pattern  : boucle fixe (élites)
 *
 * Balance (retune) : HP / intents calibrés pour greedy + practice deck
 * (`npm run test:combat-balance`). Ordre de rang D < C < B < A.
 */

export const ENEMY_TEMPLATES = {
  // --- Rang D ---
  ronin_bandit: {
    id: 'ronin_bandit',
    nameFr: 'Rônin des Brumes',
    nameEn: 'Mist Ronin',
    hp: 124,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 72, intent: { type: 'attack', damage: 17 } },
      { weight: 18, intent: { type: 'defend', block: 5 } },
      { weight: 10, intent: { type: 'buff', status: 'force', value: 3, duration: 2 } },
    ],
  },
  marsh_cutpurse: {
    id: 'marsh_cutpurse',
    nameFr: 'Coupe-bourse des Marais',
    nameEn: 'Marsh Cutpurse',
    hp: 120,
    posture: 'genjutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 50, intent: { type: 'attack', damage: 15 } },
      { weight: 15, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
      { weight: 35, intent: { type: 'attack', damage: 12, status: 'poison', statusValue: 3, statusDuration: 3 } },
    ],
  },
  scrapyard_dog: {
    id: 'scrapyard_dog',
    nameFr: 'Chien de la Ferraille',
    nameEn: 'Scrapyard Hound',
    hp: 112,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 60, intent: { type: 'attack', damage: 17 } },
      { weight: 40, intent: { type: 'attack', damage: 13 } },
    ],
  },

  // --- Rang C ---
  kurogane_scout: {
    id: 'kurogane_scout',
    nameFr: 'Éclaireur Kurogane',
    nameEn: 'Kurogane Scout',
    hp: 128,
    posture: 'ninjutsu',
    elementAffinity: 'katon',
    ai: 'weighted',
    patterns: [
      { weight: 45, intent: { type: 'attack', damage: 16 } },
      { weight: 30, intent: { type: 'attack', damage: 11, status: 'burn', statusValue: 3, statusDuration: 2 } },
      { weight: 15, intent: { type: 'defend', block: 8 } },
      { weight: 10, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
    ],
  },
  tide_sentinel: {
    id: 'tide_sentinel',
    nameFr: 'Sentinelle de Marée',
    nameEn: 'Tide Sentinel',
    hp: 140,
    posture: 'ninjutsu',
    elementAffinity: 'suiton',
    ai: 'weighted',
    patterns: [
      { weight: 15, intent: { type: 'defend', block: 8 } },
      { weight: 60, intent: { type: 'attack', damage: 18 } },
      { weight: 25, intent: { type: 'buff', status: 'force', value: 3, duration: 2 } },
    ],
  },
  mirror_adept: {
    id: 'mirror_adept',
    nameFr: 'Adepte du Miroir',
    nameEn: 'Mirror Adept',
    hp: 132,
    posture: 'genjutsu',
    elementAffinity: 'raiton',
    ai: 'weighted',
    patterns: [
      { weight: 35, intent: { type: 'debuff', status: 'vulnerable', value: 1, duration: 2 } },
      { weight: 50, intent: { type: 'attack', damage: 16 } },
      { weight: 15, intent: { type: 'defend', block: 7 } },
    ],
  },

  // --- Rang B ---
  ashen_captain: {
    id: 'ashen_captain',
    nameFr: 'Capitaine Cendré',
    nameEn: 'Ashen Captain',
    hp: 290,
    posture: 'genjutsu',
    elementAffinity: 'doton',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 32 },
      { type: 'attack', damage: 28 },
      { type: 'defend', block: 6 },
      { type: 'buff', status: 'force', value: 5, duration: 2 },
    ],
  },
  ironroot_warden: {
    id: 'ironroot_warden',
    nameFr: 'Gardien Racine-de-Fer',
    nameEn: 'Ironroot Warden',
    hp: 265,
    posture: 'taijutsu',
    elementAffinity: 'doton',
    ai: 'pattern',
    pattern: [
      { type: 'defend', block: 10 },
      { type: 'attack', damage: 25 },
      { type: 'buff', status: 'force', value: 4, duration: 3 },
      { type: 'attack', damage: 34 },
    ],
  },
  stormcaller_adept: {
    id: 'stormcaller_adept',
    nameFr: 'Adepte Mandeciel',
    nameEn: 'Stormcaller Adept',
    hp: 260,
    posture: 'ninjutsu',
    elementAffinity: 'raiton',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 24, status: 'burn', statusValue: 4, statusDuration: 2 },
      { type: 'debuff', status: 'weak', value: 1, duration: 2 },
      { type: 'attack', damage: 30 },
      { type: 'defend', block: 8 },
    ],
  },

  // --- Rang A ---
  duskblade_ronin: {
    id: 'duskblade_ronin',
    nameFr: 'Rônin Lame-Crépuscule',
    nameEn: 'Duskblade Ronin',
    hp: 290,
    posture: 'taijutsu',
    elementAffinity: 'futon',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 25 },
      { type: 'attack', damage: 18 },
      { type: 'buff', status: 'force', value: 5, duration: 2 },
      { type: 'attack', damage: 35 },
      { type: 'defend', block: 6 },
    ],
  },
  veil_archivist: {
    id: 'veil_archivist',
    nameFr: 'Archiviste du Voile',
    nameEn: 'Veil Archivist',
    hp: 275,
    posture: 'genjutsu',
    elementAffinity: 'suiton',
    ai: 'pattern',
    pattern: [
      { type: 'debuff', status: 'vulnerable', value: 1, duration: 3 },
      { type: 'attack', damage: 24 },
      { type: 'debuff', status: 'weak', value: 1, duration: 2 },
      { type: 'attack', damage: 32 },
      { type: 'defend', block: 10 },
    ],
  },
};

export function listEnemyTemplates() {
  return Object.values(ENEMY_TEMPLATES).map((t) => ({
    id: t.id,
    nameFr: t.nameFr,
    nameEn: t.nameEn,
    hp: t.hp,
    ai: t.ai,
  }));
}
