#!/usr/bin/env node
/**
 * Simulation économique multi-cycles : achats magasin, matchs, progression grades.
 * Usage: npm run economy:simulate [-- --cycles=20 --items=1 --chunin --bird-flight]
 *        --progression = --chunin + --bird-flight
 *
 * Prérequis : npm run db:seed (utilise demo_sensei).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { findDemoUser } from '../src/models/sensei.js';
import { requestBirdFlight, requestChuninExam } from '../src/models/squadTactics.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getDebtStatus } from '../src/services/economyDebt.js';
import { meetsChuninRequirements } from '../src/services/chuninExam.js';
import { meetsBirdFlightRequirements } from '../src/services/birdFlightExam.js';
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
  const withProgression = process.argv.includes('--progression');
  const withChunin = process.argv.includes('--chunin') || withProgression;
  const withBirdFlight = process.argv.includes('--bird-flight') || withProgression;
  const startRyos =
    Number(process.argv.find((a) => a.startsWith('--ryos='))?.split('=')[1]) || 15400;
  return { cycles, itemsPerCycle, withTraining, withChunin, withBirdFlight, startRyos };
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
    await query('UPDATE ninjas SET preparation_type = ? WHERE id = ?', ['Physique', ninja.id]);
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
  await query('DELETE FROM sensei_notifications WHERE user_id = ?', [userId]);
  await query(
    `UPDATE ninjas SET chunin_exam_requested = FALSE, bird_flight_requested = FALSE WHERE user_id = ?`,
    [userId]
  );
}

async function benchGeninCandidates(userId) {
  return query(
    `SELECT * FROM ninjas
     WHERE user_id = ? AND grade = 'Genin' AND squad_position IS NULL
       AND chunin_exam_requested = FALSE
     ORDER BY id`,
    [userId]
  );
}

async function benchChuninCandidates(userId) {
  return query(
    `SELECT * FROM ninjas
     WHERE user_id = ? AND grade = 'Chunin' AND squad_position IS NULL
       AND bird_flight_requested = FALSE
     ORDER BY id`,
    [userId]
  );
}

async function boostGeninForExam(ninjaId) {
  await query(
    `UPDATE ninjas
     SET taijutsu = GREATEST(taijutsu, 10), intelligence = GREATEST(intelligence, 8)
     WHERE id = ?`,
    [ninjaId]
  );
}

async function boostChuninForBirdFlight(ninjaId) {
  await query(
    `UPDATE ninjas
     SET taijutsu = GREATEST(taijutsu, 16), intelligence = GREATEST(intelligence, 14)
     WHERE id = ?`,
    [ninjaId]
  );
}

async function tryRegisterChuninExam(userId, { allowBoost = true } = {}) {
  const pending = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND chunin_exam_requested = TRUE LIMIT 1`,
    [userId]
  );
  if (pending.length) return { registered: false, cost: 0 };

  const candidates = await benchGeninCandidates(userId);

  for (const ninja of candidates) {
    if (meetsChuninRequirements(ninja)) {
      try {
        const { cost } = await requestChuninExam(userId, ninja.id);
        return { registered: true, cost, ninjaId: ninja.id, boosted: false };
      } catch {
        /* essayer le suivant */
      }
    }
  }

  if (allowBoost && candidates[0]) {
    await boostGeninForExam(candidates[0].id);
    try {
      const { cost } = await requestChuninExam(userId, candidates[0].id);
      return { registered: true, cost, ninjaId: candidates[0].id, boosted: true };
    } catch {
      /* ignore */
    }
  }

  return { registered: false, cost: 0 };
}

