import { query, getConnection } from '../config/database.js';
import { getClockRow, isTacticsLocked } from './gameClock.js';
import { describeUsageLimits } from './combat/equipmentConstants.js';
import { buildBureauEligibilityMatrix } from './bureauItemEligibility.js';

export async function getInventoryForUser(userId) {
  const [items, ninjas, clockRow, tacticsLocked, senseiRows] = await Promise.all([
    query(
      `SELECT ui.id, ui.consumed, ui.acquired_at,
              idf.slug, idf.category, idf.name_fr, idf.name_en,
              idf.description_fr, idf.description_en, idf.effects, idf.price AS catalog_price,
              idf.non_vendable,
              pl.id AS listing_id
       FROM user_items ui
       JOIN item_definitions idf ON idf.id = ui.item_definition_id
       LEFT JOIN player_listings pl ON pl.user_item_id = ui.id AND pl.status = 'active'
       WHERE ui.user_id = ? AND ui.consumed = FALSE
       ORDER BY ui.acquired_at DESC`,
      [userId],
    ),
    query(
      `SELECT n.id, n.name, n.squad_position, n.grade, n.element_affinity, n.preparation_type,
              n.weekly_forme, n.forme_lock_cycles, n.moral, n.taijutsu, n.current_pv_match,
              n.training_buff, n.injury_discount_ryos
       FROM ninjas n
       WHERE n.user_id = ?
       ORDER BY n.squad_position IS NULL, n.squad_position, n.id`,
      [userId],
    ),
    getClockRow(),
    isTacticsLocked(),
    query('SELECT scout_env_confirmed_cycle FROM sensei WHERE user_id = ?', [userId]),
  ]);

  const mappedItems = items.map((item) => ({
    ...item,
    usageLimits: describeUsageLimits(item.effects, item.category),
    isListed: Boolean(item.listing_id),
    listingId: item.listing_id || null,
    nonVendable: Boolean(item.non_vendable),
  }));

  const { ninjas: ninjasWithEligibility, globalBureauEligibility } = buildBureauEligibilityMatrix({
    items: mappedItems,
    ninjas,
    context: {
      cycleStartAt: clockRow?.cycle_start_at ?? null,
      scoutEnvConfirmedCycle: senseiRows[0]?.scout_env_confirmed_cycle ?? null,
      tacticsLocked,
    },
  });

  return {
    items: mappedItems,
    ninjas: ninjasWithEligibility,
    globalBureauEligibility,
  };
}

export async function consumeUserItem(userItemId, connection = null) {
  let ownedConnection = null;
  try {
    if (!connection) {
      ownedConnection = await getConnection();
      connection = ownedConnection;
    }

    const [updateResult] = await connection.execute(
      'UPDATE user_items SET consumed = TRUE WHERE id = ? AND consumed = FALSE',
      [userItemId],
    );
    if (updateResult.affectedRows === 0) {
      const error = new Error('Objet introuvable ou déjà consommé.');
      error.statusCode = 404;
      throw error;
    }
  } finally {
    if (ownedConnection) ownedConnection.release();
  }
}
