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
  Object.freeze({ templateId: 'ronin_bandit', rank: 'D', difficulty: 1.35 }),
  Object.freeze({ templateId: 'marsh_cutpurse', rank: 'D', difficulty: 1.35 }),
  Object.freeze({ templateId: 'scrapyard_dog', rank: 'D', difficulty: 1.35 }),
  Object.freeze({ templateId: 'kurogane_scout', rank: 'C', difficulty: 1.7 }),
  Object.freeze({ templateId: 'tide_sentinel', rank: 'C', difficulty: 1.7 }),
  Object.freeze({ templateId: 'ashen_captain', rank: 'B', difficulty: 1.7 }),
  Object.freeze({ templateId: 'ironroot_warden', rank: 'B', difficulty: 1.7 }),
  Object.freeze({ templateId: 'duskblade_ronin', rank: 'A', difficulty: 2.1 }),
]);

export const BALANCE_SIM = Object.freeze({
  fightsPerCell: 24,
  baseSeed: 0x4b414745, // 'KAGE'
  maxTurns: 40,
  reportFightsPerCell: 48,
  /** Runs complets (PV persistants) pour le filet mission. */
  missionRunsPerCell: 24,
  reportMissionRunsPerCell: 40,
});

/**
 * Seuils de clearance de mission (mode normal).
 * hard : CI — run trop injouable ; soft : trop trivial (--strict).
 *
 * @type {Partial<Record<MissionRank, Partial<Record<BalanceProfileId | 'starter', {
 *   clearanceMin?: number,
 *   clearanceMaxSoft?: number,
 * }>>>>}
 */
export const MISSION_CLEARANCE_THRESHOLDS = Object.freeze({
  D: Object.freeze({
    beginner: Object.freeze({ clearanceMin: 0, clearanceMaxSoft: 0.55 }),
    mid: Object.freeze({ clearanceMin: 0.15, clearanceMaxSoft: 0.9 }),
    strong: Object.freeze({ clearanceMin: 0.55 }),
    starter: Object.freeze({ clearanceMin: 0.15, clearanceMaxSoft: 0.75 }),
  }),
  C: Object.freeze({
    // Practice mid a WR≈0 en combat isolé C : pas de hard min, soft seulement.
    mid: Object.freeze({ clearanceMaxSoft: 0.55 }),
    strong: Object.freeze({ clearanceMin: 0.35 }),
  }),
  B: Object.freeze({
    // Boss + attrition : filet bas pour détecter une régression totale.
    strong: Object.freeze({ clearanceMin: 0.15, clearanceMaxSoft: 0.9 }),
  }),
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
    /**
     * Le profil practice « beginner » est bien plus faible que le deck starter
     * réel : hard mins à 0 (filet soft/design + fixture starter dans le rapport).
     */
    beginner: Object.freeze({
      winRateMin: 0,
      winRateMaxSoft: 0.5,
      avgTurnsMin: 2,
      avgTurnsMax: 24,
      avgDamageTakenMinSoft: 20,
    }),
    mid: Object.freeze({
      /** Practice mid ≠ vrai deck Chunin ; plancher bas, design soft plus haut. */
      winRateMin: 0.25,
      winRateMaxSoft: 1.0,
      avgTurnsMax: 16,
    }),
    strong: Object.freeze({
      winRateMin: 0.85,
      avgTurnsMax: 12,
    }),
  }),
  C: Object.freeze({
    beginner: Object.freeze({
      winRateMin: 0,
      winRateMaxSoft: 0.25,
      avgTurnsMin: 2,
      avgTurnsMax: 28,
      avgDamageTakenMinSoft: 25,
    }),
    mid: Object.freeze({
      winRateMin: 0,
      winRateMaxSoft: 0.55,
      avgTurnsMax: 20,
    }),
    strong: Object.freeze({
      winRateMin: 0.55,
      avgTurnsMax: 16,
    }),
  }),
  B: Object.freeze({
    mid: Object.freeze({
      winRateMin: 0,
      winRateMaxSoft: 0.55,
      avgTurnsMax: 24,
      avgDamageTakenMinSoft: 15,
    }),
    strong: Object.freeze({
      winRateMin: 0.35,
      winRateMaxSoft: 1.0,
      avgTurnsMax: 18,
    }),
  }),
  A: Object.freeze({
    mid: Object.freeze({
      winRateMin: 0,
      winRateMaxSoft: 0.4,
      avgTurnsMax: 30,
      avgDamageTakenMinSoft: 20,
    }),
    strong: Object.freeze({
      winRateMin: 0.2,
      winRateMaxSoft: 0.9,
      avgTurnsMax: 26,
      avgDamageTakenMinSoft: 10,
    }),
  }),
});

export const DESIGN_WINRATE_TARGETS = Object.freeze({
  D: Object.freeze({
    beginner: Object.freeze({ min: 0.0, max: 0.35 }),
    mid: Object.freeze({ min: 0.25, max: 1.0 }),
  }),
  C: Object.freeze({
    beginner: Object.freeze({ min: 0.0, max: 0.15 }),
    mid: Object.freeze({ min: 0.0, max: 0.55 }),
  }),
  B: Object.freeze({
    mid: Object.freeze({ min: 0.0, max: 0.4 }),
    strong: Object.freeze({ min: 0.35, max: 1.0 }),
  }),
  A: Object.freeze({
    mid: Object.freeze({ min: 0.0, max: 0.3 }),
    strong: Object.freeze({ min: 0.2, max: 0.85 }),
  }),
});

export const PLAYER_POLICY = Object.freeze({
  id: 'greedy_damage_then_block',
  summary:
    'Joue la carte payable au plus haut score (létalité, dégâts, armure, soin, invocation, pioche) ; défausse→chakra si aucune carte payable et une carte restante est utile ; sinon fin de tour.',
});
