/**
 * Courbes de difficulté par mission (encounters_json).
 * Appliquées au seed schema + migrate idempotent sur bases existantes.
 *
 * D : dur pour un deck starter
 * C : quasi mur sans progression
 * B+ : montée pour mid/late
 */

/** @typedef {{ templateId: string, difficulty: number, boss?: boolean }} EncounterSpec */

/** @type {Record<string, EncounterSpec[]>} */
export const MISSION_ENCOUNTER_DIFFICULTIES = Object.freeze({
  'patrol-mist-road': [
    { templateId: 'ronin_bandit', difficulty: 1.25 },
    { templateId: 'marsh_cutpurse', difficulty: 1.35 },
    { templateId: 'scrapyard_dog', difficulty: 1.45 },
  ],
  'drain-marsh-cutpurse': [
    { templateId: 'marsh_cutpurse', difficulty: 1.25 },
    { templateId: 'ronin_bandit', difficulty: 1.35 },
    { templateId: 'scrapyard_dog', difficulty: 1.45 },
  ],
  'scrapyard-hound': [
    { templateId: 'scrapyard_dog', difficulty: 1.25 },
    { templateId: 'ronin_bandit', difficulty: 1.35 },
    { templateId: 'marsh_cutpurse', difficulty: 1.45 },
  ],
  'secure-ash-outpost': [
    { templateId: 'kurogane_scout', difficulty: 1.55 },
    { templateId: 'tide_sentinel', difficulty: 1.7 },
    { templateId: 'mirror_adept', difficulty: 1.85 },
  ],
  'hold-tide-gate': [
    { templateId: 'tide_sentinel', difficulty: 1.55 },
    { templateId: 'kurogane_scout', difficulty: 1.7 },
    { templateId: 'mirror_adept', difficulty: 1.85 },
  ],
  'shatter-mirror-adept': [
    { templateId: 'mirror_adept', difficulty: 1.55 },
    { templateId: 'tide_sentinel', difficulty: 1.7 },
    { templateId: 'kurogane_scout', difficulty: 1.85 },
  ],
  'duel-ashen-captain': [
    { templateId: 'kurogane_scout', difficulty: 1.6 },
    { templateId: 'ashen_captain', difficulty: 1.7 },
    { templateId: 'ironroot_warden', difficulty: 1.85 },
    { templateId: 'hollow_bell_warden', difficulty: 2.0, boss: true },
  ],
  'ironroot-siege': [
    { templateId: 'tide_sentinel', difficulty: 1.6 },
    { templateId: 'ironroot_warden', difficulty: 1.7 },
    { templateId: 'ashen_captain', difficulty: 1.85 },
    { templateId: 'embercoil_matron', difficulty: 2.0, boss: true },
  ],
  'stormcaller-trial': [
    { templateId: 'mirror_adept', difficulty: 1.6 },
    { templateId: 'stormcaller_adept', difficulty: 1.7 },
    { templateId: 'ashen_captain', difficulty: 1.85 },
    { templateId: 'hollow_bell_warden', difficulty: 2.0, boss: true },
  ],
  'toll-hollow-bell': [
    { templateId: 'kurogane_scout', difficulty: 1.6 },
    { templateId: 'ironroot_warden', difficulty: 1.7 },
    { templateId: 'ashen_captain', difficulty: 1.85 },
    { templateId: 'hollow_bell_warden', difficulty: 2.0, boss: true },
  ],
  'embercoil-ascent': [
    { templateId: 'tide_sentinel', difficulty: 1.6 },
    { templateId: 'stormcaller_adept', difficulty: 1.7 },
    { templateId: 'kurogane_scout', difficulty: 1.85 },
    { templateId: 'embercoil_matron', difficulty: 2.0, boss: true },
  ],
  'duskblade-challenge': [
    { templateId: 'ashen_captain', difficulty: 1.9 },
    { templateId: 'ironroot_warden', difficulty: 2.0 },
    { templateId: 'stormcaller_adept', difficulty: 2.1 },
    { templateId: 'veil_archivist', difficulty: 2.2 },
    { templateId: 'grave_orchid_seer', difficulty: 2.3, boss: true },
  ],
  'veil-archive-breach': [
    { templateId: 'mirror_adept', difficulty: 1.9 },
    { templateId: 'stormcaller_adept', difficulty: 2.0 },
    { templateId: 'ashen_captain', difficulty: 2.1 },
    { templateId: 'duskblade_ronin', difficulty: 2.2 },
    { templateId: 'mirrorfracture_colossus', difficulty: 2.3, boss: true },
  ],
  'orchid-grave-vigil': [
    { templateId: 'mirror_adept', difficulty: 1.9 },
    { templateId: 'veil_archivist', difficulty: 2.0 },
    { templateId: 'stormcaller_adept', difficulty: 2.1 },
    { templateId: 'duskblade_ronin', difficulty: 2.2 },
    { templateId: 'grave_orchid_seer', difficulty: 2.3, boss: true },
  ],
  'fracturemire-siege': [
    { templateId: 'ashen_captain', difficulty: 1.9 },
    { templateId: 'ironroot_warden', difficulty: 2.0 },
    { templateId: 'duskblade_ronin', difficulty: 2.1 },
    { templateId: 'veil_archivist', difficulty: 2.2 },
    { templateId: 'mirrorfracture_colossus', difficulty: 2.3, boss: true },
  ],
  'voidspire-regency': [
    { templateId: 'stormcaller_adept', difficulty: 2.4 },
    { templateId: 'duskblade_ronin', difficulty: 2.5 },
    { templateId: 'grave_orchid_seer', difficulty: 2.6 },
    { templateId: 'mirrorfracture_colossus', difficulty: 2.7 },
    { templateId: 'voidspire_regent', difficulty: 2.8, boss: true },
  ],
});
