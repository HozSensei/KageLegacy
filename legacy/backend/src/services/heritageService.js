import { query } from '../config/database.js';
import { getBirdFlightPeakStat, MAJOR_STATS } from './birdFlightService.js';

export const HERITAGE_BONUS_PER_SCROLL = 3;
export const HERITAGE_BONUS_CAP = 15;

const DOMINANT_STAT_LABELS = {
  fr: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Médecine',
  },
  en: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Medicine',
  },
};

const BONUS_BY_STAT = {
  taijutsu: { bonusType: 'bureau_shop_discount', labelKey: 'bureau.heritageBonusBureauShop' },
  ninjutsu: { bonusType: 'training_discount', labelKey: 'bureau.heritageBonusTraining' },
  genjutsu: { bonusType: 'match_shop_discount', labelKey: 'bureau.heritageBonusMatchShop' },
  medecine: { bonusType: 'dispensary_discount', labelKey: 'bureau.heritageBonusDispensary' },
};

function clampBonusPercent(value) {
  return Math.min(HERITAGE_BONUS_CAP, value);
}

export function getDominantStat(ninja) {
  let best = MAJOR_STATS[0];
  let bestValue = ninja[best] ?? 0;
  for (const stat of MAJOR_STATS) {
    const value = ninja[stat] ?? 0;
    if (value > bestValue) {
      best = stat;
      bestValue = value;
    }
  }
  return best;
}

export async function createHeritageScroll(userId, ninja) {
  const dominantStat = getDominantStat(ninja);
  const peakValue = getBirdFlightPeakStat(ninja);
  const meta = BONUS_BY_STAT[dominantStat];

  await query(
    `INSERT INTO heritage_scrolls
      (user_id, ninja_name, dominant_stat, peak_value, bonus_type, bonus_percent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, ninja.name, dominantStat, peakValue, meta.bonusType, HERITAGE_BONUS_PER_SCROLL]
  );
}

export async function listHeritageScrolls(userId) {
  const rows = await query(
    `SELECT id, ninja_name, dominant_stat, peak_value, bonus_type, bonus_percent, departed_at
     FROM heritage_scrolls
     WHERE user_id = ?
     ORDER BY departed_at DESC, id DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    ninjaName: row.ninja_name,
    dominantStat: row.dominant_stat,
    peakValue: row.peak_value,
    bonusType: row.bonus_type,
    bonusPercent: Number(row.bonus_percent),
    departedAt: row.departed_at,
  }));
}

export async function getHeritageBonuses(userId) {
  const rows = await query(
    `SELECT bonus_type, SUM(bonus_percent) AS total
     FROM heritage_scrolls
     WHERE user_id = ?
     GROUP BY bonus_type`,
    [userId]
  );

  const totals = Object.fromEntries(rows.map((r) => [r.bonus_type, Number(r.total)]));
  const countRows = await query('SELECT COUNT(*) AS cnt FROM heritage_scrolls WHERE user_id = ?', [
    userId,
  ]);
  const scrollCount = Number(countRows[0]?.cnt ?? 0);

  return {
    trainingDiscountPct: clampBonusPercent(totals.training_discount || 0),
    dispensaryDiscountPct: clampBonusPercent(totals.dispensary_discount || 0),
    bureauShopDiscountPct: clampBonusPercent(totals.bureau_shop_discount || 0),
    matchShopDiscountPct: clampBonusPercent(
      (totals.match_shop_discount || 0) + (totals.scout_insight || 0)
    ),
    scrollCount,
  };
}

export async function getHeritagePayload(userId, language = 'fr') {
  const scrolls = await listHeritageScrolls(userId);
  const bonuses = await getHeritageBonuses(userId);
  const labels = DOMINANT_STAT_LABELS[language] || DOMINANT_STAT_LABELS.fr;

  return {
    scrolls: scrolls.map((scroll) => ({
      ...scroll,
      dominantStatLabel: labels[scroll.dominantStat] || scroll.dominantStat,
      bonusLabelKey: BONUS_BY_STAT[scroll.dominantStat]?.labelKey,
    })),
    bonuses,
  };
}

export function applyPercentDiscount(amount, discountPct) {
  if (!discountPct) return amount;
  return Math.max(0, Math.floor(amount * (1 - discountPct / 100)));
}
