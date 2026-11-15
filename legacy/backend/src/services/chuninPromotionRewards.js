import { CHUNIN_AVERAGE_REQUIRED } from './chuninExam.js';
import { clampStat, ninjaOverallRating } from './ninjaStats.js';

export const CHUNIN_PROMOTION_RYOS_MIN = 300;
export const CHUNIN_PROMOTION_RYOS_MAX = 1000;
/** Plafond Genin réaliste pour l'échelle des primes (12×4 + 10×2 → moyenne 11). */
export const CHUNIN_PROMOTION_RATING_CAP = 11;

const FORME_UPGRADE = {
  Lamentable: 'Passable',
  Passable: 'Excellent',
  Excellent: 'Divin',
  Divin: 'Divin',
};

const ITEM_BY_RATING = {
  8: 'pansement-terrain',
  9: 'kit-materiel-medical',
  10: 'livre-strategie',
  11: 'parchemin-jutsu-interdit',
};

export function computeChuninPromotionRewards(ninja) {
  const average = ninjaOverallRating(ninja);
  const minRating = CHUNIN_AVERAGE_REQUIRED;
  const maxRating = CHUNIN_PROMOTION_RATING_CAP;
  const clamped = Math.min(maxRating, Math.max(minRating, average));

  const ryos =
    CHUNIN_PROMOTION_RYOS_MIN +
    Math.round(((clamped - minRating) / (maxRating - minRating)) * (CHUNIN_PROMOTION_RYOS_MAX - CHUNIN_PROMOTION_RYOS_MIN));

  const reputation = Math.min(5, Math.max(1, average - (minRating - 1)));
  const itemSlug = ITEM_BY_RATING[Math.min(11, Math.max(8, average))] || ITEM_BY_RATING[8];
  const moralBoost = Math.min(5, Math.max(2, average - 6));
  const newMoral = clampStat((Number(ninja.moral) || 10) + moralBoost);
  const newForme = FORME_UPGRADE[ninja.weekly_forme] || ninja.weekly_forme;

  return {
    average,
    ryos,
    reputation,
    itemSlug,
    moralBoost,
    newMoral,
    newForme,
  };
}
