#!/usr/bin/env node
/**
 * Simulation économique multi-cycles : achats magasin village + cycle complet.
 * Usage: npm run economy:simulate [-- --cycles=20 --items=2 --training]
 *
 * Prérequis : npm run db:seed (utilise demo_sensei).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { findDemoUser } from '../src/models/sensei.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getDebtStatus } from '../src/services/economyDebt.js';
import { getClockRow, setHourDev } from '../src/services/gameClock.js';
import { getCycleBudgetPreview, OVERDRAFT_LIMIT } from '../src/services/trainingBilling.js';
import { MATCH_DRAW_RYOS, MATCH_WIN_RYOS } from '../src/services/matchEconomy.js';
import {
  getVillageShopForUser,
  purchaseVillageShopItem,
} from '../src/services/villageShopService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseArgs() {
  const cycles = Number(process.argv.find((a) => a.startsWith('--cycles='))?.split('=')[1]) || 20;
  const itemsPerCycle =
    Number(process.argv.find((a) => a.startsWith('--items='))?.split('=')[1]) || 2;
  const withTraining = process.argv.includes('--training');
  const startRyos =
    Number(process.argv.find((a) => a.startsWith('--ryos='))?.split('=')[1]) || 15400;
  return { cycles, itemsPerCycle, withTraining, startRyos };
}

async function jumpAndTick(hour) {
  await setHourDev(hour);
  return processCycleTick();
}

async function buyShopItems(userId, maxItems) {
  const shop = await getVillageShopForUser(userId);
  const affordable = shop.items
    .filter((i) => !i.soldOut)
    .sort((a, b) => a.finalPrice - b.finalPrice);

  const purchases = [];
  for (const item of affordable) {
    if (purchases.length >= maxItems) break;
    try {
      const result = await purchaseVillageShopItem(userId, item.stockId);
      purchases.push({ slug: result.slug, price: result.pricePaid });
    } catch {
      break;
    }
  }
  return purchases;
}

async function enableTrainingPlans(userId) {
  const ninjas = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position LIMIT 2`,
    [userId]
  );
  for (const ninja of ninjas) {
    await query('UPDATE ninjas SET training_focus = ? WHERE id = ?', ['Taijutsu', ninja.id]);
  }
  return ninjas.length;
}

async function resetSimState(userId) {
  const row = await getClockRow();
  if (row?.cycle_start_at) {
    await query('DELETE FROM cycle_job_runs WHERE cycle_start_at = ?', [row.cycle_start_at]);
  }
  await query('DELETE FROM user_items WHERE user_id = ?', [userId]);
  await query('DELETE FROM village_shop_stock WHERE user_id = ?', [userId]);
  await query('DELETE FROM village_shop_promos WHERE user_id = ?', [userId]);
}

async function lastMatchReward(userId) {
  const rows = await query(
    `SELECT result, home_user_id, away_user_id FROM matches
     WHERE (home_user_id = ? OR away_user_id = ?) AND status = 'applied'
     ORDER BY results_applied_at DESC LIMIT 1`,
    [userId, userId]
  );
  const m = rows[0];
  if (!m) return 0;
  if (m.result === 'draw') return MATCH_DRAW_RYOS;
  if (m.result === 'home_win' && m.home_user_id === userId) return MATCH_WIN_RYOS;
  if (m.result === 'away_win' && m.away_user_id === userId) return MATCH_WIN_RYOS;
  return 0;
}

async function countInventory(userId) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM user_items WHERE user_id = ? AND consumed = FALSE`,
    [userId]
  );
  return rows[0]?.c ?? 0;
}

function formatRyos(n) {
  return n.toLocaleString('fr-FR');
}

function printVerdict(timeline) {
  const last = timeline[timeline.length - 1];
  const minRyos = Math.min(...timeline.map((t) => t.ryosEnd));
  const debtCycles = timeline.filter((t) => t.ryosEnd < 0).length;
  const blockedCycles = timeline.filter((t) => t.debtBlocks).length;

  console.log('\n── Verdict économique ──');
  console.log(`  Ryos final : ${formatRyos(last.ryosEnd)} (départ ${formatRyos(timeline[0].ryosStart)})`);
  console.log(`  Minimum atteint : ${formatRyos(minRyos)} · plafond découvert ${formatRyos(OVERDRAFT_LIMIT)}`);
  console.log(`  Cycles en dette : ${debtCycles}/${timeline.length}`);
  console.log(`  Achats totaux : ${timeline.reduce((s, t) => s + t.spentShop, 0)} Ryos · primes match +${timeline.reduce((s, t) => s + t.matchReward, 0)} · inventaire ${last.inventory} objets`);

  if (minRyos < OVERDRAFT_LIMIT) {
    console.log('  ⚠️  Dépassement du découvert autorisé — revoir sinks ou revenus.');
  } else if (minRyos < 2000) {
    console.log('  🟡 Trésorerie tendue — normal si achats agressifs sans victoires régulières.');
  } else if (debtCycles > timeline.length * 0.3) {
    console.log('  🟡 Dette fréquente mais récupérable — calibrage à affiner en playtest.');
  } else {
    console.log('  ✅ Équilibre Ryos soutenable sur la période simulée.');
  }
  if (blockedCycles > 0) {
    console.log(`  Gel administratif détecté sur ${blockedCycles} cycle(s).`);
  }
}

async function main() {
  const { cycles, itemsPerCycle, withTraining, startRyos } = parseArgs();

  const user = await findDemoUser();
  if (!user) {
    console.error('Joueur démo introuvable — exécutez npm run db:seed');
    process.exit(1);
  }

  console.log(`\n💰 Kage Legacy — simulation économie (${cycles} cycles)\n`);
  console.log(`  Joueur : demo_sensei · ${itemsPerCycle} achat(s)/cycle${withTraining ? ' · entraînement actif (×2)' : ''}`);

  await query('UPDATE sensei SET ryos = ?, salary_debt = FALSE WHERE user_id = ?', [
    startRyos,
    user.id,
  ]);
  await query('UPDATE ninjas SET training_focus = NULL WHERE user_id = ?', [user.id]);

  if (withTraining) {
    const planned = await enableTrainingPlans(user.id);
    console.log(`  Plans d'entraînement : ${planned} ninja(s)`);
  }

  await resetSimState(user.id);
  await setHourDev(0);

  const timeline = [];

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    try {
      await setHourDev(0);
      const clockRow = await getClockRow();
      if (clockRow?.cycle_start_at) {
        await query('DELETE FROM cycle_job_runs WHERE cycle_start_at = ?', [clockRow.cycle_start_at]);
      }

      const before = await getDebtStatus(user.id);
      const budget = await getCycleBudgetPreview(user.id);
      const purchases = await buyShopItems(user.id, itemsPerCycle);
      const spentShop = purchases.reduce((s, p) => s + p.price, 0);

      await jumpAndTick(36);
      await jumpAndTick(71);
      const h72 = await jumpAndTick(72);

      const after = await getDebtStatus(user.id);
      const inventory = await countInventory(user.id);
      const matchReward = await lastMatchReward(user.id);

      timeline.push({
        cycle,
        ryosStart: before.ryos,
        spentShop,
        matchReward,
        purchases,
        salaries: budget.salariesTotal,
        training: budget.trainingTotal,
        projectedH72: budget.projectedBalance,
        ryosEnd: after.ryos,
        debtBlocks: after.debtBlocksSpending,
        inventory,
        reset: h72?.action === 'cycle_reset',
      });

      const purchaseLabel = purchases.length
        ? purchases.map((p) => `${p.slug} (${p.price})`).join(', ')
        : '—';

      console.log(
        `  Cycle ${String(cycle).padStart(2)} │ ${formatRyos(before.ryos).padStart(7)} → ${formatRyos(after.ryos).padStart(7)} Ryos │ shop −${spentShop} │ sal. −${budget.salariesTotal}${matchReward ? ` │ match +${matchReward}` : ''}${withTraining ? ` │ train −${budget.trainingTotal}` : ''} │ ${purchaseLabel}`
      );
    } catch (err) {
      console.log(`  Cycle ${String(cycle).padStart(2)} │ ❌ ${err.message}`);
      if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        console.log('\n  ⚠️  La colonne sensei.ryos est UNSIGNED — le découvert négatif (spec −5 000) ne peut pas s\'appliquer en BDD.');
      }
      break;
    }
  }

  if (!timeline.length) {
    console.error('Aucun cycle simulé.');
    process.exit(1);
  }

  printVerdict(timeline);
  console.log('\n✅ Simulation terminée.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
