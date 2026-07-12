import { query } from '../config/database.js';
import { computeSalaryCost } from './ninjaStats.js';
import { getCycleEquipmentByUser } from './equipmentService.js';
import { getSalaryDiscountPercent } from './combat/equipment.js';
import { applyTrainingForUser, computeTrainingCost, FOCUS_VALUES } from './training.js';
import { getHeritageBonuses, applyPercentDiscount } from './heritageService.js';
import { createSenseiNotification } from './senseiNotifications.js';

export const OVERDRAFT_LIMIT = -5000;
export const DEBT_INTEREST_RATE = 0.03;

export async function computeSalaryTotalForUser(userId) {
  const ninjas = await query(
    `SELECT id, grade, taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence, salary_cost
     FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL`,
    [userId]
  );

  const cycleGear = await getCycleEquipmentByUser(userId);
  const cycleByNinja = cycleGear.reduce((acc, row) => {
    if (!acc[row.ninja_id]) acc[row.ninja_id] = [];
    acc[row.ninja_id].push(row);
    return acc;
  }, {});

  let total = 0;
  const lines = [];

  for (const ninja of ninjas) {
    const stats = {
      taijutsu: ninja.taijutsu,
      ninjutsu: ninja.ninjutsu,
      genjutsu: ninja.genjutsu,
      medecine: ninja.medecine,
      vitesse: ninja.vitesse,
      intelligence: ninja.intelligence,
    };
    let salary = ninja.salary_cost || computeSalaryCost(ninja.grade, stats);
    const discount = getSalaryDiscountPercent(ninja, cycleByNinja[ninja.id] || []);
    if (discount > 0) {
      salary = Math.max(0, Math.floor(salary * (1 - discount / 100)));
    }
    total += salary;
    lines.push({ ninjaId: ninja.id, amount: salary, label: 'salaire' });
  }

  return { total, lines };
}

export async function getCycleBudgetPreview(userId) {
  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);
  const ryos = senseiRows[0]?.ryos ?? 0;

  const ninjas = await query(
    `SELECT id, name, grade, training_focus,
            taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence
     FROM ninjas WHERE user_id = ?`,
    [userId]
  );

  const { total: salariesTotal, lines: salaryLines } = await computeSalaryTotalForUser(userId);
  const heritage = await getHeritageBonuses(userId);

  const trainingLines = [];
  let trainingTotal = 0;
  for (const ninja of ninjas) {
    if (!ninja.training_focus) continue;
    const amount = applyPercentDiscount(
      computeTrainingCost(ninja),
      heritage.trainingDiscountPct
    );
    trainingTotal += amount;
    trainingLines.push({
      ninjaId: ninja.id,
      ninjaName: ninja.name,
      focus: ninja.training_focus,
      amount,
      label: 'entrainement',
    });
  }

  const interest =
    ryos - salariesTotal - trainingTotal < 0
      ? Math.ceil(Math.abs(Math.min(0, ryos - salariesTotal - trainingTotal)) * DEBT_INTEREST_RATE)
      : 0;

  const projectedBalance = ryos - salariesTotal - trainingTotal - interest;

  return {
    ryos,
    salariesTotal,
    trainingTotal,
    interestProjected: interest,
    projectedBalance,
    overdraftLimit: OVERDRAFT_LIMIT,
    trainingLines,
    salaryLines,
    ninjasWithPlan: trainingLines.length,
  };
}

function applyInterest(balance) {
  if (balance >= 0) return { balance, interest: 0 };
  const interest = Math.ceil(Math.abs(balance) * DEBT_INTEREST_RATE);
  return { balance: balance - interest, interest };
}

/**
 * Facturation H72 puis application des gains (opt-in par ninja).
 * Ordre : après salaires. Ninjas non couverts = pas de gain.
 */
export async function processTrainingBillingForUser(userId) {
  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);
  let balance = senseiRows[0]?.ryos ?? 0;

  const planned = await query(
    `SELECT id, name, grade, training_focus,
            taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
            age, character_trait, training_residual, training_buff
     FROM ninjas
     WHERE user_id = ? AND training_focus IS NOT NULL
     ORDER BY id`,
    [userId]
  );

  const heritage = await getHeritageBonuses(userId);
  const paidNinjaIds = [];
  const billingLogs = [];

  for (const ninja of planned) {
    const cost = applyPercentDiscount(computeTrainingCost(ninja), heritage.trainingDiscountPct);
    const after = balance - cost;
    if (after < OVERDRAFT_LIMIT) {
      billingLogs.push(
        `${ninja.name} : entraînement ${ninja.training_focus} annulé (Ryos insuffisants, découvert max ${OVERDRAFT_LIMIT}).`
      );
      continue;
    }
    balance = after;
    paidNinjaIds.push(ninja.id);
    billingLogs.push(`${ninja.name} : −${cost} Ryos (entraînement ${ninja.training_focus}).`);
  }

  const { balance: afterInterest, interest } = applyInterest(balance);
  if (interest > 0) {
    billingLogs.push(`Intérêts sur dette : −${interest} Ryos.`);
  }

  await query('UPDATE sensei SET ryos = ?, salary_debt = ? WHERE user_id = ?', [
    afterInterest,
    afterInterest < 0,
    userId,
  ]);

  const { logs: trainingLogs } = await applyTrainingForUser(userId, { onlyNinjaIds: paidNinjaIds });

  const totalCost = billingLogs
    .filter((line) => line.includes('−') && line.includes('Ryos'))
    .reduce((sum, line) => {
      const match = line.match(/−(\d+) Ryos/);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);

  if (planned.length > 0 || billingLogs.length > 0 || trainingLogs.length > 0) {
    await createSenseiNotification(userId, 'training_billing', {
      paidCount: paidNinjaIds.length,
      skippedCount: planned.length - paidNinjaIds.length,
      totalCost,
      billingLogs,
      trainingLogs,
      balanceAfter: afterInterest,
    });
  }

  return { billingLogs, trainingLogs, paidCount: paidNinjaIds.length, skippedCount: planned.length - paidNinjaIds.length };
}

export async function processTrainingBillingForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    results.push({ userId: user.id, ...(await processTrainingBillingForUser(user.id)) });
  }
  return results;
}

export { FOCUS_VALUES };
