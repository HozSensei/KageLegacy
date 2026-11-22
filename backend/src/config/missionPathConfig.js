/**
 * Missions TCG — une entrée par rang, parcours généré à chaque lancement.
 *
 * Parcours branché : combat d’ouverture → shop → bifur (court / long) → finale.
 */

/** @typedef {{ templateId: string, difficulty?: number, boss?: boolean }} EncounterSpec */

/**
 * Pools d’ennemis + courbe de difficulté par rang.
 * fightCount = combats sur la branche longue (inclut l’ouverture + finale).
 * shortFightCount = combats totaux sur la branche courte.
 * @type {Record<string, {
 *   fightCount: number,
 *   shortFightCount: number,
 *   bossLast: boolean,
 *   difficulties: number[],
 *   shortDifficulties: number[],
 *   pool: string[],
 *   bossPool?: string[],
 * }>}
 */
export const RANK_PATH_CONFIG = Object.freeze({
  D: Object.freeze({
    fightCount: 4,
    shortFightCount: 3,
    bossLast: false,
    difficulties: Object.freeze([0.9, 1.05, 1.2, 1.35]),
    shortDifficulties: Object.freeze([0.9, 1.15, 1.35]),
    pool: Object.freeze(['ronin_bandit', 'marsh_cutpurse', 'scrapyard_dog']),
  }),
  C: Object.freeze({
    fightCount: 4,
    shortFightCount: 3,
    bossLast: false,
    difficulties: Object.freeze([1.15, 1.35, 1.55, 1.75]),
    shortDifficulties: Object.freeze([1.15, 1.45, 1.75]),
    pool: Object.freeze(['kurogane_scout', 'tide_sentinel', 'mirror_adept']),
  }),
  B: Object.freeze({
    fightCount: 5,
    shortFightCount: 4,
    bossLast: true,
    difficulties: Object.freeze([1.3, 1.45, 1.6, 1.8, 2.0]),
    shortDifficulties: Object.freeze([1.3, 1.5, 1.75, 2.0]),
    pool: Object.freeze([
      'kurogane_scout',
      'tide_sentinel',
      'mirror_adept',
      'ashen_captain',
      'ironroot_warden',
      'stormcaller_adept',
    ]),
    bossPool: Object.freeze(['hollow_bell_warden', 'embercoil_matron']),
  }),
  A: Object.freeze({
    fightCount: 6,
    shortFightCount: 4,
    bossLast: true,
    difficulties: Object.freeze([1.6, 1.75, 1.9, 2.05, 2.15, 2.25]),
    shortDifficulties: Object.freeze([1.6, 1.85, 2.05, 2.25]),
    pool: Object.freeze([
      'ashen_captain',
      'ironroot_warden',
      'stormcaller_adept',
      'veil_archivist',
      'duskblade_ronin',
      'mirror_adept',
    ]),
    bossPool: Object.freeze(['grave_orchid_seer', 'mirrorfracture_colossus']),
  }),
  S: Object.freeze({
    fightCount: 6,
    shortFightCount: 5,
    bossLast: true,
    difficulties: Object.freeze([2.1, 2.25, 2.4, 2.55, 2.65, 2.75]),
    shortDifficulties: Object.freeze([2.1, 2.3, 2.5, 2.65, 2.75]),
    pool: Object.freeze([
      'stormcaller_adept',
      'duskblade_ronin',
      'grave_orchid_seer',
      'veil_archivist',
      'mirrorfracture_colossus',
    ]),
    bossPool: Object.freeze(['voidspire_regent']),
  }),
});

/** @deprecated mystery weights kept for legacy run helpers / tests. */
export const MYSTERY_OUTCOME_WEIGHTS = Object.freeze({
  heal: 30,
  merchant: 25,
  loot: 20,
  nothing: 15,
  combat: 10,
});

/** Mode difficile opt-in au lancement de mission. */
export const HARD_MODE_DIFFICULTY_MULT = 1.2;
export const HARD_MODE_REWARD_MULT = 1.2;

/**
 * Définitions catalogue — une mission active par rang.
 * `encounters_json` reste vide : le path est généré côté service.
 */