async function tryRegisterBirdFlight(userId, { allowBoost = true } = {}) {
  const pending = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND bird_flight_requested = TRUE LIMIT 1`,
    [userId]
  );
  if (pending.length) return { registered: false };

  const candidates = await benchChuninCandidates(userId);

  for (const ninja of candidates) {
    if (meetsBirdFlightRequirements(ninja)) {
      try {
        await requestBirdFlight(userId, ninja.id);
        return { registered: true, ninjaId: ninja.id, boosted: false };
      } catch {
        /* essayer le suivant */
      }
    }
  }

  if (allowBoost && candidates[0]) {
    await boostChuninForBirdFlight(candidates[0].id);
    try {
      await requestBirdFlight(userId, candidates[0].id);
      return { registered: true, ninjaId: candidates[0].id, boosted: true };
    } catch {
      /* ignore */
    }
  }

  return { registered: false };
}

async function countGrade(userId, grade) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM ninjas WHERE user_id = ? AND grade = ?`,
    [userId, grade]
  );
  return rows[0]?.c ?? 0;
}

async function lastBirdFlightReward(userId) {
  const rows = await query(
    `SELECT payload, created_at FROM sensei_notifications
     WHERE user_id = ? AND kind = 'bird_flight'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return { ryos: 0, reputation: 0 };
  const payload =
    typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
  return {
    ryos: payload.departed?.ryosReward ?? 0,
    reputation: payload.departed?.reputationReward ?? 0,
    createdAt: rows[0].created_at,
  };
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

function printVerdict(timeline, opts) {
  const last = timeline[timeline.length - 1];
  const minRyos = Math.min(...timeline.map((t) => t.ryosEnd));
  const debtCycles = timeline.filter((t) => t.ryosEnd < 0).length;
  const blockedCycles = timeline.filter((t) => t.debtBlocks).length;
  const totalExam = timeline.reduce((s, t) => s + t.examCost, 0);
  const totalBird = timeline.reduce((s, t) => s + t.birdFlightReward, 0);
  const promotions = timeline.reduce((s, t) => s + t.chuninPromoted, 0);
  const departures = timeline.filter((t) => t.birdFlightReward > 0).length;

  console.log('\n── Verdict économique ──');
  console.log(`  Ryos final : ${formatRyos(last.ryosEnd)} (départ ${formatRyos(timeline[0].ryosStart)})`);
  console.log(`  Minimum atteint : ${formatRyos(minRyos)} · plafond découvert ${formatRyos(OVERDRAFT_LIMIT)}`);
  console.log(`  Cycles en dette : ${debtCycles}/${timeline.length}`);
  console.log(
    `  Achats magasin : −${timeline.reduce((s, t) => s + t.spentShop, 0)} · match +${timeline.reduce((s, t) => s + t.matchReward, 0)} Ryos`
  );
  if (opts.withChunin) {
    console.log(`  Examens Chunin : −${totalExam} Ryos · ${promotions} promotion(s) Genin→Chunin`);
  }
  if (opts.withBirdFlight) {
    console.log(`  Vol d'Oiseau : +${totalBird} Ryos · ${departures} départ(s)`);
  }
  console.log(`  Inventaire final : ${last.inventory} objet(s)`);

  if (minRyos < OVERDRAFT_LIMIT) {
    console.log('  ⚠️  Dépassement du découvert autorisé — revoir sinks ou revenus.');
  } else if (minRyos < 2000) {
    console.log('  🟡 Trésorerie tendue — normal si achats agressifs sans victoires régulières.');
  } else if (debtCycles > timeline.length * 0.3) {
    console.log('  🟡 Dette fréquente mais récupérable — calibrage à affiner en playtest.');
  } else {
    console.log('  ✅ Équilibre Ryos soutenable sur la période simulée.');
  }
  console.log(`  💡 Calibrage analytique : npm run economy:calibrate (primes actuelles ${MATCH_WIN_RYOS} / ${MATCH_DRAW_RYOS})`);
  if (blockedCycles > 0) {
    console.log(`  Gel administratif détecté sur ${blockedCycles} cycle(s).`);
  }
}

