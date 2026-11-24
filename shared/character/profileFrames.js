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
      fr: 'Auréole de braise tournoyante et reflet chaud sur la carte.',
      en: 'Swirling ember aura and a warm sheen on the card.',
    }),
    effect: 'ember',
    ryos: 800,
  }),
  Object.freeze({
    id: 'frame_volt',
    name: Object.freeze({ fr: 'Volt', en: 'Volt' }),
    description: Object.freeze({
      fr: 'Auréole électrique tournoyante et reflet cyan sur la carte.',
      en: 'Swirling electric aura and a cyan sheen on the card.',
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
      fr: 'Auréole d’ombre tournoyante et reflet violet sur la carte.',
      en: 'Swirling shadow aura and a violet sheen on the card.',
    }),
    effect: 'shadow',
    ryos: 1500,
  }),
]);

export function getProfileFrame(frameId) {
  return PROFILE_FRAME_CATALOG.find(entry => entry.id === frameId) || null;
}
