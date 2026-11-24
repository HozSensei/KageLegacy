import {
  PROFILE_FRAME_CATALOG,
  PROFILE_FRAME_IDS,
  getProfileFrame,
  isKnownProfileFrameId,
} from '@shared/character/profileFrames.js';

export { PROFILE_FRAME_CATALOG, PROFILE_FRAME_IDS, getProfileFrame, isKnownProfileFrameId };

export function profileFrameLabel(frameId, t, te, locale = 'fr') {
  if (!frameId) return '';
  const key = `player.frames.${frameId}`;
  if (te(key)) return t(key);
  const entry = getProfileFrame(frameId);
  const lang = String(locale || 'fr').startsWith('en') ? 'en' : 'fr';
  return entry?.name?.[lang] || entry?.name?.fr || frameId;
}
