import { query } from '../config/database.js';
import { utcDateString, grantDailySealsForAllUsers } from './dailySealService.js';
import { ensureAcademyForAllUsers } from './academyService.js';

let lastDailyRetentionDate = null;

export async function processDailyRetentionTick() {
  const today = utcDateString();
  if (lastDailyRetentionDate === today) {
    return { skipped: true, date: today };
  }

  const rows = await query('SELECT id FROM users WHERE is_bot = FALSE LIMIT 1');
  if (!rows.length) {
    lastDailyRetentionDate = today;
    return { skipped: true, date: today, reason: 'no_users' };
  }

  const seals = await grantDailySealsForAllUsers();
  const academy = await ensureAcademyForAllUsers();
  lastDailyRetentionDate = today;

  console.log(
    `[DailyRetention] ${today} — sceaux accordés à ${seals.filter((s) => s.granted > 0).length} joueur(s) · rotations académie ${academy.length}`
  );

  return { date: today, seals, academy };
}

export function resetDailyRetentionCacheForTests() {
  lastDailyRetentionDate = null;
}
