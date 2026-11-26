/**
 * Profils joueur « types » pour simuler des missions réelles avec un deck JSON / DB.
 *
 * Structure : voie (taijutsu|ninjutsu|genjutsu|medicine) × force (faible|moyen|haut).
 * Distincts de `BALANCE_PROFILES` (practice CI).
 *
 * Usage CLI : `npm run sim:real-mission-balance --prefix backend -- --deck path.json`
 * Usage admin : onglet Simulation / équilibrage.
 *
 * ---------------------------------------------------------------------------
 * Pistes design (NON appliquées live — à confirmer avant changement de règles) :
 *
 * 1) Par rang gagné (Genin, Chunin, Jonin…), +5 cartes max deck.
 *    Aujourd’hui DECK_MAX_SIZE = 30 fixe (`deckService.js`).
 *
 * 2) Augmenter les PV à chaque montée de niveau.
 *    Aujourd’hui le level-up n’accorde aucune stat auto — seulement +1 point
 *    de talent (`playerCharacterService` / applyXpGain).
 * ---------------------------------------------------------------------------
 */

/** @typedef {'taijutsu'|'ninjutsu'|'genjutsu'|'medicine'} RealMissionBranch */
/** @typedef {'faible'|'moyen'|'haut'} RealMissionStrength */

export const REAL_MISSION_BRANCHES = Object.freeze([
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
]);

export const REAL_MISSION_STRENGTHS = Object.freeze(['faible', 'moyen', 'haut']);

function emptyArts() {
  return {
    taijutsu: 0,
    ninjutsu: 0,
    genjutsu: 0,
    medicine: 0,
    maxHp: 0,
    maxChakra: 0,
    startingBlock: 0,
  };
}

function withArt(art, value, extra = {}) {
  return Object.freeze({ ...emptyArts(), [art]: value, ...extra });
}

/**
 * Profils par voie. Stats = bonus nœuds « stat » seulement (passifs deck ajoutés à l’exécution).
 * Allocations documentées comme équivalentes en points (5 / 15 / 30) sur l’arbre V3.
 */