async function main() {
  const { cycles, itemsPerCycle, withTraining, withChunin, withBirdFlight, startRyos } =
    parseArgs();

  const user = await findDemoUser();
  if (!user) {
    console.error('Joueur démo introuvable — exécutez npm run db:seed');
    process.exit(1);
  }

  console.log(`\n💰 Kage Legacy — simulation économie (${cycles} cycles)\n`);
  const flags = [
    `${itemsPerCycle} achat(s)/cycle`,
    withTraining ? 'entraînement ×2' : null,
    withChunin ? 'examens Chunin' : null,
    withBirdFlight ? "Vol d'Oiseau" : null,
  ]
    .filter(Boolean)
    .join(' · ');
  console.log(`  Joueur : demo_sensei · ${flags}`);

  await query('UPDATE sensei SET ryos = ?, salary_debt = FALSE WHERE user_id = ?', [
    startRyos,
    user.id,
  ]);
  await query('UPDATE ninjas SET preparation_type = NULL WHERE user_id = ?', [user.id]);

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

      let examCost = 0;
      let examNote = '';
      if (withChunin) {
        const exam = await tryRegisterChuninExam(user.id);
        examCost = exam.cost;
        if (exam.registered) {
          examNote = `exam −${exam.cost}${exam.boosted ? '*' : ''}`;
        }
      }

      let birdNote = '';
      if (withBirdFlight) {
        const bird = await tryRegisterBirdFlight(user.id);
        if (bird.registered) {
          birdNote = `vol inscrit${bird.boosted ? '*' : ''}`;
        }
      }

      const purchases = await buyShopItems(user.id, itemsPerCycle);
      const spentShop = purchases.reduce((s, p) => s + p.price, 0);

      const geninBeforeH36 = await countGrade(user.id, 'Genin');

      const notifBefore = await query(
        `SELECT COUNT(*) AS c FROM sensei_notifications WHERE user_id = ? AND kind = 'bird_flight'`,
        [user.id]
      );

      await jumpAndTick(36);

      const geninAfterH36 = await countGrade(user.id, 'Genin');
      const chuninPromoted = Math.max(0, geninBeforeH36 - geninAfterH36);

      await jumpAndTick(71);
      await jumpAndTick(72);

      const notifAfter = await query(
        `SELECT COUNT(*) AS c FROM sensei_notifications WHERE user_id = ? AND kind = 'bird_flight'`,
        [user.id]
      );
      const birdFlightReward =
        notifAfter[0].c > notifBefore[0].c ? (await lastBirdFlightReward(user.id)).ryos : 0;

      const after = await getDebtStatus(user.id);
      const inventory = await countInventory(user.id);
      const matchReward = await lastMatchReward(user.id);

      timeline.push({
        cycle,
        ryosStart: before.ryos,
        spentShop,
        examCost,
        chuninPromoted,
        birdFlightReward,
        matchReward,
        purchases,
        salaries: budget.salariesTotal,
        training: budget.trainingTotal,
        ryosEnd: after.ryos,
        debtBlocks: after.debtBlocksSpending,
        inventory,
      });

      const purchaseLabel = purchases.length
        ? purchases.map((p) => `${p.slug} (${p.price})`).join(', ')
        : '—';

      const extras = [examNote, birdNote, matchReward ? `match +${matchReward}` : '', birdFlightReward ? `vol +${birdFlightReward}` : '']
        .filter(Boolean)
        .join(' │ ');

      console.log(
        `  Cycle ${String(cycle).padStart(2)} │ ${formatRyos(before.ryos).padStart(7)} → ${formatRyos(after.ryos).padStart(7)} Ryos │ shop −${spentShop} │ sal. −${budget.salariesTotal}${withTraining ? ` │ train −${budget.trainingTotal}` : ''}${chuninPromoted ? ` │ ↑${chuninPromoted} Chunin` : ''}${extras ? ` │ ${extras}` : ''} │ ${purchaseLabel}`
      );
    } catch (err) {
      console.log(`  Cycle ${String(cycle).padStart(2)} │ ❌ ${err.message}`);
      break;
    }
  }

  if (!timeline.length) {
    console.error('Aucun cycle simulé.');
    process.exit(1);
  }

  printVerdict(timeline, { withChunin, withBirdFlight });
  if (withChunin || withBirdFlight) {
    console.log('  * stats boostées pour forcer l’éligibilité si aucun candidat prêt sur le banc');
  }
  console.log('\n✅ Simulation terminée.\n');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
