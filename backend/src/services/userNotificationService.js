/**
 * Notifications persistées par utilisateur (gains, quêtes, bug reports, etc.).
 * Plafond : les 30 plus récentes sont conservées.
 */
import { query } from '../config/database.js';

export const MAX_NOTIFICATIONS_PER_USER = 30;

export const NOTIFICATION_KIND = Object.freeze({
  BUG_REPORT_NEW: 'bug_report_new',
  BUG_REPORT_REWARD: 'bug_report_reward',
  GAIN: 'gain',
  QUEST_READY: 'quest_ready',
  ONBOARDING_READY: 'onboarding_ready',
  ACHIEVEMENT_READY: 'achievement_ready',
  VILLAGE_REWARD: 'village_reward',
});

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeNotification(row) {
  let payload = {};
  if (row.payload_json != null) {
    if (typeof row.payload_json === 'string') {
      try {
        payload = JSON.parse(row.payload_json) || {};
      } catch {
        payload = {};
      }
    } else if (typeof row.payload_json === 'object') {
      payload = row.payload_json;
    }
  }
  return {
    id: Number(row.id),
    kind: row.kind,
    dedupeKey: row.dedupe_key || null,
    payload,
    href: row.href || null,
    read: Boolean(row.read_at),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function runExec(connection) {
  if (connection) {
    return async (sql, params) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };
  }
  return async (sql, params) => query(sql, params);
}

/**
 * Supprime les notifications au-delà des `keep` plus récentes pour un utilisateur.
 */
export async function pruneUserNotifications(
  userId,
  keep = MAX_NOTIFICATIONS_PER_USER,
  connection = null,
) {
  const exec = runExec(connection);
  // mysql2 execute() refuse LIMIT ? (ER_WRONG_ARGUMENTS) — inline borné comme ailleurs.
  const safeLimit = Math.max(1, Math.min(100, Number(keep) || MAX_NOTIFICATIONS_PER_USER));
  await exec(
    `DELETE FROM user_notifications
     WHERE user_id = ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM user_notifications
           WHERE user_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT ${safeLimit}
         ) AS recent
       )`,
    [userId, userId],
  );
}

export async function createUserNotification(
  userId,
  { kind, payload = {}, href = null, dedupeKey = null },
  connection = null,
) {
  const exec = runExec(connection);
  const key = dedupeKey ? String(dedupeKey).slice(0, 128) : null;

  if (key) {
    const existing = await exec(
      `SELECT id FROM user_notifications
       WHERE user_id = ? AND dedupe_key = ? LIMIT 1`,
      [userId, key],
    );
    if (existing[0]) return Number(existing[0].id);
  }

  const result = await exec(
    `INSERT INTO user_notifications (user_id, kind, payload_json, href, dedupe_key)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, kind, JSON.stringify(payload || {}), href, key],
  );
  const insertId = Number(result.insertId);
  await pruneUserNotifications(userId, MAX_NOTIFICATIONS_PER_USER, connection);
  return insertId;
}

/** Crée si absent (par dedupe_key). Après suppression manuelle, peut être recréé. */
export async function ensureUserNotification(userId, entry, connection = null) {
  return createUserNotification(userId, entry, connection);
}

export async function createNotificationsForAdmins(
  { kind, payload = {}, href = null, dedupeKey = null },
  connection = null,
) {
  const exec = runExec(connection);
  const admins = await exec(
    'SELECT id FROM users WHERE is_admin = TRUE AND is_guest = FALSE',
    [],
  );
  const ids = [];
  for (const admin of admins) {
    const id = await createUserNotification(
      admin.id,
      {
        kind,
        payload,
        href,
        dedupeKey: dedupeKey ? `${dedupeKey}:admin:${admin.id}` : null,
      },
      connection,
    );
    ids.push(id);
  }
  return ids;
}

export async function notifyGain(
  userId,
  { source, grants = [], label = null, labelEn = null, href = null, extra = {} } = {},
  connection = null,
) {
  if (!userId) return null;
  const cleanGrants = (Array.isArray(grants) ? grants : [])
    .filter(g => g && !g.skipped && g.type)
    .map(g => ({
      type: g.type,
      amount: g.amount ?? null,
      boosterType: g.boosterType || g.kind || null,
      itemKey: g.itemKey || null,
    }));
  return createUserNotification(
    userId,
    {
      kind: NOTIFICATION_KIND.GAIN,
      href: href || null,
      payload: {
        source: source || 'unknown',
        grants: cleanGrants,
        label,
        labelEn,
        ...extra,
      },
    },
    connection,
  );
}

export async function deleteNotificationByDedupe(userId, dedupeKey, connection = null) {
  if (!userId || !dedupeKey) return { deleted: 0 };
  const exec = runExec(connection);
  const result = await exec(
    'DELETE FROM user_notifications WHERE user_id = ? AND dedupe_key = ?',
    [userId, String(dedupeKey).slice(0, 128)],
  );
  return { deleted: Number(result.affectedRows) || 0 };
}

export async function listUserNotifications(userId, { limit = MAX_NOTIFICATIONS_PER_USER } = {}) {
  // mysql2 execute() refuse LIMIT ? (ER_WRONG_ARGUMENTS) — inline borné comme ailleurs.
  const safeLimit = Math.max(
    1,
    Math.min(Number(limit) || MAX_NOTIFICATIONS_PER_USER, MAX_NOTIFICATIONS_PER_USER),
  );
  const rows = await query(
    `SELECT id, kind, payload_json, href, dedupe_key, read_at, created_at
     FROM user_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    [userId],
  );
  return rows.map(serializeNotification);
}

export async function markNotificationRead(userId, notificationId) {
  const id = Number(notificationId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de notification invalide.');
  }
  const rows = await query(
    `SELECT id, kind, payload_json FROM user_notifications
     WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId],
  );
  if (!rows[0]) throw httpError('Notification introuvable.', 404);

  await query(
    `UPDATE user_notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(6))
     WHERE id = ? AND user_id = ?`,
    [id, userId],
  );

  if (rows[0].kind === NOTIFICATION_KIND.VILLAGE_REWARD) {
    try {
      const note = serializeNotification(rows[0]);
      const weekStart = note.payload?.weekStart;
      if (weekStart) {
        const { markVillageRewardsRead } = await import('./asyncDuelWeeklyRewards.js');
        await markVillageRewardsRead(userId, weekStart);
      }
    } catch {
      /* ledger village optionnel */
    }
  }

  return { ok: true, id };
}

export async function markNotificationUnread(userId, notificationId) {
  const id = Number(notificationId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de notification invalide.');
  }
  const result = await query(
    `UPDATE user_notifications
     SET read_at = NULL
     WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  if (!result.affectedRows) {
    throw httpError('Notification introuvable.', 404);
  }
  return { ok: true, id };
}

export async function markAllNotificationsRead(userId) {
  const villageRows = await query(
    `SELECT payload_json FROM user_notifications
     WHERE user_id = ? AND kind = ? AND read_at IS NULL`,
    [userId, NOTIFICATION_KIND.VILLAGE_REWARD],
  );

  await query(
    `UPDATE user_notifications
     SET read_at = CURRENT_TIMESTAMP(6)
     WHERE user_id = ? AND read_at IS NULL`,
    [userId],
  );

  if (villageRows.length) {
    try {
      const { markVillageRewardsRead } = await import('./asyncDuelWeeklyRewards.js');
      const weekStarts = villageRows
        .map(row => {
          try {
            const payload =
              typeof row.payload_json === 'string'
                ? JSON.parse(row.payload_json)
                : row.payload_json;
            return payload?.weekStart || null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort();
      const latest = weekStarts[weekStarts.length - 1];
      if (latest) await markVillageRewardsRead(userId, latest);
    } catch {
      /* ledger village optionnel */
    }
  }

  return { ok: true };
}

export async function deleteUserNotification(userId, notificationId) {
  const id = Number(notificationId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de notification invalide.');
  }
  const result = await query(
    'DELETE FROM user_notifications WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  if (!result.affectedRows) {
    throw httpError('Notification introuvable.', 404);
  }
  return { ok: true, id };
}
