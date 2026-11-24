/** Identifiants de cadres de profil animés — partagés frontend / backend. */

export const PROFILE_FRAME_IDS = Object.freeze([
  'frame_ember',
  'frame_volt',
  'frame_mist',
  'frame_shadow',
  'frame_leaf',
]);

const known = new Set(PROFILE_FRAME_IDS);

export function isKnownProfileFrameId(frameId) {
  return known.has(frameId);
}

/** Métadonnées catalogue (prix ryo, libellés). */
export const PROFILE_FRAME_CATALOG = Object.freeze([
  Object.freeze({
    id: 'frame_ember',
    name: Object.freeze({ fr: 'Braise', en: 'Ember' }),
    description: Object.freeze({
      fr: 'Flammes et braises autour du portrait, reflet chaud sur la carte.',
      en: 'Flames and embers around the portrait, warm sheen on the card.',
    }),
    effect: 'ember',
    ryos: 800,
  }),
  Object.freeze({
    id: 'frame_volt',
    name: Object.freeze({ fr: 'Volt', en: 'Volt' }),
    description: Object.freeze({
      fr: 'Éclairs en zigzag sur le cadre, paillettes au survol.',
      en: 'Zigzag lightning on the frame, glitter on hover.',
    }),
    effect: 'volt',
    ryos: 1200,
  }),
  Object.freeze({
    id: 'frame_mist',
    name: Object.freeze({ fr: 'Brume', en: 'Mist' }),
    description: Object.freeze({
      fr: 'Voile de brume animé sur le portrait et la carte.',
      en: 'Animated mist veil over the portrait and card.',
    }),
    effect: 'mist',
    ryos: 900,
  }),
  Object.freeze({
    id: 'frame_shadow',
    name: Object.freeze({ fr: 'Ombre', en: 'Shadow' }),
    description: Object.freeze({
      fr: 'Auréole d’ombre tournoyante et reflet violet.',
      en: 'Swirling shadow aura with a violet sheen.',
    }),
    effect: 'shadow',
    ryos: 1500,
  }),
  Object.freeze({
    id: 'frame_leaf',
    name: Object.freeze({ fr: 'Feuille', en: 'Leaf' }),
    description: Object.freeze({
      fr: 'Feuilles autour du cadre, chute de feuilles sur la carte.',
      en: 'Leaves around the frame, falling leaves across the card.',
    }),
    effect: 'leaf',
    ryos: 700,
  }),
]);

export function getProfileFrame(frameId) {
  return PROFILE_FRAME_CATALOG.find(entry => entry.id === frameId) || null;
}