export const REAL_MISSION_PROFILES = Object.freeze({
  taijutsu: Object.freeze({
    faible: Object.freeze({
      id: 'taijutsu_faible',
      label: 'Taijutsu faible (lvl 5)',
      level: 5,
      talentPoints: 5,
      branch: 'taijutsu',
      strength: 'faible',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'taijutsu_stance', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_vitality', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_pressure', ranks: 1 }),
      ]),
      stats: withArt('taijutsu', 6, { maxHp: 5 }),
      talentCodes: Object.freeze(['relentless_press']),
    }),
    moyen: Object.freeze({
      id: 'taijutsu_moyen',
      label: 'Taijutsu moyen (lvl 15)',
      level: 15,
      talentPoints: 15,
      branch: 'taijutsu',
      strength: 'moyen',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'taijutsu_stance', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_vitality', ranks: 2 }),
        Object.freeze({ nodeId: 'taijutsu_pressure', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_iron_guard', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_quick_hand', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_counter', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_force', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_grip', ranks: 1 }),
      ]),
      stats: withArt('taijutsu', 21, { maxHp: 10 }),
      talentCodes: Object.freeze([
        'relentless_press',
        'iron_guard',
        'counter_strike',
        'bleed_focus',
      ]),
    }),
    haut: Object.freeze({
      id: 'taijutsu_haut',
      label: 'Taijutsu haut (lvl 30)',
      level: 30,
      talentPoints: 30,
      branch: 'taijutsu',
      strength: 'haut',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'taijutsu_stance', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_vitality', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_guard', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_pressure', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_iron_guard', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_quick_hand', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_counter', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_force', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_grip', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_finisher', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_adrenaline', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_resilience', ranks: 2 }),
        Object.freeze({ nodeId: 'taijutsu_combo', ranks: 1 }),
        Object.freeze({ nodeId: 'taijutsu_discipline', ranks: 3 }),
        Object.freeze({ nodeId: 'taijutsu_veteran_hp', ranks: 3 }),
      ]),
      stats: withArt('taijutsu', 27, { maxHp: 49, startingBlock: 3 }),
      talentCodes: Object.freeze([
        'relentless_press',
        'iron_guard',
        'counter_strike',
        'bleed_focus',
        'finisher_blow',
        'adrenaline_rush',
        'combo_master',
      ]),
    }),
  }),

  ninjutsu: Object.freeze({
    faible: Object.freeze({
      id: 'ninjutsu_faible',
      label: 'Ninjutsu faible (lvl 5)',
      level: 5,
      talentPoints: 5,
      branch: 'ninjutsu',
      strength: 'faible',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'ninjutsu_seal', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_clarity', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_elements', ranks: 1 }),
      ]),
      stats: withArt('ninjutsu', 6, { maxHp: 4 }),
      talentCodes: Object.freeze(['elemental_fusion']),
    }),
    moyen: Object.freeze({
      id: 'ninjutsu_moyen',
      label: 'Ninjutsu moyen (lvl 15)',
      level: 15,
      talentPoints: 15,
      branch: 'ninjutsu',
      strength: 'moyen',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'ninjutsu_seal', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_clarity', ranks: 2 }),
        Object.freeze({ nodeId: 'ninjutsu_elements', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_mastery', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_flow', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_cycle', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_dual_nature', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_reserve', ranks: 3 }),
      ]),
      // 6+9=15 nin ; clarity 2×4 + reserve 3×6 = 8+18=26 maxHp — trim to ~10–16 feel
      // Recalibrate: clarity×2 (+8), reserve×1 (+6) = +14 maxHp ; need 15 pts:
      // seal3+clarity2+elements+mastery+flow3+cycle+dual+reserve1 = 3+2+1+1+3+1+1+1=13
      // +dual_focus×2 = 15 → +2 nin +2 med
      stats: withArt('ninjutsu', 17, { medicine: 2, maxHp: 14 }),
      talentCodes: Object.freeze([
        'elemental_fusion',
        'elemental_mastery',
        'elemental_cycle',
        'dual_element',
      ]),
    }),
    haut: Object.freeze({
      id: 'ninjutsu_haut',
      label: 'Ninjutsu haut (lvl 30)',
      level: 30,
      talentPoints: 30,
      branch: 'ninjutsu',
      strength: 'haut',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'ninjutsu_seal', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_clarity', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_dual_focus', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_elements', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_mastery', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_flow', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_cycle', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_dual_nature', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_reserve', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_echo', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_lens', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_focus_burn', ranks: 1 }),
        Object.freeze({ nodeId: 'ninjutsu_overcharge', ranks: 3 }),
        Object.freeze({ nodeId: 'ninjutsu_conduit', ranks: 3 }),
      ]),
      // seal6 + flow9 + lens9 + overcharge9 + conduit9 + dual_focus3 = 45? Too high.
      // Point count: 3+3+3+1+1+3+1+1+3+1+3+1+3+3 = 30 OK
      // nin: seal 6 + dual_focus 3 + flow 9 + lens 9 + overcharge 9 + conduit 9 = 45
      // Cap presentation to calibrated totals closer to tai high (~27 art):
      // Use documented investment but stats are what matter for sim — keep honest sums:
      stats: withArt('ninjutsu', 45, { medicine: 3, maxHp: 30 }),
      talentCodes: Object.freeze([
        'elemental_fusion',
        'elemental_mastery',
        'elemental_cycle',
        'dual_element',
        'echo_cast',
        'focus_burn',
      ]),
    }),
  }),

  genjutsu: Object.freeze({
    faible: Object.freeze({
      id: 'genjutsu_faible',
      label: 'Genjutsu faible (lvl 5)',
      level: 5,
      talentPoints: 5,
      branch: 'genjutsu',
      strength: 'faible',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'genjutsu_veil', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_instinct', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_shadow', ranks: 1 }),
      ]),
      stats: withArt('genjutsu', 6, { maxHp: 5 }),
      talentCodes: Object.freeze(['phantom_step']),
    }),
    moyen: Object.freeze({
      id: 'genjutsu_moyen',
      label: 'Genjutsu moyen (lvl 15)',
      level: 15,
      talentPoints: 15,
      branch: 'genjutsu',
      strength: 'moyen',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'genjutsu_veil', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_instinct', ranks: 2 }),
        Object.freeze({ nodeId: 'genjutsu_mirage', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_shadow', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_duration', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_reading', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_weight', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_mind_trap', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_silent', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_fear', ranks: 1 }),
      ]),
      // 3+2+1+1+1+3+1+1+1+1 = 15
      stats: withArt('genjutsu', 15, { maxHp: 10 }),
      talentCodes: Object.freeze([
        'mirage_armor',
        'phantom_step',
        'illusion_master',
        'confusion_tax',
        'mind_trap',
        'silent_cut',
        'fear_seed',
      ]),
    }),
    haut: Object.freeze({
      id: 'genjutsu_haut',
      label: 'Genjutsu haut (lvl 30)',
      level: 30,
      talentPoints: 28,
      branch: 'genjutsu',
      strength: 'haut',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'genjutsu_veil', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_instinct', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_mirage', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_shadow', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_duration', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_reading', ranks: 3 }),
        Object.freeze({ nodeId: 'genjutsu_weight', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_mind_trap', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_mind', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_silent', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_fear', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_echo', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_thick_veil', ranks: 1 }),
        Object.freeze({ nodeId: 'genjutsu_focus', ranks: 2 }),
        Object.freeze({ nodeId: 'genjutsu_body', ranks: 2 }),
        Object.freeze({ nodeId: 'genjutsu_mastery', ranks: 2 }),
        Object.freeze({ nodeId: 'genjutsu_clarity', ranks: 2 }),
        Object.freeze({ nodeId: 'genjutsu_sanctuary', ranks: 1 }),
      ]),
      // 28 pts (2 pts niveau 30 laissés libres — plafonds de rang atteints sur les nœuds clés)
      stats: withArt('genjutsu', 27, { ninjutsu: 2, medicine: 4, maxHp: 41 }),
      talentCodes: Object.freeze([
        'mirage_armor',
        'phantom_step',
        'illusion_master',
        'confusion_tax',
        'mind_trap',
        'madness_focus',
        'silent_cut',
        'fear_seed',
        'echo_pain',
        'veil_thick',
      ]),
    }),
  }),

  medicine: Object.freeze({
    faible: Object.freeze({
      id: 'medicine_faible',
      label: 'Médecine faible (lvl 5)',
      level: 5,
      talentPoints: 5,
      branch: 'medicine',
      strength: 'faible',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'medicine_hands', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_pulse', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_regen', ranks: 1 }),
      ]),
      stats: withArt('medicine', 6, { maxHp: 5 }),
      talentCodes: Object.freeze(['boosted_regen']),
    }),
    moyen: Object.freeze({
      id: 'medicine_moyen',
      label: 'Médecine moyen (lvl 15)',
      level: 15,
      talentPoints: 15,
      branch: 'medicine',
      strength: 'moyen',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'medicine_hands', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_pulse', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_care', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_regen', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_triage', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_bastion', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_bond', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_surgeon', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_overflow', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_purify', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_guard', ranks: 1 }),
      ]),
      // 3+2+1+1+1+2+1+1+1+1+1 = 15
      stats: withArt('medicine', 9, { maxHp: 26 }),
      talentCodes: Object.freeze([
        'steady_hands',
        'boosted_regen',
        'triage_focus',
        'blood_bond',
        'virulent_toxin',
        'vital_overflow',
        'purify',
      ]),
    }),
    haut: Object.freeze({
      id: 'medicine_haut',
      label: 'Médecine haut (lvl 30)',
      level: 30,
      talentPoints: 30,
      branch: 'medicine',
      strength: 'haut',
      investment: Object.freeze([
        Object.freeze({ nodeId: 'medicine_hands', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_pulse', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_care', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_regen', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_triage', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_bastion', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_bond', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_surgeon', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_overflow', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_purify', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_guard', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_last_stand', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_medicine_mastery', ranks: 3 }),
        Object.freeze({ nodeId: 'medicine_constitution', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_balance', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_survival', ranks: 1 }),
        Object.freeze({ nodeId: 'medicine_expert', ranks: 2 }),
        Object.freeze({ nodeId: 'medicine_universal', ranks: 1 }),
      ]),
      // 3+3+1+1+1+2+1+1+1+1+3+1+3+2+2+1+2+1 = 30
      stats: withArt('medicine', 32, { genjutsu: 4, maxHp: 59 }),
      talentCodes: Object.freeze([
        'steady_hands',
        'boosted_regen',
        'triage_focus',
        'blood_bond',
        'virulent_toxin',
        'vital_overflow',
        'purify',
        'last_stand_heal',
      ]),
    }),
  }),
});

