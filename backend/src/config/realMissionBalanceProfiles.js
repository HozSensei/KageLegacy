/**
 * Profils joueur « types » pour simuler des missions réelles avec un deck JSON exporté.
 *
 * Distincts de `BALANCE_PROFILES` (practice CI) : ici les stats / talentCodes
 * reflètent une allocation réaliste de l’arbre Taijutsu (pas de blade_swift legacy).
 *
 * Usage : `npm run sim:real-mission-balance --prefix backend -- --deck path.json`
 *
 * ---------------------------------------------------------------------------
 * Pistes design (NON appliquées live — à confirmer avant changement de règles) :
 *
 * 1) Par rang gagné (Genin, Chunin, Jonin…), +5 cartes max deck.
 *    Aujourd’hui DECK_MAX_SIZE = 30 fixe (`deckService.js`). Si adopté :
 *    Aspirant 20–25 ? → Genin 20–30 → Chunin 20–35 → etc.
 *    Les scripts d’export / sim acceptent tout deck valide 20–30 tant que
 *    la règle live n’a pas bougé ; ne pas élargir le validateur sans go design.
 *
 * 2) Augmenter les PV à chaque montée de niveau.
 *    Aujourd’hui le level-up n’accorde aucune stat auto — seulement +1 point
 *    de talent (`playerCharacterService` / applyXpGain). Les PV viennent de
 *    BASE_MAX_HP + passifs cartes + nœuds talents (maxHp). Une courbe
 *    « +X PV / niveau » rendrait les profils faible/moyen/haut plus
 *    différenciés sans dépendre uniquement de l’arbre ; à calibrer avec
 *    ces sims avant d’activer en live.
 * ---------------------------------------------------------------------------
 */

/** @typedef {'faible'|'moyen'|'haut'} RealMissionProfileId */

/**
 * Allocations documentées (arbre `talentTreeNodes.js`, voie taijutsu).
 * Les `talentCodes` sont les effect_code notables ; les stats sont les bonus
 * de nœuds « stat » uniquement (les passifs de deck s’ajoutent à l’exécution).
 */
export const REAL_MISSION_PROFILES = Object.freeze({
  faible: Object.freeze({
    id: 'faible',
    label: 'Taijutsu faible (lvl 5)',
    level: 5,
    talentPoints: 5,
    branch: 'taijutsu',
    /**
     * Allocation 5 pts :
     * - taijutsu_stance ×3 → +6 Taijutsu
     * - taijutsu_vitality ×1 → +5 maxHp  (4 pts → débloque palier 2)
     * - taijutsu_pressure → relentless_press
     */
    investment: Object.freeze([
      Object.freeze({ nodeId: 'taijutsu_stance', ranks: 3 }),
      Object.freeze({ nodeId: 'taijutsu_vitality', ranks: 1 }),
      Object.freeze({ nodeId: 'taijutsu_pressure', ranks: 1 }),
    ]),
    stats: Object.freeze({
      taijutsu: 6,
      ninjutsu: 0,
      genjutsu: 0,
      medicine: 0,
      maxHp: 5,
      maxChakra: 0,
      startingBlock: 0,
    }),
    talentCodes: Object.freeze(['relentless_press']),
  }),
  moyen: Object.freeze({
    id: 'moyen',
    label: 'Taijutsu moyen (lvl 15)',
    level: 15,
    talentPoints: 15,
    branch: 'taijutsu',
    /**
     * Allocation 15 pts (jusqu’au palier 3 / seuil 15) :
     * - stance×3, vitality×2, pressure, iron_guard, quick_hand×3,
     *   counter, force×3, grip
     */
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
    stats: Object.freeze({
      taijutsu: 21, // 6+6+9
      ninjutsu: 0,
      genjutsu: 0,
      medicine: 0,
      maxHp: 10,
      maxChakra: 0,
      startingBlock: 0,
    }),
    talentCodes: Object.freeze([
      'relentless_press',
      'iron_guard',
      'counter_strike',
      'bleed_focus',
    ]),
  }),
  haut: Object.freeze({
    id: 'haut',
    label: 'Taijutsu haut (lvl 30)',
    level: 30,
    talentPoints: 30,
    branch: 'taijutsu',
    /**
     * Allocation 30 pts (palier 5 débloqué ; palier 6 req. 30 déjà dépensés
     * donc inaccessible avec exactement 30 pts) :
     * - stats + notables jusqu’à combo_master
     */
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
    stats: Object.freeze({
      taijutsu: 27, // 6+6+9+6
      ninjutsu: 0,
      genjutsu: 0,
      medicine: 0,
      maxHp: 49, // 15+16+18
      maxChakra: 0,
      startingBlock: 3,
    }),
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
});

/** Rangs de mission couverts par défaut (alignés enemyTemplates / path builder). */
export const REAL_MISSION_RANKS = Object.freeze(['D', 'C', 'B', 'A']);

export const REAL_MISSION_SIM = Object.freeze({
  runsPerCell: 24,
  reportRunsPerCell: 40,
  maxTurns: 40,
  baseSeed: 0x5245414c, // 'REAL'
});
