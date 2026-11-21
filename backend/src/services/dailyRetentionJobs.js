import { utcDateString } from './dailyUtc.js';
import { purgeExpiredGuestAccounts } from './guestCleanupService.js';

let lastDailyRetentionDate = null;

export async function processDailyRetentionTick() {
  const today = utcDateString();
  if (lastDailyRetentionDate === today) {
    return { skipped: true, date: today };
  }

  const guestCleanup = await purgeExpiredGuestAccounts();

  let battlePassRotation = null;
  try {
    const { rotateBattlePassSeasons } = await import('./battlePassSeasonRotation.js');
    battlePassRotation = await rotateBattlePassSeasons();
  } catch (err) {
    console.error('[DailyRetention] BP season rotation failed:', err?.message || err);
    battlePassRotation = { error: err?.message || String(err) };
  }

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
    `[DailyRetention] ${today} — invités purgés ${guestCleanup.purgedGuests} · sessions expirées ${guestCleanup.expiredSessionsRemoved}`,
  );

  if (guestCleanup.failedGuests > 0) {
    console.error(
      `[DailyRetention] ${today} — échec purge invités (${guestCleanup.failedGuests})`,
      guestCleanup.failures,
    );
  }

  return { date: today, guestCleanup, battlePassRotation, battlePassQuests };
}

export function resetDailyRetentionCacheForTests() {
  lastDailyRetentionDate = null;
}
