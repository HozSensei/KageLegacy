import { query } from '../config/database.js';
import { FORME_DOWNGRADE } from './combat/constants.js';
import { computeMatchPv } from './ninjaStats.js';
import { consumeUserItem } from './equipmentService.js';
import { getClockRow } from './gameClock.js';

const FORME_UPGRADE = {
  Lamentable: 'Passable',
  Passable: 'Excellent',
  Excellent: 'Divin',
  Divin: 'Divin',
};

export async function useBureauItem(userId, userItemId, ninjaId = null) {
  const itemRows = await query(
    `SELECT ui.*, idf.category, idf.slug, idf.effects
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
  if (item.category !== 'bureau') {
    const error = new Error('Seuls les objets de bureau peuvent être utilisés ainsi.');
    error.statusCode = 400;
    throw error;
  }

  const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
  const bureau = effects.bureau;
  if (!bureau?.trigger) {
    const error = new Error('Effet bureau invalide.');
    error.statusCode = 400;
    throw error;
  }

  let ninja = null;
  if (bureau.trigger !== 'scout_map') {
    const ninjaRows = await query('SELECT * FROM ninjas WHERE id = ? AND user_id = ?', [
      ninjaId,
      userId,
    ]);
    ninja = ninjaRows[0];
    if (!ninja) {
      const error = new Error('Ninja introuvable.');
      error.statusCode = 404;
      throw error;
    }
  }

  let result = {};

  switch (bureau.trigger) {
    case 'scout_map': {
      const clockRow = await getClockRow();
      if (!clockRow?.cycle_start_at) {
        const error = new Error('Cycle introuvable.');
        error.statusCode = 400;
        throw error;
      }
      await query('UPDATE sensei SET scout_env_confirmed_cycle = ? WHERE user_id = ?', [
        clockRow.cycle_start_at,
        userId,
      ]);
      result = { effect: 'scout_map' };
      break;
    }
    case 'forme_upgrade': {
      const next = FORME_UPGRADE[ninja.weekly_forme] || ninja.weekly_forme;
      if (next === ninja.weekly_forme) {
        const error = new Error('La forme de ce ninja est déjà au maximum.');
        error.statusCode = 400;
        throw error;
      }
      await query('UPDATE ninjas SET weekly_forme = ? WHERE id = ?', [next, ninjaId]);
      result = { effect: 'forme_upgrade', from: ninja.weekly_forme, to: next };
      break;
    }
    case 'strategy_book': {
      await query('UPDATE ninjas SET training_buff = ? WHERE id = ?', ['strategy_book', ninjaId]);
      result = { effect: 'strategy_book', ninjaId };
      break;
    }
    case 'pv_heal_pct': {
      const maxPv = computeMatchPv(ninja.taijutsu);
      const heal = Math.max(1, Math.floor(maxPv * ((bureau.percent || 15) / 100)));
      const newPv = Math.min(maxPv, ninja.current_pv_match + heal);
      await query('UPDATE ninjas SET current_pv_match = ? WHERE id = ?', [newPv, ninjaId]);
      result = { effect: 'pv_heal', healed: newPv - ninja.current_pv_match, currentPv: newPv, maxPv };
      break;
    }
    default: {
      const error = new Error('Type d\'objet bureau non géré.');
      error.statusCode = 400;
      throw error;
    }
  }

  await consumeUserItem(userItemId);
  return result;
}

export { FORME_UPGRADE, FORME_DOWNGRADE };
