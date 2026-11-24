/** Identifiants de cadres de profil animés — partagés frontend / backend. */

export const PROFILE_FRAME_IDS = Object.freeze([
  'frame_ember',
  'frame_volt',
  'frame_mist',
  'frame_shadow',
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
      fr: 'Auréole de braise tournoyante autour du portrait.',
      en: 'Swirling ember aura around the portrait.',
    }),
    effect: 'ember',
    ryos: 800,
  }),
  Object.freeze({
    id: 'frame_volt',
    name: Object.freeze({ fr: 'Volt', en: 'Volt' }),
    description: Object.freeze({
      fr: 'Auréole électrique tournoyante autour du portrait.',
      en: 'Swirling electric aura around the portrait.',
    }),
    effect: 'volt',
    ryos: 1200,
  }),
  Object.freeze({
    id: 'frame_mist',
    name: Object.freeze({ fr: 'Brume', en: 'Mist' }),
    description: Object.freeze({
      fr: 'Voile de brume animé autour du portrait.',
      en: 'Animated mist veil around the portrait.',
    }),
    effect: 'mist',
    ryos: 900,
  }),
  Object.freeze({
    id: 'frame_shadow',
    name: Object.freeze({ fr: 'Ombre', en: 'Shadow' }),
    description: Object.freeze({
      fr: 'Auréole d’ombre tournoyante autour du portrait.',
      en: 'Swirling shadow aura around the portrait.',
    }),
    effect: 'shadow',
    ryos: 1500,
  }),
]);

export function getProfileFrame(frameId) {
  return PROFILE_FRAME_CATALOG.find(entry => entry.id === frameId) || null;
}
