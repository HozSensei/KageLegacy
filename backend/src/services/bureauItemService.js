import { query, getConnection } from '../config/database.js';
import { FORME_DOWNGRADE } from './combat/constants.js';
import { clampStatToGradeCap } from './gradeProgression.js';
import { consumeUserItem } from './equipmentService.js';
import { getClockRow, isTacticsLocked } from './gameClock.js';
import { computeMatchPv } from './ninjaStats.js';
import { clampStat } from './ninjaStats.js';
import {
  applyDispensaryHeal,
  assertDispensaryHealEligible,
} from './dispensaryService.js';
import {
  assertBureauItemEligible,
  resolveBureauTrigger,
} from './bureauItemEligibility.js';

const FORME_UPGRADE = {
  Lamentable: 'Passable',
  Passable: 'Excellent',
  Excellent: 'Divin',
  Divin: 'Divin',
};

async function applyBureauEffect({ trigger, bureau, userId, ninjaId, ninja, exec }) {
  switch (trigger) {
    case 'scout_map': {
      const clockRow = await getClockRow();
      if (!clockRow?.cycle_start_at) {
        const error = new Error('Cycle introuvable.');
        error.statusCode = 400;
        throw error;
      }
      await exec('UPDATE sensei SET scout_env_confirmed_cycle = ? WHERE user_id = ?', [
        clockRow.cycle_start_at,
        userId,
      ]);
      return { effect: 'scout_map' };
    }
    case 'dispensary_heal': {
      if (await isTacticsLocked()) {
        const error = new Error('L\'hôpital est fermé pendant l\'opération (à partir de H71).');
        error.statusCode = 423;
        throw error;
      }
      assertDispensaryHealEligible(ninja);
      return applyDispensaryHeal(ninjaId, async (sql, params = []) => {
        await exec(sql, params);
      });
    }
    case 'forme_upgrade': {
      if (Number(ninja.forme_lock_cycles) > 0) {
        const error = new Error(
          'Ce ninja ne peut pas être soigné tant que sa blessure grave n\'est pas cicatrisée.'
        );
        error.statusCode = 400;
        throw error;
      }
      const next = FORME_UPGRADE[ninja.weekly_forme] || ninja.weekly_forme;
      if (next === ninja.weekly_forme) {
        const error = new Error('La forme de ce ninja est déjà au maximum.');
        error.statusCode = 400;
        throw error;
      }
      await exec('UPDATE ninjas SET weekly_forme = ? WHERE id = ?', [next, ninjaId]);
      return { effect: 'forme_upgrade', from: ninja.weekly_forme, to: next, ninjaId };
    }
    case 'strategy_book': {
      await exec('UPDATE ninjas SET training_buff = ? WHERE id = ?', ['strategy_book', ninjaId]);
      return { effect: 'strategy_book', ninjaId };
    }
    case 'pv_heal_pct': {
      const maxPv = computeMatchPv(ninja.taijutsu);
      const heal = Math.max(1, Math.floor(maxPv * ((bureau.percent || 15) / 100)));
      const newPv = Math.min(maxPv, ninja.current_pv_match + heal);
      if (newPv === ninja.current_pv_match) {
        const error = new Error('Les PV de ce ninja sont déjà au maximum.');
        error.statusCode = 400;
        throw error;
      }
      await exec('UPDATE ninjas SET current_pv_match = ? WHERE id = ?', [newPv, ninjaId]);
      return {
        effect: 'pv_heal',
        healed: newPv - ninja.current_pv_match,
        currentPv: newPv,
        maxPv,
        ninjaId,
      };
    }
    case 'injury_discount': {
      const amount = bureau.amount || 50;
      await exec('UPDATE ninjas SET injury_discount_ryos = injury_discount_ryos + ? WHERE id = ?', [
        amount,
        ninjaId,
      ]);
      return { effect: 'injury_discount', amount, ninjaId };
    }
    case 'jutsu_scroll': {
      const stats = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];
      const eligibleStats = stats.filter((stat) => {
        const current = Number(ninja[stat]);
        const next = clampStatToGradeCap(ninja, stat, current + 0.5);
        return next > current;
      });
      if (!eligibleStats.length) {
        const error = new Error('Toutes les stats de ce ninja sont déjà au plafond de grade.');
        error.statusCode = 400;
        throw error;
      }
      const stat = eligibleStats[Math.floor(Math.random() * eligibleStats.length)];
      const gain = Math.random() < 0.5 ? 0.5 : 1.0;
      const current = Number(ninja[stat]);
      const next = clampStatToGradeCap(ninja, stat, current + gain);
      if (next <= current) {
        const error = new Error('Toutes les stats de ce ninja sont déjà au plafond de grade.');
        error.statusCode = 400;
        throw error;
      }
      await exec(`UPDATE ninjas SET ${stat} = ? WHERE id = ?`, [next, ninjaId]);
      return { effect: 'jutsu_scroll', stat, gain: next - current, ninjaId };
    }
    case 'moral_boost': {
      const amount = bureau.amount || 3;
      const next = clampStat(Math.min(20, Number(ninja.moral) + amount));
      if (next === ninja.moral) {
        const error = new Error('Le moral de ce ninja est déjà au maximum.');
        error.statusCode = 400;
        throw error;
      }
      await exec('UPDATE ninjas SET moral = ? WHERE id = ?', [next, ninjaId]);
      return { effect: 'moral_boost', from: ninja.moral, to: next, ninjaId };
    }
    default: {
      const error = new Error('Type d\'objet bureau non géré.');
      error.statusCode = 400;
      throw error;
    }
  }
}

export async function useBureauItem(userId, userItemId, ninjaId = null) {
  const itemRows = await query(
    `SELECT ui.*, idf.category, idf.slug, idf.effects, pl.id AS listing_id
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     LEFT JOIN player_listings pl ON pl.user_item_id = ui.id AND pl.status = 'active'
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

  const trigger = resolveBureauTrigger(item, bureau);
  const [clockRow, tacticsLocked, senseiRows] = await Promise.all([
    getClockRow(),
    isTacticsLocked(),
    query('SELECT scout_env_confirmed_cycle FROM sensei WHERE user_id = ?', [userId]),
  ]);
  const context = {
    cycleStartAt: clockRow?.cycle_start_at ?? null,
    scoutEnvConfirmedCycle: senseiRows[0]?.scout_env_confirmed_cycle ?? null,
    tacticsLocked,
  };

  let ninja = null;
  if (trigger !== 'scout_map' && trigger !== 'chakra_seal') {
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

  assertBureauItemEligible({
    item: { ...item, isListed: Boolean(item.listing_id) },
    bureau,
    ninja,
    context,
  });

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const exec = (sql, params = []) => connection.execute(sql, params);
    const result = await applyBureauEffect({ trigger, bureau, userId, ninjaId, ninja, exec });
    await consumeUserItem(userItemId, connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export { FORME_UPGRADE, FORME_DOWNGRADE };
