/**
 * Templates ennemis — noms originaux (pas d'IP tierce).
 *
 * AI levels:
 *   - weighted : random pondéré (mobs)
 *   - pattern  : boucle fixe (élites / boss)
 *
 * Boss multi-phases : champ `phases[]` (seuils hpPctBelow) — docs/CARDS_AND_COMBAT.md.
 *
 * Balance (retune) : HP / intents calibrés pour greedy + practice deck
 * (`npm run test:combat-balance`). Ordre de rang D < C < B < A < S.
 */

export const ENEMY_TEMPLATES = {
  // --- Rang D ---
  ronin_bandit: {
    id: 'ronin_bandit',
    nameFr: 'Rônin des Brumes',
    nameEn: 'Mist Ronin',
    hp: 155,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 70, intent: { type: 'attack', damage: 26 } },
      { weight: 20, intent: { type: 'defend', block: 8 } },
      { weight: 10, intent: { type: 'buff', status: 'force', value: 4, duration: 2 } },
    ],
  },
  marsh_cutpurse: {
    id: 'marsh_cutpurse',
    nameFr: 'Coupe-bourse des Marais',
    nameEn: 'Marsh Cutpurse',
    hp: 148,
    posture: 'genjutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 45, intent: { type: 'attack', damage: 24 } },
      { weight: 20, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
      {
        weight: 35,
        intent: { type: 'attack', damage: 18, status: 'poison', statusDuration: 2 },
      },
    ],
  },
  scrapyard_dog: {
    id: 'scrapyard_dog',
    nameFr: 'Chien de la Ferraille',
    nameEn: 'Scrapyard Hound',
    hp: 140,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 60, intent: { type: 'attack', damage: 27 } },
      { weight: 40, intent: { type: 'attack', damage: 20 } },
    ],
  },

  // --- Rang C ---
  kurogane_scout: {
    id: 'kurogane_scout',
    nameFr: 'Éclaireur Kurogane',
    nameEn: 'Kurogane Scout',
    hp: 185,
    posture: 'ninjutsu',
    elementAffinity: 'katon',
    ai: 'weighted',
    patterns: [
      { weight: 40, intent: { type: 'attack', damage: 28 } },
      {
        weight: 30,
        intent: { type: 'attack', damage: 20, status: 'burn', statusDuration: 2 },
      },
      { weight: 15, intent: { type: 'defend', block: 12 } },
      { weight: 15, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
    ],
  },
  tide_sentinel: {
    id: 'tide_sentinel',
    nameFr: 'Sentinelle de Marée',
    nameEn: 'Tide Sentinel',
    hp: 200,
    posture: 'ninjutsu',
    elementAffinity: 'suiton',
    ai: 'weighted',
    patterns: [
      { weight: 15, intent: { type: 'defend', block: 14 } },
      { weight: 60, intent: { type: 'attack', damage: 30 } },
      { weight: 25, intent: { type: 'buff', status: 'force', value: 4, duration: 2 } },
    ],
  },
  mirror_adept: {
    id: 'mirror_adept',
    nameFr: 'Adepte du Miroir',
    nameEn: 'Mirror Adept',
    hp: 190,
    posture: 'genjutsu',
    elementAffinity: 'raiton',
    ai: 'weighted',
    patterns: [
      { weight: 35, intent: { type: 'debuff', status: 'vulnerable', value: 1, duration: 2 } },
      { weight: 50, intent: { type: 'attack', damage: 27 } },
      { weight: 15, intent: { type: 'defend', block: 11 } },
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
      { type: 'attack', damage: 24, status: 'burn', statusDuration: 2 },
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
  // --- Boss multi-phases (B / A / S) ---
  hollow_bell_warden: {
    id: 'hollow_bell_warden',
    nameFr: 'Gardien de la Cloche Creuse',
    nameEn: 'Hollow Bell Warden',
    hp: 340,
    rank: 'B',
    boss: true,
    posture: 'taijutsu',
    elementAffinity: 'doton',
    barrier: 22,
    ai: 'pattern',
    pattern: [
      { type: 'raise_barrier', barrier: 14 },
      { type: 'attack', damage: 22 },
      { type: 'defend', block: 8 },
      { type: 'attack', damage: 28 },
    ],
    phases: [
      {
        id: 'cracked_bell',
        hpPctBelow: 0.55,
        onEnter: {
          barrier: 28,
          buffs: [{ status: 'force', value: 3, duration: 3 }],
          immunities: ['weak'],
        },
        ai: 'pattern',
        pattern: [
          { type: 'raise_barrier', barrier: 16 },
          { type: 'attack', damage: 26 },
          { type: 'charge', releaseDamage: 38 },
          { type: 'attack', damage: 20 },
        ],
      },
      {
        id: 'shattered_peal',
        hpPctBelow: 0.25,
        onEnter: {
          barrier: 12,
          immunities: ['weak', 'poison'],
          buffs: [{ status: 'force', value: 5, duration: 99 }],
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 46 },
          { type: 'attack', damage: 32 },
          { type: 'raise_barrier', barrier: 10 },
        ],
      },
    ],
  },

  embercoil_matron: {
    id: 'embercoil_matron',
    nameFr: 'Matrone Spiralebraise',
    nameEn: 'Embercoil Matron',
    hp: 310,
    rank: 'B',
    boss: true,
    posture: 'ninjutsu',
    elementAffinity: 'katon',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 18, status: 'burn', statusDuration: 2 },
      { type: 'charge', releaseDamage: 34 },
      { type: 'defend', block: 7 },
      { type: 'buff', status: 'force', value: 3, duration: 2 },
    ],
    phases: [
      {
        id: 'coil_ignites',
        hpPctBelow: 0.5,
        onEnter: {
          buffs: [{ status: 'force', value: 4, duration: 4 }],
          clearStatuses: false,
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 42 },
          { type: 'attack', damage: 24, status: 'burn', statusDuration: 2 },
          { type: 'debuff', status: 'weak', value: 1, duration: 2 },
          { type: 'attack', damage: 28 },
        ],
      },
    ],
  },

  grave_orchid_seer: {
    id: 'grave_orchid_seer',
    nameFr: 'Voyante Orchidee-Tombe',
    nameEn: 'Grave Orchid Seer',
    hp: 360,
    rank: 'A',
    boss: true,
    posture: 'genjutsu',
    elementAffinity: 'suiton',
    ai: 'pattern',
    pattern: [
      {
        type: 'summon',
        minion: { nameFr: 'Petale Funebre', nameEn: 'Funeral Petal', hp: 28, attack: 8 },
      },
      { type: 'debuff', status: 'vulnerable', value: 1, duration: 2 },
      { type: 'attack', damage: 24 },
      { type: 'defend', block: 9 },
    ],
    phases: [
      {
        id: 'bloom_of_ash',
        hpPctBelow: 0.6,
        onEnter: {
          buffs: [{ status: 'force', value: 3, duration: 3 }],
          immunities: ['poison'],
        },
        ai: 'pattern',
        pattern: [
          {
            type: 'summon',
            minion: { nameFr: 'Racine Spectrale', nameEn: 'Spectral Root', hp: 36, attack: 11 },
          },
          { type: 'attack', damage: 28 },
          { type: 'debuff', status: 'weak', value: 1, duration: 2 },
          { type: 'charge', releaseDamage: 40 },
        ],
      },
      {
        id: 'wilted_throne',
        hpPctBelow: 0.3,
        onEnter: {
          immunities: ['poison', 'burn'],
          buffs: [{ status: 'force', value: 4, duration: 99 }],
        },
        ai: 'pattern',
        pattern: [
          {
            type: 'summon',
            minion: { nameFr: 'Choeur de Cendre', nameEn: 'Ash Choir', hp: 42, attack: 13 },
          },
          { type: 'attack', damage: 34 },
          { type: 'debuff', status: 'vulnerable', value: 1, duration: 3 },
        ],
      },
    ],
  },

  mirrorfracture_colossus: {
    id: 'mirrorfracture_colossus',
    nameFr: 'Colosse Fracturemire',
    nameEn: 'Mirrorfracture Colossus',
    hp: 400,
    rank: 'A',
    boss: true,
    posture: 'taijutsu',
    elementAffinity: 'raiton',
    barrier: 30,
    immunities: ['vulnerable'],
    ai: 'pattern',
    pattern: [
      { type: 'raise_barrier', barrier: 18 },
      { type: 'attack', damage: 26 },
      { type: 'defend', block: 10 },
      { type: 'buff', status: 'force', value: 3, duration: 2 },
    ],
    phases: [
      {
        id: 'prism_split',
        hpPctBelow: 0.66,
        onEnter: {
          barrier: 36,
          immunities: ['vulnerable', 'weak'],
          buffs: [{ status: 'force', value: 4, duration: 3 }],
        },
        ai: 'pattern',
        pattern: [
          { type: 'raise_barrier', barrier: 20 },
          { type: 'charge', releaseDamage: 44 },
          { type: 'attack', damage: 30 },
          {
            type: 'summon',
            minion: { nameFr: 'Eclat Miroir', nameEn: 'Mirror Shard', hp: 30, attack: 9 },
          },
        ],
      },
      {
        id: 'total_refraction',
        hpPctBelow: 0.33,
        onEnter: {
          barrier: 20,
          clearStatuses: true,
          immunities: ['vulnerable', 'weak', 'poison'],
          buffs: [{ status: 'force', value: 6, duration: 99 }],
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 52 },
          { type: 'raise_barrier', barrier: 14 },
          { type: 'attack', damage: 38 },
        ],
      },
    ],
  },

  voidspire_regent: {
    id: 'voidspire_regent',
    nameFr: 'Regent de la Fleche-Vide',
    nameEn: 'Voidspire Regent',
    hp: 480,
    rank: 'S',
    boss: true,
    posture: 'ninjutsu',
    elementAffinity: 'futon',
    barrier: 26,
    ai: 'pattern',
    pattern: [
      { type: 'raise_barrier', barrier: 16 },
      { type: 'attack', damage: 28 },
      {
        type: 'summon',
        minion: { nameFr: 'Sentinelle Nulle', nameEn: 'Null Sentinel', hp: 32, attack: 10 },
      },
      { type: 'charge', releaseDamage: 40 },
    ],
    phases: [
      {
        id: 'spire_awakens',
        hpPctBelow: 0.7,
        onEnter: {
          barrier: 34,
          buffs: [{ status: 'force', value: 4, duration: 4 }],
          immunities: ['weak'],
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 48 },
          { type: 'attack', damage: 32, status: 'burn', statusDuration: 2 },
          {
            type: 'summon',
            minion: { nameFr: 'Echo du Vide', nameEn: 'Void Echo', hp: 40, attack: 12 },
          },
          { type: 'raise_barrier', barrier: 18 },
        ],
      },
      {
        id: 'regent_unmasked',
        hpPctBelow: 0.4,
        onEnter: {
          barrier: 22,
          immunities: ['weak', 'poison', 'burn'],
          buffs: [{ status: 'force', value: 6, duration: 99 }],
          setBlock: 12,
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 56 },
          { type: 'debuff', status: 'vulnerable', value: 1, duration: 2 },
          { type: 'attack', damage: 40 },
          {
            type: 'summon',
            minion: { nameFr: "Couronne d'Ombre", nameEn: 'Shadow Crown', hp: 48, attack: 14 },
          },
        ],
      },
      {
        id: 'eclipse_core',
        hpPctBelow: 0.15,
        onEnter: {
          clearStatuses: false,
          barrier: 16,
          immunities: ['weak', 'poison', 'burn', 'vulnerable'],
          buffs: [{ status: 'force', value: 8, duration: 99 }],
        },
        ai: 'pattern',
        pattern: [
          { type: 'charge', releaseDamage: 64 },
          { type: 'attack', damage: 46 },
          { type: 'raise_barrier', barrier: 12 },
        ],
      },
    ],
  },
};

export function listEnemyTemplates() {
  return Object.values(ENEMY_TEMPLATES).map(t => ({
    id: t.id,
    nameFr: t.nameFr,
    nameEn: t.nameEn,
    hp: t.hp,
    ai: t.ai,
    boss: Boolean(t.boss),
    rank: t.rank || null,
    phases: Array.isArray(t.phases) ? t.phases.length : 0,
  }));
}

/** Boss multi-phases uniquement */
export function listBossTemplates() {
  return listEnemyTemplates().filter(t => t.boss);
}
