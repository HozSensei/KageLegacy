/**
 * Re-export config partagée + helpers serveur.
 */
export {
  DEFAULT_LEVEL_WINDOW,
  ALLOWED_LEVEL_WINDOWS,
  ANTI_CHEAT_MODE,
  GUEST_CHALLENGE_ENABLED,
  PVP_MATCH_STATES,
  PVP_QUEUE_STATES,
  PVP_ROLES,
  normalizeLevelWindow,
} from '../../../../shared/pvp/config.js';

export const PVP_WS_PATH = '/ws/pvp';
