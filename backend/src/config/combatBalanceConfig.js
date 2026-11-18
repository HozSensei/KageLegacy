/**
 * Seuils d’équilibrage combat PvE (deck-building).
 *
 * Utilisé par `npm run test:combat-balance` et le mode rapport.
 * Voir docs/TESTING.md.
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
 * Profils de progression reproductibles, hors DB.
 *
 * `level` est volontairement distinct des stats : le backend n'accorde aucune
 * stat automatique au passage de niveau. Les stats sont des valeurs agrégées
 * hypothétiques, non vérifiées contre un arbre de talents ou une collection.
 * `deckUpgradeLevel` suit les niveaux 0–2 de `applyUpgradeBonuses`.
 */
export const BALANCE_PROFILES = Object.freeze({
  beginner: Object.freeze({
    id: 'beginner',
    label: 'Genin débutant',
    level: 8,
    stats: Object.freeze({
      taijutsu: 5,
      ninjutsu: 0,
      genjutsu: 0,
      medicine: 5,
      maxHp: 0,
    }),
    talentCodes: Object.freeze([]),
    deck: 'practice',
    deckUpgradeLevel: 0,
    deckUpgradeSlugs: Object.freeze([]),
  }),
  mid: Object.freeze({
    id: 'mid',
    label: 'Chunin établi',
    level: 32,
    stats: Object.freeze({
      taijutsu: 45,
      ninjutsu: 30,
      genjutsu: 20,
      medicine: 35,
      maxHp: 25,
    }),
    talentCodes: Object.freeze(['iron_guard', 'blade_swift']),
    deck: 'practice',
    deckUpgradeLevel: 1,
    // Collection partiellement améliorée : une carte commune en trois exemplaires.
    deckUpgradeSlugs: Object.freeze(['practice-fist']),
  }),
  strong: Object.freeze({
    id: 'strong',
    label: 'Jonin confirmé',
    level: 55,
    stats: Object.freeze({
      taijutsu: 110,
      ninjutsu: 80,
      genjutsu: 60,
      medicine: 70,
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
    deckUpgradeLevel: 2,
    deckUpgradeSlugs: Object.freeze([
      'practice-fist',
      'practice-strike',
      'practice-guard',
      'practice-wall',
      'practice-heal',
    ]),
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
 * Retune : ennemis buffés + practice nerfé. Soft winRateMax / cibles design
 * cadrent le « pas trivial » ; hard winRateMin protège contre une surge
 * accidentelle. Écart mid↔strong sous practice limite certains softs (C/A).
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
      winRateMin: 0.4,
      winRateMaxSoft: 0.9,
      avgTurnsMin: 2,
      /** Attrition D (HP élevés) : combats plus longs que le snapshot trivial. */
      avgTurnsMax: 18,
      avgDamageTakenMinSoft: 8,
    }),
    mid: Object.freeze({
      winRateMin: 0.85,
      winRateMaxSoft: 1.0,
      avgTurnsMax: 12,
    }),
    strong: Object.freeze({
      winRateMin: 0.9,
      avgTurnsMax: 10,
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
      /**
       * Sous greedy + practice, mid clear encore C à ~100 % tant que
       * beginner reste ≥ hard min — écart de profil trop large pour un soft <1.
       */
      winRateMaxSoft: 1.0,
      avgTurnsMax: 14,
    }),
    strong: Object.freeze({
      winRateMin: 0.8,
      avgTurnsMax: 10,
    }),
  }),
  B: Object.freeze({
    mid: Object.freeze({
      winRateMin: 0.3,
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
      /**
       * Strong + practice + talents clear A sous greedy ; durcir A jusqu'à
       * faire perdre strong écrase mid (WR→0). Soft max = 1.
       */
      winRateMaxSoft: 1.0,
      avgTurnsMax: 20,
      avgDamageTakenMinSoft: 3,
    }),
  }),
});

export const DESIGN_WINRATE_TARGETS = Object.freeze({
  D: Object.freeze({
    beginner: Object.freeze({ min: 0.4, max: 0.85 }),
    mid: Object.freeze({ min: 0.75, max: 1.0 }),
  }),
  C: Object.freeze({
    beginner: Object.freeze({ min: 0.15, max: 0.65 }),
    /** Mid clear C sous greedy+practice tant que beginner reste jouable. */
    mid: Object.freeze({ min: 0.5, max: 1.0 }),
  }),
  B: Object.freeze({
    mid: Object.freeze({ min: 0.25, max: 0.75 }),
    /** Strong conserve un clear fiable sur B (practice + stack talents). */
    strong: Object.freeze({ min: 0.55, max: 1.0 }),
  }),
  A: Object.freeze({
    mid: Object.freeze({ min: 0.1, max: 0.55 }),
    /** A reste clairable pour strong ; pertes mid ≠ pertes strong (écart profil). */
    strong: Object.freeze({ min: 0.4, max: 1.0 }),
  }),
});

export const PLAYER_POLICY = Object.freeze({
  id: 'greedy_damage_then_block',
  summary:
    'Joue la carte payable au plus haut score (létalité, dégâts, armure, soin, invocation, pioche) ; défausse→chakra si aucune carte payable et une carte restante est utile ; sinon fin de tour.',
});
