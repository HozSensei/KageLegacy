import { query } from '../config/database.js';
import { getClockRow } from './gameClock.js';
import { describeUsageLimits } from './combat/equipmentConstants.js';

export async function getInventoryForUser(userId) {
  const items = await query(
    `SELECT ui.id, ui.consumed, ui.acquired_at,
            idf.slug, idf.category, idf.name_fr, idf.name_en,
            idf.description_fr, idf.description_en, idf.effects,
            ne.ninja_id, ne.slot AS equipped_slot, n.name AS equipped_ninja_name
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     LEFT JOIN ninja_equipment ne ON ne.user_item_id = ui.id
     LEFT JOIN ninjas n ON n.id = ne.ninja_id
     WHERE ui.user_id = ? AND ui.consumed = FALSE
     ORDER BY ui.acquired_at DESC`,
    [userId]
  );

  const ninjas = await query(
    `SELECT n.id, n.name, n.squad_position, n.grade,
            gear_ui.id AS gear_item_id, gear_idf.name_fr AS gear_name_fr, gear_idf.name_en AS gear_name_en,
            cons_ui.id AS cons_item_id, cons_idf.name_fr AS cons_name_fr, cons_idf.name_en AS cons_name_en
     FROM ninjas n
     LEFT JOIN ninja_equipment ne_gear ON ne_gear.ninja_id = n.id AND ne_gear.slot = 'gear'
     LEFT JOIN user_items gear_ui ON gear_ui.id = ne_gear.user_item_id
     LEFT JOIN item_definitions gear_idf ON gear_idf.id = gear_ui.item_definition_id
     LEFT JOIN ninja_equipment ne_cons ON ne_cons.ninja_id = n.id AND ne_cons.slot = 'consumable'
     LEFT JOIN user_items cons_ui ON cons_ui.id = ne_cons.user_item_id
     LEFT JOIN item_definitions cons_idf ON cons_idf.id = cons_ui.item_definition_id
     WHERE n.user_id = ?
     ORDER BY n.squad_position IS NULL, n.squad_position, n.id`,
    [userId]
  );

  return {
    items: items.map((item) => ({
      ...item,
      usageLimits: describeUsageLimits(item.effects, item.category),
    })),
    ninjas,
  };
}

function slotForCategory(category) {
  if (category === 'consumable') return 'consumable';
  return 'gear';
}

export async function equipItem(userId, ninjaId, userItemId) {
  const itemRows = await query(
    `SELECT ui.*, idf.category
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     WHERE ui.id = ? AND ui.user_id = ? AND ui.consumed = FALSE`,
    [userItemId, userId]
  );
  const item = itemRows[0];
  if (!item) {
    const error = new Error('Objet introuvable dans l\'inventaire.');
    error.statusCode = 404;
    throw error;
  }

  const ninjaRows = await query('SELECT * FROM ninjas WHERE id = ? AND user_id = ?', [
    ninjaId,
    userId,
  ]);
  if (!ninjaRows.length) {
    const error = new Error('Ninja introuvable.');
    error.statusCode = 404;
    throw error;
  }

  const cycleRow = await getClockRow();
  if (cycleRow?.cycle_start_at) {
    const missionRows = await query(
      `SELECT id FROM idle_missions
       WHERE ninja_id = ? AND cycle_start_at = ? AND status = 'active'`,
      [ninjaId, cycleRow.cycle_start_at]
    );
    if (missionRows.length) {
      const error = new Error('Ce ninja est en mission et ne peut pas être équipé.');
      error.statusCode = 423;
      throw error;
    }
  }

  const slot = slotForCategory(item.category);
  if (item.category === 'consumable' && slot !== 'consumable') {
    const error = new Error('Slot invalide pour ce consommable.');
    error.statusCode = 400;
    throw error;
  }
  if (item.category !== 'consumable' && item.category !== 'weapon' && item.category !== 'armor') {
    const error = new Error('Catégorie d\'objet non équipable.');
    error.statusCode = 400;
    throw error;
  }

  const existingSlot = await query(
    'SELECT user_item_id FROM ninja_equipment WHERE ninja_id = ? AND slot = ?',
    [ninjaId, slot]
  );
  if (existingSlot.length) {
    await query('DELETE FROM ninja_equipment WHERE ninja_id = ? AND slot = ?', [ninjaId, slot]);
  }

  await query('DELETE FROM ninja_equipment WHERE user_item_id = ?', [userItemId]);
  await query(
    'INSERT INTO ninja_equipment (ninja_id, slot, user_item_id) VALUES (?, ?, ?)',
    [ninjaId, slot, userItemId]
  );

  return { ninjaId, userItemId, slot };
}

export async function unequipItem(userId, ninjaId, slot) {
  const rows = await query(
    `SELECT ne.user_item_id
     FROM ninja_equipment ne
     JOIN ninjas n ON n.id = ne.ninja_id
     WHERE ne.ninja_id = ? AND ne.slot = ? AND n.user_id = ?`,
    [ninjaId, slot, userId]
  );
  if (!rows.length) {
    const error = new Error('Aucun objet équipé sur ce slot.');
    error.statusCode = 404;
    throw error;
  }
  await query('DELETE FROM ninja_equipment WHERE ninja_id = ? AND slot = ?', [ninjaId, slot]);
  return { ninjaId, slot };
}

export async function getEquipmentForNinjas(userId) {
  return query(
    `SELECT ne.ninja_id, ne.slot, idf.slug, idf.effects, idf.category, ui.id AS user_item_id
     FROM ninja_equipment ne
     JOIN user_items ui ON ui.id = ne.user_item_id
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     JOIN ninjas n ON n.id = ne.ninja_id
     WHERE n.user_id = ? AND ui.consumed = FALSE`,
    [userId]
  );
}

export async function consumeUserItem(userItemId) {
  await query('UPDATE user_items SET consumed = TRUE WHERE id = ?', [userItemId]);
  await query('DELETE FROM ninja_equipment WHERE user_item_id = ?', [userItemId]);
}
