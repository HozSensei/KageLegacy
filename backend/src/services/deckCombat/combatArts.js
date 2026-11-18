/**
 * Quatre arts de combat TCG — Taijutsu / Ninjutsu / Genjutsu / Médecine.
 * Vitesse et Intelligence sont abandonnées (remap passifs + crit carte).
 */

export const COMBAT_ARTS = Object.freeze(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

export const COMBAT_ART_SET = new Set(COMBAT_ARTS);

/** Bonus hors arts ; le Chakra max doit rester très rare dans le catalogue. */
export const EXTRA_PASSIVE_KEYS = Object.freeze(['maxHp', 'maxChakra', 'startingBlock']);

/**
 * Cartes double type (primaire = statType, secondaire ici).
 * ~volume faible pour pousser les decks 2-couleurs.
 */
export const DUAL_TYPE_SECONDARY = Object.freeze({
  'harmonie-des-cinq-vents': 'genjutsu',
  'eclipse-du-seuil': 'genjutsu',
  'luciole-guide': 'medicine',
  'dragon-de-nuage': 'taijutsu',
  'renard-aux-neuf-vents': 'ninjutsu',
  'clan-shizumori': 'ninjutsu',
  'aegis-ancestral': 'genjutsu',
  'voile-d-ombre': 'genjutsu',
  'frappe-opportuniste': 'genjutsu',
  'barrage-de-lames': 'ninjutsu',
  'mains-de-lumiere': 'genjutsu',
  'pilier-de-flammes': 'taijutsu',
  concentration: 'genjutsu',
  'vent-porteur': 'medicine',
  'serpente-d-eau': 'medicine',
  'serpent-d-eau': 'medicine',
  'corbeau-spectre': 'ninjutsu',
  'garde-du-sanctuaire': 'medicine',
  'gardien-du-sanctuaire': 'medicine',
});

export function normalizeArtKey(value) {
  if (value == null || value === '') return null;
  const key = String(value).trim().toLowerCase();
  if (key === 'medecine' || key === 'heredite' || key === 'héritage') return 'medicine';
  if (COMBAT_ART_SET.has(key)) return key;
  return null;
}

export function resolveSecondaryArt(slug, explicitSecondary = null) {
  const fromExplicit = normalizeArtKey(explicitSecondary);
  if (fromExplicit) return fromExplicit;
  if (!slug) return null;
  return normalizeArtKey(DUAL_TYPE_SECONDARY[slug]) || null;
}

/**
 * Remap vitesse / intelligence vers les arts et ignore la Dextérité héritée.
 * - vitesse → art primaire (tempo physique / même école)
 * - intelligence → secondaire si dual, sinon genjutsu (esprit), ou medicine si primaire médical
 */
export function remapAbandonedPassives(
  passive = {},
  { statType = null, secondaryStatType = null } = {},
) {
  const raw = passive && typeof passive === 'object' ? { ...passive } : {};
  const vit = Number(raw.vitesse) || 0;
  const intel = Number(raw.intelligence) || 0;
  delete raw.vitesse;
  delete raw.intelligence;
  delete raw.dexterity;

  if (raw.medecine != null) {
    raw.medicine = (Number(raw.medicine) || 0) + (Number(raw.medecine) || 0);
    delete raw.medecine;
  }

  const primary = normalizeArtKey(statType) || 'taijutsu';
  const secondary = normalizeArtKey(secondaryStatType);

  if (vit > 0) {
    raw[primary] = (Number(raw[primary]) || 0) + vit;
  }
  if (intel > 0) {
    let target = secondary;
    if (!target) {
      if (primary === 'medicine') target = 'medicine';
      else if (primary === 'genjutsu') target = 'genjutsu';
      else target = 'genjutsu';
    }
    raw[target] = (Number(raw[target]) || 0) + intel;
  }

  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const art = normalizeArtKey(key);
    const allowed = art || EXTRA_PASSIVE_KEYS.includes(key);
    if (!allowed) continue;
    const n = Number(value) || 0;
    if (n === 0) continue;
    const dest = art || key;
    out[dest] = (Number(out[dest]) || 0) + n;
  }
  return out;
}

/**
 * Critique : plus de scaling Vitesse.
 * Chance explicite sur la carte, ou dérivée de l’ancien passif vitesse (avant remap).
 */
export function deriveCritChance({
  critChance = null,
  passiveBeforeRemap = null,
  type = null,
  damage = 0,
} = {}) {
  if (critChance != null && Number.isFinite(Number(critChance))) {
    return Math.max(0, Math.min(50, Math.round(Number(critChance))));
  }
  const vit = Number(passiveBeforeRemap?.vitesse) || 0;
  if (vit <= 0) return 0;
  const isAttackish = type === 'attack' || Number(damage) > 0;
  if (!isAttackish) return 0;
  return Math.max(0, Math.min(25, 5 + vit * 5));
}

export function resolveCardCritChance(card) {
  if (!card) return 0;
  if (card.critChance != null) return Math.max(0, Math.min(50, Number(card.critChance) || 0));
  const effects = card.effects || [];
  const innate = effects.find(e => e && (e.type === 'innate_crit' || e.type === 'crit'));
  if (innate) return Math.max(0, Math.min(50, Number(innate.chance ?? innate.value) || 0));
  return 0;
}
