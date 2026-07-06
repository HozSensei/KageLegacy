#!/usr/bin/env node
/**
 * Playtest d'un cycle complet : jalons H0 → H36 → H71 → H72.
 * Usage: npm run playtest:cycle
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { setHourDev, getGameClock } from '../src/services/gameClock.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getDebtStatus } from '../src/services/economyDebt.js';
import { getMissionsForUser } from '../src/services/missionService.js';
import { getVillageShopForUser } from '../src/services/villageShopService.js';
import { getCycleBudgetPreview } from '../src/services/trainingBilling.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function demoUserId() {
  const rows = await query('SELECT id FROM users WHERE is_bot = FALSE LIMIT 1');
  return rows[0]?.id;
}

async function snapshot(label, userId) {
  const clock = await getGameClock();
  const debt = await getDebtStatus(userId);
  const budget = await getCycleBudgetPreview(userId);
  const missions = await getMissionsForUser(userId);
  const shop = await getVillageShopForUser(userId);
  const poolRow = await query(
    `SELECT p.id, p.current_cycle, p.division_level
     FROM pools p JOIN pool_members pm ON pm.pool_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active' LIMIT 1`,
    [userId]
  );
  const matchCount = poolRow[0]
    ? (
        await query(
          `SELECT COUNT(*) AS c FROM matches WHERE pool_id = ? AND season_cycle = ?`,
          [poolRow[0].id, poolRow[0].current_cycle]
        )
      )[0].c
    : 0;

  console.log(`\n── ${label} (H${clock.hour} · ${clock.phase}) ──`);
  console.log(`  Ryos: ${debt.ryos.toLocaleString()}${debt.debtBlocksSpending ? ' · DETTE' : ''}`);
  console.log(
    `  Budget H72 projeté: ${budget.projectedBalance.toLocaleString()} Ryos (salaires −${budget.salariesTotal}, entraînement −${budget.trainingTotal})`
  );
  console.log(
    `  Missions: ${missions.activeMissions.length} actives · ${missions.pendingCollection.length} à collecter · fenêtre ${missions.windowOpen ? 'ouverte' : 'fermée'}`
  );
  console.log(
    `  Magasin: ${shop.items.length} articles · ${shop.promoCount} promo(s) · réassort dans ${shop.cyclesUntilRestock} cycle(s)`
  );
  if (poolRow[0]) {
    console.log(
      `  Pool #${poolRow[0].id} · cycle ${poolRow[0].current_cycle} · ${matchCount} match(s) journée`
    );
  }
}

async function jumpAndTick(hour) {
  await setHourDev(hour);
  return processCycleTick();
}

async function main() {
  const userId = await demoUserId();
  if (!userId) {
    console.error('Aucun joueur démo — exécutez npm run db:seed');
    process.exit(1);
  }

  console.log('\n🎮 Kage Legacy — playtest cycle (jalons clés)\n');

  await setHourDev(0);
  await snapshot('H0 — ouverture', userId);

  const h36 = await jumpAndTick(36);
  console.log('  Tick H36:', h36?.actions?.length ? 'jobs exécutés' : 'ok');
  await snapshot('H36 — examens + scout', userId);

  const h71 = await jumpAndTick(71);
  console.log('  Tick H71:', h71?.actions?.length ? 'simulation matchs' : 'ok');
  await snapshot('H71 — opération live', userId);

  const h72 = await jumpAndTick(72);
  console.log('  Tick H72:', h72?.action === 'cycle_reset' ? 'fin de cycle' : JSON.stringify(h72));
  await snapshot('H72 — après reset', userId);

  console.log('\n✅ Playtest cycle terminé.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
