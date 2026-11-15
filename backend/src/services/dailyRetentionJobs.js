import { query } from '../config/database.js';
import { utcDateString } from './dailyUtc.js';
import { grantDailySealsForAllUsers } from './dailySealService.js';
import { ensureAcademyForAllUsers } from './academyService.js';
import { purgeExpiredGuestAccounts } from './guestCleanupService.js';

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
  const guestCleanup = await purgeExpiredGuestAccounts();
  let battlePassQuests = null;
  try {
    const { ensureFreshQuestWindows } = await import('./battlePassQuestService.js');
    battlePassQuests = await ensureFreshQuestWindows();
  } catch (err) {
    console.error('[DailyRetention] refresh BP quests failed:', err?.message || err);
    battlePassQuests = { error: err?.message || String(err) };
  }
  lastDailyRetentionDate = today;

  console.log(
    `[DailyRetention] ${today} — sceaux accordés à ${seals.filter((s) => s.granted > 0).length} joueur(s) · rotations académie ${academy.length} · invités purgés ${guestCleanup.purgedGuests} · sessions expirées ${guestCleanup.expiredSessionsRemoved}`
  );

  if (guestCleanup.failedGuests > 0) {
    console.error(
      `[DailyRetention] ${today} — échec purge invités (${guestCleanup.failedGuests})`,
      guestCleanup.failures
    );
  }

  return { date: today, seals, academy, guestCleanup, battlePassQuests };
}

export function resetDailyRetentionCacheForTests() {
  lastDailyRetentionDate = null;
}
