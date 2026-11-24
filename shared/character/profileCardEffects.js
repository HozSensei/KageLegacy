/** Effets atmosphériques / reflet sur la fiche profil — cosmétiques boutique séparés des cadres. */

export const PROFILE_CARD_EFFECT_IDS = Object.freeze([
  'fx_sheen_gold',
  'fx_sheen_aurora',
  'fx_sheen_ruby',
  'fx_leaves',
  'fx_rain',
  'fx_snow',
  'fx_mist_fade',
]);

const known = new Set(PROFILE_CARD_EFFECT_IDS);

export function isKnownProfileCardEffectId(effectId) {
  return known.has(effectId);
}

/** Métadonnées catalogue (prix ryo, libellés, type d’effet CSS). */
export const PROFILE_CARD_EFFECT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'fx_sheen_gold',
    name: Object.freeze({ fr: 'Reflet ambre', en: 'Amber sheen' }),
    description: Object.freeze({
      fr: 'Balayage doré sur toute la fiche, façon carte rare.',
      en: 'Golden sweep across the card, like a rare foil.',
    }),
    effect: 'sheen_gold',
    ryos: 700,
  }),
  Object.freeze({
    id: 'fx_sheen_aurora',
    name: Object.freeze({ fr: 'Reflet aurore', en: 'Aurora sheen' }),
    description: Object.freeze({
      fr: 'Reflet multicolore qui traverse la carte.',
      en: 'Multicolor sheen that drifts across the card.',
    }),
    effect: 'sheen_aurora',
    ryos: 1100,
  }),
  Object.freeze({
    id: 'fx_sheen_ruby',
    name: Object.freeze({ fr: 'Reflet rubis', en: 'Ruby sheen' }),
    description: Object.freeze({
      fr: 'Lueur cramoisie sur la surface de la fiche.',
      en: 'Crimson glow across the profile card.',
    }),
    effect: 'sheen_ruby',
    ryos: 900,
  }),
  Object.freeze({
    id: 'fx_leaves',
    name: Object.freeze({ fr: 'Feuilles mortes', en: 'Falling leaves' }),
    description: Object.freeze({
      fr: 'Feuilles d’automne qui tombent sur la carte.',
      en: 'Autumn leaves drifting down the card.',
    }),
    effect: 'leaves',
    ryos: 850,
  }),
  Object.freeze({
    id: 'fx_rain',
    name: Object.freeze({ fr: 'Pluie', en: 'Rain' }),
    description: Object.freeze({
      fr: 'Fine pluie qui traverse la fiche.',
      en: 'Light rain falling across the card.',
    }),
    effect: 'rain',
    ryos: 800,
  }),
  Object.freeze({
    id: 'fx_snow',
    name: Object.freeze({ fr: 'Neige', en: 'Snow' }),
    description: Object.freeze({
      fr: 'Flocons qui tombent doucement sur la carte.',
      en: 'Soft snowfall over the card.',
    }),
    effect: 'snow',
    ryos: 950,
  }),
  Object.freeze({
    id: 'fx_mist_fade',
    name: Object.freeze({ fr: 'Brume dissipée', en: 'Fading mist' }),
    description: Object.freeze({
      fr: 'Voile de brume qui se forme et se dissipe.',
      en: 'A mist veil that forms and fades away.',
    }),
    effect: 'mist_fade',
    ryos: 750,
  }),
]);

export function getProfileCardEffect(effectId) {
  return PROFILE_CARD_EFFECT_CATALOG.find(entry => entry.id === effectId) || null;
}
