/**
 * Saison 1 — données dérivées du template générique (compat seeds / tests).
 */
import {
  buildSeason1QuestDefs,
  buildSeason1Rewards,
  buildSeasonMeta,
} from '../../src/services/battlePassSeasonTemplate.js';

export { buildSeason1QuestDefs, buildSeason1Rewards };

const meta = buildSeasonMeta(1);

export const SEASON_1_META = {
  seasonNumber: meta.seasonNumber,
  name: meta.name,
  theme: meta.theme,
  maxLevel: meta.maxLevel,
  baseXpPerLevel: meta.baseXpPerLevel,
};
