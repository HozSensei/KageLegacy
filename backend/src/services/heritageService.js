import { query } from '../config/database.js';
import { getBirdFlightPeakStat, MAJOR_STATS } from './birdFlightService.js';

export const HERITAGE_BONUS_PER_SCROLL = 3;
export const HERITAGE_BONUS_CAP = 15;
export const HERITAGE_MORAL_PER_SCROLL = 1;
export const HERITAGE_MORAL_CAP = 5;

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
  taijutsu: { bonusType: 'moral_recovery', labelKey: 'bureau.heritageBonusMoral' },
  ninjutsu: { bonusType: 'training_discount', labelKey: 'bureau.heritageBonusTraining' },
  genjutsu: { bonusType: 'scout_insight', labelKey: 'bureau.heritageBonusScout' },
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

  const moralScrolls = await query(
    `SELECT COUNT(*) AS cnt FROM heritage_scrolls WHERE user_id = ? AND dominant_stat = 'taijutsu'`,
    [userId]
  );
  const moralBenchBonus = Math.min(
    HERITAGE_MORAL_CAP,
    Number(moralScrolls[0]?.cnt ?? 0) * HERITAGE_MORAL_PER_SCROLL
  );

  return {
    trainingDiscountPct: clampBonusPercent(totals.training_discount || 0),
    dispensaryDiscountPct: clampBonusPercent(totals.dispensary_discount || 0),
    scoutInsightPct: clampBonusPercent(totals.scout_insight || 0),
    moralBenchBonus,
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

/** Applique le bonus moral de fin de cycle aux ninjas au banc. */
export async function applyHeritageMoralBonusForUser(userId) {
  const { moralBenchBonus } = await getHeritageBonuses(userId);
  if (moralBenchBonus <= 0) return 0;

  const result = await query(
    `UPDATE ninjas
     SET moral = LEAST(20, moral + ?)
     WHERE user_id = ? AND squad_position IS NULL`,
    [moralBenchBonus, userId]
  );
  return result.affectedRows || 0;
}

export async function applyHeritageMoralBonusForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  let total = 0;
  for (const user of users) {
    total += await applyHeritageMoralBonusForUser(user.id);
  }
  return total;
}

export function applyPercentDiscount(amount, discountPct) {
  if (!discountPct) return amount;
  return Math.max(0, Math.floor(amount * (1 - discountPct / 100)));
}
