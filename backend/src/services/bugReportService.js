/**
 * Signalements de bugs joueur + triage admin + récompense Ryos.
 */
import { getConnection, query } from '../config/database.js';
import {
  NOTIFICATION_KIND,
  createNotificationsForAdmins,
  createUserNotification,
} from './userNotificationService.js';

export const BUG_REPORT_REWARD_RYOS = 100;

export const BUG_REPORT_LOCATIONS = Object.freeze([
  'hub',
  'profile',
  'village',
  'rules',
  'collection',
  'decks',
  'talents',
  'missions',
  'shop',
  'battle-pass',
  'journal',
  'leaderboard',
  'coop',
  'deck-duels',
  'combat',
  'other',
]);

export const BUG_REPORT_STATUSES = Object.freeze(['open', 'in_progress', 'fixed']);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeReport(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    authorName:
      row.author_name ||
      row.character_name ||
      row.display_name ||
      row.username ||
      `#${row.user_id}`,
    username: row.username || null,
    location: row.location,
    locationOther: row.location_other || null,
    description: row.description,
    status: row.status,
    adminComment: row.admin_comment || null,
    rewardedAt: row.rewarded_at ? new Date(row.rewarded_at).toISOString() : null,
    rewardedBy: row.rewarded_by != null ? Number(row.rewarded_by) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function createBugReport(userId, { location, locationOther, description }) {
  if (!BUG_REPORT_LOCATIONS.includes(location)) {
    throw httpError('Lieu du bug invalide.');
  }
  const desc = String(description || '').trim();
  if (desc.length < 10) {
    throw httpError('La description doit contenir au moins 10 caractères.');
  }
  if (desc.length > 4000) {
    throw httpError('La description est trop longue (4000 caractères max).');
  }

  let other = null;
  if (location === 'other') {
    other = String(locationOther || '').trim();
    if (!other) {
      throw httpError('Précisez le lieu lorsque « Autre » est sélectionné.');
    }
    if (other.length > 120) {
      throw httpError('La précision du lieu est trop longue (120 caractères max).');
    }
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO bug_reports (user_id, location, location_other, description, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [userId, location, other, desc],
    );
    const reportId = Number(result.insertId);

    await createNotificationsForAdmins(
      {
        kind: NOTIFICATION_KIND.BUG_REPORT_NEW,
        payload: {
          reportId,
          location,
          locationOther: other,
          preview: desc.slice(0, 140),
        },
        href: '/admin?tab=reports',
      },
      connection,
    );

    await connection.commit();
    const rows = await query(
      `SELECT r.*, u.username, s.display_name, s.character_name,
              COALESCE(s.character_name, s.display_name, u.username) AS author_name
       FROM bug_reports r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN player_profiles s ON s.user_id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [reportId],
    );
    return serializeReport(rows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listBugReports({ status = null, limit = 100 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const params = [];
  let where = '';
  if (status) {
    if (!BUG_REPORT_STATUSES.includes(status)) {
      throw httpError('Statut invalide.');
    }
    where = 'WHERE r.status = ?';
    params.push(status);
  }
  params.push(capped);
  const rows = await query(
    `SELECT r.*, u.username, s.display_name, s.character_name,
            COALESCE(s.character_name, s.display_name, u.username) AS author_name
     FROM bug_reports r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN player_profiles s ON s.user_id = r.user_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ?`,
    params,
  );
  return rows.map(serializeReport);
}

export async function updateBugReport(reportId, { status, adminComment } = {}) {
  const id = Number(reportId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de rapport invalide.');
  }

  const updates = [];
  const params = [];
  if (status != null) {
    if (!BUG_REPORT_STATUSES.includes(status)) {
      throw httpError('Statut invalide.');
    }
    updates.push('status = ?');
    params.push(status);
  }
  if (adminComment !== undefined) {
    const comment = adminComment == null ? null : String(adminComment).trim().slice(0, 2000);
    updates.push('admin_comment = ?');
    params.push(comment || null);
  }
  if (!updates.length) {
    throw httpError('Aucune mise à jour fournie.');
  }

  params.push(id);
  const result = await query(
    `UPDATE bug_reports SET ${updates.join(', ')} WHERE id = ?`,
    params,
  );
  if (!result.affectedRows) {
    throw httpError('Rapport introuvable.', 404);
  }

  const rows = await query(
    `SELECT r.*, u.username, s.display_name, s.character_name,
            COALESCE(s.character_name, s.display_name, u.username) AS author_name
     FROM bug_reports r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN player_profiles s ON s.user_id = r.user_id
     WHERE r.id = ?
     LIMIT 1`,
    [id],
  );
  return serializeReport(rows[0]);
}

export async function rewardBugReportAuthor(reportId, adminUserId) {
  const id = Number(reportId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError('Identifiant de rapport invalide.');
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, user_id, rewarded_at, location, location_other
       FROM bug_reports
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id],
    );
    if (!rows[0]) {
      throw httpError('Rapport introuvable.', 404);
    }
    if (rows[0].rewarded_at) {
      throw httpError('Ce rapport a déjà été récompensé.', 409);
    }

    const authorId = Number(rows[0].user_id);
    const [profiles] = await connection.execute(
      'SELECT user_id FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [authorId],
    );
    if (!profiles[0]) {
      throw httpError('Profil joueur introuvable pour l’auteur.', 404);
    }

    await connection.execute(
      'UPDATE player_profiles SET ryos = ryos + ? WHERE user_id = ?',
      [BUG_REPORT_REWARD_RYOS, authorId],
    );
    await connection.execute(
      `UPDATE bug_reports
       SET rewarded_at = CURRENT_TIMESTAMP(6), rewarded_by = ?
       WHERE id = ?`,
      [adminUserId, id],
    );

    await createUserNotification(
      authorId,
      {
        kind: NOTIFICATION_KIND.BUG_REPORT_REWARD,
        payload: {
          reportId: id,
          ryos: BUG_REPORT_REWARD_RYOS,
          location: rows[0].location,
          locationOther: rows[0].location_other || null,
        },
        href: '/shop',
      },
      connection,
    );

    await connection.commit();

    const [balances] = await connection.execute(
      'SELECT ryos FROM player_profiles WHERE user_id = ? LIMIT 1',
      [authorId],
    );

    return {
      ok: true,
      reportId: id,
      userId: authorId,
      ryosGranted: BUG_REPORT_REWARD_RYOS,
      balances: { ryos: Number(balances[0]?.ryos || 0) },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