export const RANK_MISSION_DEFINITIONS = Object.freeze([
  Object.freeze({
    slug: 'mission-rank-d',
    rank: 'D',
    nameFr: 'Mission — rang D',
    nameEn: 'Mission — rank D',
    descriptionFr:
      'Patrouille de bas échelon. Le parcours est tiré à chaque lancement ; le briefing s’ouvre au départ.',
    descriptionEn:
      'Low-rank patrol. The path is rolled on each launch; the briefing opens at start.',
    sortOrder: 10,
    rewards: Object.freeze({
      xp: 70,
      ryos: 300,
      bpPoints: 5,
      cardChance: 24,
      runBonusMult: 1.6,
    }),
  }),
  Object.freeze({
    slug: 'mission-rank-c',
    rank: 'C',
    nameFr: 'Mission — rang C',
    nameEn: 'Mission — rank C',
    descriptionFr:
      'Opération d’avant-poste. Chemin aléatoire ; briefing révélé au lancement.',
    descriptionEn: 'Outpost operation. Random path; briefing revealed on launch.',
    sortOrder: 20,
    rewards: Object.freeze({
      xp: 90,
      ryos: 540,
      bpPoints: 8,
      cardChance: 28,
      runBonusMult: 1.8,
    }),
  }),
  Object.freeze({
    slug: 'mission-rank-b',
    rank: 'B',
    nameFr: 'Mission — rang B',
    nameEn: 'Mission — rank B',
    descriptionFr: 'Assaut d’élite. Parcours généré à la volée, finale boss possible.',
    descriptionEn: 'Elite assault. Path generated on the fly, possible boss finale.',
    sortOrder: 30,
    rewards: Object.freeze({
      xp: 360,
      ryos: 1000,
      bpPoints: 14,
      cardChance: 38,
      runBonusMult: 2.1,
    }),
  }),
  Object.freeze({
    slug: 'mission-rank-a',
    rank: 'A',
    nameFr: 'Mission — rang A',
    nameEn: 'Mission — rank A',
    descriptionFr: 'Raid critique. Long parcours aléatoire avec confrontations dures.',
    descriptionEn: 'Critical raid. Long random path with hard confrontations.',
    sortOrder: 40,
    rewards: Object.freeze({
      xp: 580,
      ryos: 1700,
      bpPoints: 22,
      cardChance: 50,
      runBonusMult: 2.5,
    }),
  }),
  Object.freeze({
    slug: 'mission-rank-s',
    rank: 'S',
    nameFr: 'Mission — rang S',
    nameEn: 'Mission — rank S',
    descriptionFr:
      'Ombre du Kage. Le parcours le plus exigeant, régénéré à chaque départ.',
    descriptionEn: 'Shadow of the Kage. The harshest path, regenerated each start.',
    sortOrder: 50,
    rewards: Object.freeze({
      xp: 900,
      ryos: 2800,
      bpPoints: 35,
      cardChance: 60,
      runBonusMult: 3.0,
    }),
  }),
]);

export const RANK_MISSION_SLUGS = Object.freeze(RANK_MISSION_DEFINITIONS.map(m => m.slug));

export function getRankPathConfig(rank) {
  return RANK_PATH_CONFIG[rank] || null;
}

/**
 * @deprecated Conservé pour les scripts qui lisaient encore les listes fixes.
 */
export const MISSION_ENCOUNTER_DIFFICULTIES = Object.freeze(
  Object.fromEntries(
    RANK_MISSION_DEFINITIONS.map(def => {
      const cfg = RANK_PATH_CONFIG[def.rank];
      const fights = cfg.difficulties.map((difficulty, i) => {
        const pool =
          cfg.bossLast && i === cfg.difficulties.length - 1 && cfg.bossPool?.length
            ? cfg.bossPool
            : cfg.pool;
        return {
          templateId: pool[i % pool.length],
          difficulty,
          ...(cfg.bossLast && i === cfg.difficulties.length - 1 ? { boss: true } : {}),
        };
      });
      return [def.slug, fights];
    }),
  ),
);
