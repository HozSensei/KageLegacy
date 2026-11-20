/**
 * @deprecated Utiliser `missionPathConfig.js` (pools par rang + path aléatoire).
 * Réexport pour les imports existants (migrate / scripts).
 */
export {
  MISSION_ENCOUNTER_DIFFICULTIES,
  RANK_PATH_CONFIG,
  RANK_MISSION_DEFINITIONS,
  RANK_MISSION_SLUGS,
  getRankPathConfig,
} from './missionPathConfig.js';
