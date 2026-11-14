/**
 * Seuils d’équilibrage combat PvE (deck-building).
 *
 * Utilisé par `npm run test:combat-balance` et le mode rapport.
 * Voir docs/COMBAT_BALANCE_TESTS.md.
 *
 * Win rates exprimés en fractions [0, 1].
 *
 * Deux couches :
 * - hard* : filets de régression CI (ne pas rendre le contenu injouable)
 * - soft* : cibles design (trop trivial) — warn par défaut, fail avec --strict
 */

/** @typedef {'beginner'|'mid'|'strong'} BalanceProfileId */
/** @typedef {'D'|'C'|'B'|'A'} MissionRank */

/**
 * Profils joueur synthétiques (hors DB).
 * Stats = talents + passifs deck agrégés (formule Base × (1 + Stat/100)).
 */
export const BALANCE_PROFILES = Object.freeze({
  beginner: Object.freeze({
    id: 'beginner',
    label: 'Débutant',
    /** Peu/pas de talents — deck practice. */
    stats: Object.freeze({
      taijutsu: 5,
      ninjutsu: 0,
      genjutsu: 0,
      medicine: 5,
      vitesse: 0,
      intelligence: 0,
      dexterity: 0,
      maxHp: 0,
    }),
    talentCodes: Object.freeze([]),
    deck: 'practice',
  }),
  mid: Object.freeze({
    id: 'mid',
    label: 'Milieu',
    stats: Object.freeze({
      taijutsu: 45,
      ninjutsu: 30,
      genjutsu: 20,
      medicine: 35,
      vitesse: 40,
      intelligence: 20,
      dexterity: 10,
      maxHp: 25,
    }),
    talentCodes: Object.freeze(['iron_guard', 'blade_swift']),
    deck: 'practice',
  }),
  strong: Object.freeze({
    id: 'strong',
    label: 'Fort',
    stats: Object.freeze({
      taijutsu: 110,
      ninjutsu: 80,
      genjutsu: 60,
      medicine: 70,
      vitesse: 90,
      intelligence: 50,
      dexterity: 30,
      maxHp: 60,
    }),
    talentCodes: Object.freeze([
      'iron_guard',
      'blade_swift',
      'combo_master',
      'berserker',
      'boosted_regen',
    ]),
    deck: 'practice',
  }),
});

/**
 * Encounters couverts (templates originaux, sans IP).
 * Rang aligné sur enemyTemplates (D / C / B / A).
 */
export const BALANCE_ENCOUNTERS = Object.freeze([
  Object.freeze({ templateId: 'ronin_bandit', rank: 'D', difficulty: 1 }),
  Object.freeze({ templateId: 'marsh_cutpurse', rank: 'D', difficulty: 1 }),
  Object.freeze({ templateId: 'scrapyard_dog', rank: 'D', difficulty: 1 }),
  Object.freeze({ templateId: 'kurogane_scout', rank: 'C', difficulty: 1 }),
  Object.freeze({ templateId: 'tide_sentinel', rank: 'C', difficulty: 1 }),
  Object.freeze({ templateId: 'ashen_captain', rank: 'B', difficulty: 1 }),
  Object.freeze({ templateId: 'ironroot_warden', rank: 'B', difficulty: 1 }),
  Object.freeze({ templateId: 'duskblade_ronin', rank: 'A', difficulty: 1 }),
]);

export const BALANCE_SIM = Object.freeze({
  fightsPerCell: 24,
  baseSeed: 0x4b414745, // 'KAGE'
  maxTurns: 40,
  reportFightsPerCell: 48,
});

/**
 * Seuils par rang × profil.
 *
 * hard : CI échoue si hors borne (régression « trop dur » / durée absurde).
 * soft : cible design « pas trivial » — avertissement, fail seulement avec --strict.
 *
 * Snapshot 2026-03 (greedy + practice) : WR ≈ 100 % partout → soft winRateMax
 * signalent un contenu trop facile sous IA optimale ; hard winRateMin protège
 * contre une surge de difficulté accidentelle.
 *
 * @type {Record<MissionRank, Partial<Record<BalanceProfileId, {
 *   winRateMin?: number,
 *   winRateMaxSoft?: number,
 *   avgTurnsMin?: number,
 *   avgTurnsMax?: number,
 *   avgDamageTakenMinSoft?: number,
 * }>>>}
 */
export const BALANCE_THRESHOLDS = Object.freeze({
  D: Object.freeze({
    beginner: Object.freeze({
      winRateMin: 0.5,
      winRateMaxSoft: 0.9,
      avgTurnsMin: 2,
      avgTurnsMax: 14,
      avgDamageTakenMinSoft: 8,
    }),
    mid: Object.freeze({
      winRateMin: 0.85,
      winRateMaxSoft: 1.0,
      avgTurnsMax: 10,
    }),
    strong: Object.freeze({
      winRateMin: 0.9,
      avgTurnsMax: 8,
    }),
  }),
  C: Object.freeze({
    beginner: Object.freeze({
      winRateMin: 0.25,
      winRateMaxSoft: 0.85,
      avgTurnsMin: 3,
      avgTurnsMax: 20,
      avgDamageTakenMinSoft: 12,
    }),
    mid: Object.freeze({
      winRateMin: 0.55,
      winRateMaxSoft: 0.98,
      avgTurnsMax: 14,
    }),
    strong: Object.freeze({
      winRateMin: 0.8,
      avgTurnsMax: 10,
    }),
  }),
  B: Object.freeze({
    mid: Object.freeze({
      winRateMin: 0.35,
      winRateMaxSoft: 0.95,
      avgTurnsMax: 18,
      avgDamageTakenMinSoft: 5,
    }),
    strong: Object.freeze({
      winRateMin: 0.55,
      winRateMaxSoft: 1.0,
      avgTurnsMax: 14,
    }),
  }),
  A: Object.freeze({
    mid: Object.freeze({
      winRateMin: 0.15,
      winRateMaxSoft: 0.85,
      avgTurnsMax: 24,
      avgDamageTakenMinSoft: 10,
    }),
    strong: Object.freeze({
      winRateMin: 0.4,
      winRateMaxSoft: 0.95,
      avgTurnsMax: 20,
      avgDamageTakenMinSoft: 3,
    }),
  }),
});

/**
 * Cibles design documentées (interprétation humaine / --strict).
 * Pas utilisées comme hard-fail CI par défaut.
 */
export const DESIGN_WINRATE_TARGETS = Object.freeze({
  D: Object.freeze({
    beginner: Object.freeze({ min: 0.4, max: 0.85 }),
    mid: Object.freeze({ min: 0.75, max: 1.0 }),
  }),
  C: Object.freeze({
    beginner: Object.freeze({ min: 0.15, max: 0.65 }),
    mid: Object.freeze({ min: 0.5, max: 0.9 }),
  }),
  B: Object.freeze({
    mid: Object.freeze({ min: 0.25, max: 0.75 }),
    strong: Object.freeze({ min: 0.55, max: 0.95 }),
  }),
  A: Object.freeze({
    mid: Object.freeze({ min: 0.1, max: 0.55 }),
    strong: Object.freeze({ min: 0.4, max: 0.85 }),
  }),
});

/**
 * Politique joueur documentée (reproductibilité).
 * Voir combatBalanceSim.js — greedy_damage_then_block.
 */
export const PLAYER_POLICY = Object.freeze({
  id: 'greedy_damage_then_block',
  summary:
    'Joue la carte affordable au plus haut score (kill > dégâts > block si menace > heal > summon > draw) ; défausse→chakra si ça débloque une attaque ; sinon end turn.',
});