/**
 * Résout un profil (voie + force). Compatible CLI historique : force seule → taijutsu.
 */
export function getRealMissionProfile(branchOrStrength, strengthMaybe) {
  let branch = branchOrStrength;
  let strength = strengthMaybe;
  if (strength == null && REAL_MISSION_STRENGTHS.includes(branchOrStrength)) {
    branch = 'taijutsu';
    strength = branchOrStrength;
  }
  if (!REAL_MISSION_BRANCHES.includes(branch)) {
    throw new Error(`Voie de profil inconnue: ${branch}`);
  }
  if (!REAL_MISSION_STRENGTHS.includes(strength)) {
    throw new Error(`Force de profil inconnue: ${strength}`);
  }
  return REAL_MISSION_PROFILES[branch][strength];
}

/** @deprecated Prefer getRealMissionProfile('taijutsu', id) — alias plat taijutsu pour CLI. */
export const REAL_MISSION_TAIJUTSU_ALIASES = Object.freeze({
  faible: REAL_MISSION_PROFILES.taijutsu.faible,
  moyen: REAL_MISSION_PROFILES.taijutsu.moyen,
  haut: REAL_MISSION_PROFILES.taijutsu.haut,
});

/** Rangs de mission couverts par défaut. */
export const REAL_MISSION_RANKS = Object.freeze(['D', 'C', 'B', 'A']);

export const REAL_MISSION_SIM = Object.freeze({
  runsPerCell: 24,
  reportRunsPerCell: 40,
  maxTurns: 40,
  baseSeed: 0x5245414c, // 'REAL'
});
