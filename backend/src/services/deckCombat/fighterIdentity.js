import {
  DEFAULT_AVATAR_ID,
  NICKNAME_CATALOG,
  isKnownAvatarId,
  isKnownCardBackgroundId,
} from '../characterAppearance.js';
import { isValidFactionId } from '../factionCatalog.js';

// Project an already-serialized character snapshot. Do not recheck nickname unlocks
// against current level: an equipped nickname can survive a level reset.
export function publicFighterIdentity({ rank, level, profile, factionId }) {
  return {
    ...(typeof rank === 'string' && { rank }),
    ...(Number.isSafeInteger(level) && level > 0 && { level }),
    ...(isValidFactionId(factionId) && { factionId }),
    ...(profile && typeof profile === 'object' && !Array.isArray(profile) && {
      profile: {
        avatarId: isKnownAvatarId(profile.avatarId) ? profile.avatarId : DEFAULT_AVATAR_ID,
        backgroundId: isKnownCardBackgroundId(profile.backgroundId) ? profile.backgroundId : null,
        nicknameId: NICKNAME_CATALOG.some(({ id }) => id === profile.nicknameId)
          ? profile.nicknameId
          : null,
      },
    }),
  };
}
