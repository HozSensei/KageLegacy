/**
 * Mur de ligue — fil de saison, pagination, sans quota.
 * Reset logique : filtré par season_number (nouvelle saison = mur vide).
 */

import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { moderateWallText } from './wallModeration.js';

const MAX_BODY = 280;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeBody(raw) {
  let body = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (body.length < 1) {
    const error = new Error('Le message est vide.');
    error.statusCode = 400;
    throw error;
  }
  if (body.length > MAX_BODY) {
    const error = new Error(`Message trop long (max ${MAX_BODY} caractères).`);
    error.statusCode = 400;
    throw error;
  }
  body = moderateWallText(body);
  return body;
}

async function assertPoolMember(userId, poolId) {
  const rows = await query(
    'SELECT 1 FROM pool_members WHERE pool_id = ? AND user_id = ? LIMIT 1',
    [poolId, userId]
  );
  if (!rows.length) {
    const error = new Error('Vous n\'êtes pas membre de cette ligue.');
    error.statusCode = 403;
    throw error;
  }
}

/**
 * @param {number} userId
 * @param {{ beforeId?: number, limit?: number }} opts
 */
export async function listWallPosts(userId, { beforeId = null, limit = DEFAULT_LIMIT } = {}) {
  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune pool active.');
    error.statusCode = 404;
    throw error;
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT));
  const params = [pool.id, pool.season_number];
  let sql = `
    SELECT w.id, w.body, w.created_at, w.author_user_id,
           s.name AS author_name, u.is_bot AS author_is_bot
    FROM pool_wall_posts w
    JOIN sensei s ON s.user_id = w.author_user_id
    JOIN users u ON u.id = w.author_user_id
    WHERE w.pool_id = ? AND w.season_number = ?`;

  if (beforeId != null && Number(beforeId) > 0) {
    sql += ' AND w.id < ?';
    params.push(Number(beforeId));
  }

  sql += ` ORDER BY w.id DESC LIMIT ${safeLimit + 1}`;

  const rows = await query(sql, params);
  const hasMore = rows.length > safeLimit;
  const page = hasMore ? rows.slice(0, safeLimit) : rows;

  return {
    poolId: pool.id,
    seasonNumber: pool.season_number,
    hasMore,
    nextBeforeId: hasMore ? page[page.length - 1].id : null,
    posts: page.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      authorIsBot: Boolean(row.author_is_bot),
      isOwn: row.author_user_id === userId,
    })),
  };
}

export async function createWallPost(userId, bodyRaw) {
  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune pool active.');
    error.statusCode = 404;
    throw error;
  }

  const userRows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  if (userRows[0]?.is_bot) {
    const error = new Error('Les bots ne publient pas sur le mur.');
    error.statusCode = 403;
    throw error;
  }

  await assertPoolMember(userId, pool.id);
  const body = normalizeBody(bodyRaw);

  const result = await query(
    `INSERT INTO pool_wall_posts (pool_id, season_number, author_user_id, body)
     VALUES (?, ?, ?, ?)`,
    [pool.id, pool.season_number, userId, body]
  );

  const rows = await query(
    `SELECT w.id, w.body, w.created_at, w.author_user_id, s.name AS author_name
     FROM pool_wall_posts w
     JOIN sensei s ON s.user_id = w.author_user_id
     WHERE w.id = ?`,
    [result.insertId]
  );
  const row = rows[0];

  return {
    post: {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorUserId: row.author_user_id,
      authorName: row.author_name,
      authorIsBot: false,
      isOwn: true,
    },
  };
}

export { MAX_BODY, DEFAULT_LIMIT };
