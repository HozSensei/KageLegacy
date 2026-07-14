import { query } from '../config/database.js';
import { computeSalaryCost } from './ninjaStats.js';
import { getCycleEquipmentByUser } from './equipmentService.js';
import { getSalaryDiscountPercent } from './combat/equipment.js';

export async function deductSalariesForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];

  for (const user of users) {
    const ninjas = await query(
      `SELECT id, grade, taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence, salary_cost
       FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL`,
      [user.id]
    );

    const cycleGear = await getCycleEquipmentByUser(user.id);
    const cycleByNinja = cycleGear.reduce((acc, row) => {
      if (!acc[row.ninja_id]) acc[row.ninja_id] = [];
      acc[row.ninja_id].push(row);
      return acc;
    }, {});

    let total = 0;
    for (const ninja of ninjas) {
      const stats = {
        taijutsu: ninja.taijutsu,
        ninjutsu: ninja.ninjutsu,
        genjutsu: ninja.genjutsu,
        medecine: ninja.medecine,
        vitesse: ninja.vitesse,
        intelligence: ninja.intelligence,
      };
      let salary = computeSalaryCost(ninja.grade, stats);
      const discount = getSalaryDiscountPercent(ninja, cycleByNinja[ninja.id] || []);
      if (discount > 0) {
        salary = Math.max(0, Math.floor(salary * (1 - discount / 100)));
      }
      total += salary;
    }

    const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [user.id]);
    const before = senseiRows[0]?.ryos ?? 0;
    const after = before - total;

    await query('UPDATE sensei SET ryos = ?, salary_debt = ? WHERE user_id = ?', [
      after,
      after < 0,
      user.id,
    ]);

    if (after < 0) {
      await query(
        `UPDATE ninjas SET moral = GREATEST(1, FLOOR(moral * 0.8))
         WHERE user_id = ? AND squad_position IS NOT NULL`,
        [user.id]
      );
    }

    results.push({ userId: user.id, deducted: total, balance: after, bankrupt: after < 0 });
  }

  return results;
}
