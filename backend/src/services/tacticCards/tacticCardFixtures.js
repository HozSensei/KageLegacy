/**
 * Définitions cartes tactiques en mémoire (alignées migration 039).
 * Utilisées par les benchmarks / simulations sans BDD.
 */

export const TACTIC_CARD_FIXTURES = [
  {
    slug: 'tai-parade-ecole',
    name_fr: "Parade de l'École",
    name_en: 'Academy Parry',
    card_type: 'defense',
    stat_type: 'taijutsu',
    trigger_kind: 'targeted_twice_same_tour',
    trigger_params: { minHits: 2 },
    target_kind: 'self',
    target_params: {},
    effect_kind: 'damage_reduction_pct',
    effect_params: { basePct: 0.35, statScale: 0.05 },
    narrative_key: 'card_parry',
  },
  {
    slug: 'med-pansement-rapide',
    name_fr: 'Pansement de terrain',
    name_en: 'Field Dressing',
    card_type: 'support',
    stat_type: 'medecine',
    trigger_kind: 'ally_below_pv_pct',
    trigger_params: { threshold: 50 },
    target_kind: 'ally_lowest_pv',
    target_params: {},
    effect_kind: 'heal_flat',
    effect_params: { base: 12, statScale: 1.2 },
    narrative_key: 'card_field_heal',
  },
  {
    slug: 'nin-eclair-discret',
    name_fr: 'Éclair discret',
    name_en: 'Subtle Bolt',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    trigger_kind: 'on_attack',
    trigger_params: {},
    target_kind: 'enemy_defender',
    target_params: {},
    effect_kind: 'bonus_damage',
    effect_params: { base: 6, statScale: 0.8 },
    narrative_key: 'card_chip',
  },
  {
    slug: 'gen-voile-doubles',
    name_fr: 'Voile de doubles',
    name_en: 'Veil of Doubles',
    card_type: 'defense',
    stat_type: 'genjutsu',
    trigger_kind: 'targeted_twice_same_tour',
    trigger_params: { minHits: 2 },
    target_kind: 'self',
    target_params: {},
    effect_kind: 'damage_reduction_pct',
    effect_params: { basePct: 0.55, statScale: 0.04 },
    narrative_key: 'card_bunshin',
  },
  {
    slug: 'suiton-cage-aqueuse',
    name_fr: 'Suiton — Cage aqueuse',
    name_en: 'Suiton — Aqua Cage',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    element_affinity: 'Suiton',
    trigger_kind: 'on_defend_against_attack',
    trigger_params: {},
    target_kind: 'enemy_attacker',
    target_params: {},
    effect_kind: 'paralysis',
    effect_params: { duration: 1, statThreshold: 8 },
    narrative_key: 'card_water_cage',
  },
  {
    slug: 'katon-mur-braises',
    name_fr: 'Katon — Mur de braises',
    name_en: 'Katon — Ember Wall',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    element_affinity: 'Katon',
    trigger_kind: 'self_below_pv_pct',
    trigger_params: { threshold: 40 },
    target_kind: 'self',
    target_params: {},
    effect_kind: 'damage_reduction_pct',
    effect_params: { basePct: 0.4, statScale: 0.03 },
    narrative_key: 'card_ember_wall',
  },
  {
    slug: 'med-soin-zone',
    name_fr: 'Herbes de regroupement',
    name_en: 'Squad Recovery Herbs',
    card_type: 'support',
    stat_type: 'medecine',
    trigger_kind: 'all_allies_below_pv_pct',
    trigger_params: { threshold: 50 },
    target_kind: 'all_allies',
    target_params: {},
    effect_kind: 'heal_pct_max',
    effect_params: { basePct: 0.12, statScale: 0.01 },
    narrative_key: 'card_zone_heal',
  },
  {
    slug: 'raiton-surcharge',
    name_fr: 'Raiton — Surcharge',
    name_en: 'Raiton — Overcharge',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    element_affinity: 'Raiton',
    trigger_kind: 'on_attack',
    trigger_params: {},
    target_kind: 'enemy_defender',
    target_params: {},
    effect_kind: 'bonus_damage',
    effect_params: { base: 8, statScale: 0.9 },
    narrative_key: 'card_lightning',
  },
  {
    slug: 'gen-illusion-mineure',
    name_fr: 'Genjutsu — Brume mentale',
    name_en: 'Genjutsu — Mind Haze',
    card_type: 'attack',
    stat_type: 'genjutsu',
    trigger_kind: 'on_genjutsu_success',
    trigger_params: {},
    target_kind: 'enemy_defender',
    target_params: {},
    effect_kind: 'confusion',
    effect_params: { duration: 1, statThreshold: 7 },
    narrative_key: 'card_mind_haze',
  },
  {
    slug: 'doton-racines',
    name_fr: "Doton — Racines d'ancrage",
    name_en: 'Doton — Anchoring Roots',
    card_type: 'defense',
    stat_type: 'ninjutsu',
    element_affinity: 'Doton',
    trigger_kind: 'on_defend_against_attack',
    trigger_params: {},
    target_kind: 'self',
    target_params: {},
    effect_kind: 'damage_reduction_pct',
    effect_params: { basePct: 0.3, statScale: 0.04 },
    narrative_key: 'card_earth_roots',
  },
  {
    slug: 'futon-lame-retour',
    name_fr: 'Futon — Lame de retour',
    name_en: 'Futon — Returning Blade',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    element_affinity: 'Futon',
    trigger_kind: 'on_defend_against_attack',
    trigger_params: {},
    target_kind: 'enemy_attacker',
    target_params: {},
    effect_kind: 'bonus_damage',
    effect_params: { base: 7, statScale: 0.7 },
    narrative_key: 'card_wind_blade',
  },
  {
    slug: 'legende-suiton-dragon',
    name_fr: 'Suiton — Serpent des crues',
    name_en: 'Suiton — Flood Serpent',
    card_type: 'attack',
    stat_type: 'ninjutsu',
    element_affinity: 'Suiton',
    trigger_kind: 'all_allies_below_pv_pct',
    trigger_params: { threshold: 35 },
    target_kind: 'all_enemies_active',
    target_params: {},
    effect_kind: 'bonus_damage',
    effect_params: { base: 18, statScale: 1.1 },
    narrative_key: 'card_water_dragon',
  },
];

