/**
 * Notifications persistées (rapports de bug, etc.).
 */
import { query } from '../config/database.js';

export const NOTIFICATION_KIND = Object.freeze({
  BUG_REPORT_NEW: 'bug_report_new',
  BUG_REPORT_REWARD: 'bug_report_reward',
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
    payload,
    href: row.href || null,
    read: Boolean(row.read_at),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function createUserNotification(
  userId,
  { kind, payload = {}, href = null },
  connection = null,
) {
  const exec = connection
    ? (sql, params) => connection.execute(sql, params)
    : (sql, params) => query(sql, params).then(rows => [rows]);

  const [result] = await exec(
    `INSERT INTO user_notifications (user_id, kind, payload_json, href)
     VALUES (?, ?, ?, ?)`,
    [userId, kind, JSON.stringify(payload || {}), href],
  );
  return Number(result.insertId);
}

export async function createNotificationsForAdmins(
  { kind, payload = {}, href = null },
  connection = null,
) {
  const runQuery = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const admins = await runQuery(
    'SELECT id FROM users WHERE is_admin = TRUE AND is_guest = FALSE',
  );
  const ids = [];
  for (const admin of admins) {
    const id = await createUserNotification(
      admin.id,
      { kind, payload, href },
      connection,
    );
    ids.push(id);
  }
  return ids;
}

export async function listUserNotifications(userId, { limit = 40 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const rows = await query(
    `SELECT id, kind, payload_json, href, read_at, created_at
     FROM user_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, capped],
  );
  return rows.map(serializeNotification);
}

export async function markNotificationRead(userId, notificationId) {
  const id = Number(notificationId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de notification invalide.');
  }
  const result = await query(
    `UPDATE user_notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(6))
     WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  if (!result.affectedRows) {
    throw httpError('Notification introuvable.', 404);
  }
  return { ok: true, id };
}

export async function markAllNotificationsRead(userId) {
  await query(
    `UPDATE user_notifications
     SET read_at = CURRENT_TIMESTAMP(6)
     WHERE user_id = ? AND read_at IS NULL`,
    [userId],
  );
  return { ok: true };
}
