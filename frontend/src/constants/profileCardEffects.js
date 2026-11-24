import {
  PROFILE_CARD_EFFECT_CATALOG,
  PROFILE_CARD_EFFECT_IDS,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
} from '@shared/character/profileCardEffects.js';

export {
  PROFILE_CARD_EFFECT_CATALOG,
  PROFILE_CARD_EFFECT_IDS,
  getProfileCardEffect,
  isKnownProfileCardEffectId,
};

export function profileCardEffectLabel(effectId, t, te, locale = 'fr') {
  if (!effectId) return '';
  const key = `player.cardEffects.${effectId}`;
  if (te(key)) return t(key);
  const entry = getProfileCardEffect(effectId);
  const lang = String(locale || 'fr').startsWith('en') ? 'en' : 'fr';
  return entry?.name?.[lang] || entry?.name?.fr || effectId;
}
