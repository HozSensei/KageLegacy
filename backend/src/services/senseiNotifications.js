import { query } from '../config/database.js';

export async function createSenseiNotification(userId, kind, payload) {
  const result = await query(
    'INSERT INTO sensei_notifications (user_id, kind, payload) VALUES (?, ?, ?)',
    [userId, kind, JSON.stringify(payload)]
  );
  return result.insertId;
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    kind: row.kind,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    createdAt: row.created_at,
    dismissedAt: row.dismissed_at ?? null,
    read: Boolean(row.dismissed_at),
  };
}

export async function getUnreadNotifications(userId) {
  const rows = await query(
    `SELECT id, kind, payload, created_at, dismissed_at
     FROM sensei_notifications
     WHERE user_id = ? AND dismissed_at IS NULL
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows.map(mapNotificationRow);
}

/** Dernières notifications lues (historique court). */
export async function getNotificationHistory(userId, limit = 15) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 15));
  const rows = await query(
    `SELECT id, kind, payload, created_at, dismissed_at
     FROM sensei_notifications
     WHERE user_id = ? AND dismissed_at IS NOT NULL
     ORDER BY dismissed_at DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
  return rows.map(mapNotificationRow);
}

/** Fil d'activité récent (lu + non lu) pour le journal du Bureau. */
export async function getRecentActivity(userId, limit = 20) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const rows = await query(
    `SELECT id, kind, payload, created_at, dismissed_at
     FROM sensei_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
  return rows.map(mapNotificationRow);
}

export async function dismissNotification(userId, notificationId) {
  const result = await query(
    'UPDATE sensei_notifications SET dismissed_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND dismissed_at IS NULL',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}
