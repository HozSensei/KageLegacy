import { query } from '../config/database.js';

export async function findItemIdBySlug(slug) {
  const rows = await query('SELECT id FROM item_definitions WHERE slug = ?', [slug]);
  return rows[0]?.id ?? null;
}

export async function findItemDefinitionBySlug(slug) {
  const rows = await query(
    'SELECT slug, name_fr, name_en FROM item_definitions WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

export async function grantItemToUser(userId, slug, quantity = 1) {
  const itemId = await findItemIdBySlug(slug);
  if (!itemId) return [];
  const granted = [];
  for (let i = 0; i < quantity; i += 1) {
    const result = await query(
      'INSERT INTO user_items (user_id, item_definition_id) VALUES (?, ?)',
      [userId, itemId]
    );
    granted.push({ userItemId: result.insertId, slug, quantity: 1 });
  }
  return granted;
}

export async function countUnconsumedItemsBySlug(userId, slug) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     WHERE ui.user_id = ? AND idf.slug = ? AND ui.consumed = FALSE`,
    [userId, slug]
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function consumeOldestItemBySlug(userId, slug) {
  const rows = await query(
    `SELECT ui.id
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     WHERE ui.user_id = ? AND idf.slug = ? AND ui.consumed = FALSE
     ORDER BY ui.acquired_at ASC, ui.id ASC
     LIMIT 1`,
    [userId, slug]
  );
  const userItemId = rows[0]?.id;
  if (!userItemId) return null;
  await query('UPDATE user_items SET consumed = TRUE WHERE id = ?', [userItemId]);
  return userItemId;
}
