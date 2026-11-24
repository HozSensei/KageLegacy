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
      fr: 'Flammes stylisées autour du portrait.',
      en: 'Stylized flames around the portrait.',
    }),
    effect: 'ember',
    ryos: 800,
  }),
  Object.freeze({
    id: 'frame_volt',
    name: Object.freeze({ fr: 'Volt', en: 'Volt' }),
    description: Object.freeze({
      fr: 'Éclairs électriques sur le cadre.',
      en: 'Electric sparks on the frame.',
    }),
    effect: 'volt',
    ryos: 1200,
  }),
  Object.freeze({
    id: 'frame_mist',
    name: Object.freeze({ fr: 'Brume', en: 'Mist' }),
    description: Object.freeze({
      fr: 'Voile de brume animé.',
      en: 'Animated mist veil.',
    }),
    effect: 'mist',
    ryos: 900,
  }),
  Object.freeze({
    id: 'frame_shadow',
    name: Object.freeze({ fr: 'Ombre', en: 'Shadow' }),
    description: Object.freeze({
      fr: 'Auréole d’ombre tournoyante.',
      en: 'Swirling shadow aura.',
    }),
    effect: 'shadow',
    ryos: 1500,
  }),
  Object.freeze({
    id: 'frame_leaf',
    name: Object.freeze({ fr: 'Feuille', en: 'Leaf' }),
    description: Object.freeze({
      fr: 'Feuilles tournoyantes autour du cadre.',
      en: 'Orbiting leaves around the frame.',
    }),
    effect: 'leaf',
    ryos: 700,
  }),
]);

export function getProfileFrame(frameId) {
  return PROFILE_FRAME_CATALOG.find(entry => entry.id === frameId) || null;
}
