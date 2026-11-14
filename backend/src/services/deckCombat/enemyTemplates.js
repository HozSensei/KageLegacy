/**
 * Templates ennemis — noms originaux (pas d'IP tierce).
 *
 * AI levels:
 *   - weighted : random pondéré (mobs)
 *   - pattern  : boucle fixe (élites)
 */

export const ENEMY_TEMPLATES = {
  // --- Rang D ---
  ronin_bandit: {
    id: 'ronin_bandit',
    nameFr: 'Rônin des Brumes',
    nameEn: 'Mist Ronin',
    hp: 42,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 60, intent: { type: 'attack', damage: 8 } },
      { weight: 30, intent: { type: 'defend', block: 8 } },
      { weight: 10, intent: { type: 'buff', status: 'force', value: 2, duration: 2 } },
    ],
  },
  marsh_cutpurse: {
    id: 'marsh_cutpurse',
    nameFr: 'Coupe-bourse des Marais',
    nameEn: 'Marsh Cutpurse',
    hp: 36,
    posture: 'genjutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 50, intent: { type: 'attack', damage: 6 } },
      { weight: 30, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
      { weight: 20, intent: { type: 'attack', damage: 4, status: 'poison', statusValue: 2, statusDuration: 2 } },
    ],
  },
  scrapyard_dog: {
    id: 'scrapyard_dog',
    nameFr: 'Chien de la Ferraille',
    nameEn: 'Scrapyard Hound',
    hp: 48,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 70, intent: { type: 'attack', damage: 9 } },
      { weight: 30, intent: { type: 'attack', damage: 5, hits: 2 } },
    ],
  },

  // --- Rang C ---
  kurogane_scout: {
    id: 'kurogane_scout',
    nameFr: 'Éclaireur Kurogane',
    nameEn: 'Kurogane Scout',
    hp: 65,
    posture: 'ninjutsu',
    elementAffinity: 'katon',
    ai: 'weighted',
    patterns: [
      { weight: 45, intent: { type: 'attack', damage: 11 } },
      { weight: 25, intent: { type: 'attack', damage: 7, status: 'burn', statusValue: 2, statusDuration: 2 } },
      { weight: 20, intent: { type: 'defend', block: 10 } },
      { weight: 10, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
    ],
  },
  tide_sentinel: {
    id: 'tide_sentinel',
    nameFr: 'Sentinelle de Marée',
    nameEn: 'Tide Sentinel',
    hp: 72,
    posture: 'ninjutsu',
    elementAffinity: 'suiton',
    ai: 'weighted',
    patterns: [
      { weight: 40, intent: { type: 'defend', block: 12 } },
      { weight: 35, intent: { type: 'attack', damage: 10 } },
      { weight: 25, intent: { type: 'buff', status: 'force', value: 2, duration: 2 } },
    ],
  },
  mirror_adept: {
    id: 'mirror_adept',
    nameFr: 'Adepte du Miroir',
    nameEn: 'Mirror Adept',
    hp: 58,
    posture: 'genjutsu',
    elementAffinity: 'raiton',
    ai: 'weighted',
    patterns: [
      { weight: 35, intent: { type: 'debuff', status: 'vulnerable', value: 1, duration: 2 } },
      { weight: 40, intent: { type: 'attack', damage: 9 } },
      { weight: 25, intent: { type: 'defend', block: 8 } },
    ],
  },

  // --- Rang B ---
  ashen_captain: {
    id: 'ashen_captain',
    nameFr: 'Capitaine Cendré',
    nameEn: 'Ashen Captain',
    hp: 95,
    posture: 'genjutsu',
    elementAffinity: 'doton',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 12 },
      { type: 'defend', block: 14 },
      { type: 'buff', status: 'force', value: 3, duration: 2 },
    ],
  },
  ironroot_warden: {
    id: 'ironroot_warden',
    nameFr: 'Gardien Racine-de-Fer',
    nameEn: 'Ironroot Warden',
    hp: 110,
    posture: 'taijutsu',
    elementAffinity: 'doton',
    ai: 'pattern',
    pattern: [
      { type: 'defend', block: 16 },
      { type: 'attack', damage: 14 },
      { type: 'buff', status: 'force', value: 2, duration: 3 },
      { type: 'attack', damage: 18 },
    ],
  },
  stormcaller_adept: {
    id: 'stormcaller_adept',
    nameFr: 'Adepte Mandeciel',
    nameEn: 'Stormcaller Adept',
    hp: 88,
    posture: 'ninjutsu',
    elementAffinity: 'raiton',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 11, status: 'burn', statusValue: 3, statusDuration: 2 },
      { type: 'debuff', status: 'weak', value: 1, duration: 2 },
      { type: 'attack', damage: 16 },
      { type: 'defend', block: 10 },
    ],
  },

  // --- Rang A ---
  duskblade_ronin: {
    id: 'duskblade_ronin',
    nameFr: 'Rônin Lame-Crépuscule',
    nameEn: 'Duskblade Ronin',
    hp: 140,
    posture: 'taijutsu',
    elementAffinity: 'futon',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 16 },
      { type: 'attack', damage: 10, hits: 2 },
      { type: 'buff', status: 'force', value: 4, duration: 2 },
      { type: 'attack', damage: 22 },
      { type: 'defend', block: 12 },
    ],
  },
  veil_archivist: {
    id: 'veil_archivist',
    nameFr: 'Archiviste du Voile',
    nameEn: 'Veil Archivist',
    hp: 125,
    posture: 'genjutsu',
    elementAffinity: 'suiton',
    ai: 'pattern',
    pattern: [
      { type: 'debuff', status: 'vulnerable', value: 1, duration: 3 },
      { type: 'attack', damage: 14 },
      { type: 'debuff', status: 'weak', value: 1, duration: 2 },
      { type: 'attack', damage: 18 },
      { type: 'defend', block: 15 },
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
