import { query } from '../config/database.js';

export async function createDojoNotification(userId, kind, payload) {
  const result = await query(
    'INSERT INTO dojo_notifications (user_id, kind, payload) VALUES (?, ?, ?)',
    [userId, kind, JSON.stringify(payload)]
  );
  return result.insertId;
}

export async function getUnreadNotifications(userId) {
  const rows = await query(
    `SELECT id, kind, payload, created_at
     FROM dojo_notifications
     WHERE user_id = ? AND dismissed_at IS NULL
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    createdAt: row.created_at,
  }));
}

export async function dismissNotification(userId, notificationId) {
  const result = await query(
    'UPDATE dojo_notifications SET dismissed_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND dismissed_at IS NULL',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}
