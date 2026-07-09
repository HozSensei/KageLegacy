import { query } from '../config/database.js';
import { deleteUserAccount } from './accountDeletionService.js';

const DEFAULT_BATCH_SIZE = 50;

function mapGuestRow(row) {
  return {
    id: row.id,
    username: row.username,
    is_bot: Boolean(row.is_bot),
    is_guest: Boolean(row.is_guest),
    guest_expires_at: row.guest_expires_at,
  };
}

export async function findExpiredGuestUsers(limit = DEFAULT_BATCH_SIZE) {
  const rows = await query(
    `SELECT id, username, is_bot, is_guest, guest_expires_at
     FROM users
     WHERE is_guest = TRUE AND guest_expires_at < UTC_TIMESTAMP()
     ORDER BY guest_expires_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows.map(mapGuestRow);
}

/**
 * Supprime les comptes invités dont l'essai (guest_expires_at) est dépassé,
 * puis purge les sessions expirées (cookies kage_session orphelins).
 */
export async function purgeExpiredGuestAccounts({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
  const deleted = [];
  const failed = [];

  while (true) {
    const batch = await findExpiredGuestUsers(batchSize);
    if (!batch.length) break;

    for (const user of batch) {
      try {
        await deleteUserAccount(user, {});
        deleted.push(user.id);
      } catch (error) {
        failed.push({
          userId: user.id,
          username: user.username,
          error: error.message,
        });
      }
    }

    if (batch.length < batchSize) break;
  }

  const sessionResult = await query('DELETE FROM user_sessions WHERE expires_at < UTC_TIMESTAMP()');

  return {
    purgedGuests: deleted.length,
    failedGuests: failed.length,
    failures: failed,
    expiredSessionsRemoved: sessionResult.affectedRows ?? 0,
  };
}