const BY_SLUG = Object.fromEntries(TACTIC_CARD_FIXTURES.map((c) => [c.slug, c]));

export function getTacticCardFixture(slug) {
  const def = BY_SLUG[slug];
  if (!def) throw new Error(`Unknown tactic card slug: ${slug}`);
  return def;
}

/** Format compatible initTacticCardOnFighter (comme une ligne DB équipée). */
export function makeEquippedCard(slug, { userTacticCardId = 1, chargesRemaining = 5 } = {}) {
  const def = getTacticCardFixture(slug);
  return {
    user_tactic_card_id: userTacticCardId,
    charges_remaining: chargesRemaining,
    slug: def.slug,
    name_fr: def.name_fr,
    name_en: def.name_en,
    card_type: def.card_type,
    stat_type: def.stat_type,
    element_affinity: def.element_affinity ?? null,
    trigger_kind: def.trigger_kind,
    trigger_params: def.trigger_params,
    target_kind: def.target_kind,
    target_params: def.target_params,
    effect_kind: def.effect_kind,
    effect_params: def.effect_params,
    narrative_key: def.narrative_key,
  };
}

/** Équipe une carte par ninja (slugs[i] sur ninjas[i]). */
export function equipCardsOnSquad(ninjas, slugs) {
  const map = {};
  ninjas.forEach((ninja, index) => {
    const slug = slugs[index];
    if (slug) {
      map[ninja.id] = makeEquippedCard(slug, { userTacticCardId: ninja.id * 10 + index });
    }
  });
  return map;
}

export const STARTER_LOADOUT = ['tai-parade-ecole', 'med-pansement-rapide', 'nin-eclair-discret'];

export const RARE_LOADOUT = ['gen-voile-doubles', 'med-soin-zone', 'suiton-cage-aqueuse'];

export const MIXED_LOADOUT = ['tai-parade-ecole', 'raiton-surcharge', 'gen-illusion-mineure'];
