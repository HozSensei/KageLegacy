import { query } from '../config/database.js';

/**
 * Gel administratif (niveau C) : dette en cours bloque les dépenses club.
 */
export async function getDebtStatus(userId) {
  const rows = await query('SELECT ryos, salary_debt FROM sensei WHERE user_id = ?', [userId]);
  const ryos = rows[0]?.ryos ?? 0;
  const salaryDebt = Boolean(rows[0]?.salary_debt);
  const debtBlocksSpending = ryos < 0 || salaryDebt;

  return { ryos, salaryDebt, debtBlocksSpending };
}

export async function assertSpendingAllowed(userId, message) {
  const status = await getDebtStatus(userId);
  if (status.debtBlocksSpending) {
    const error = new Error(
      message || 'Gel administratif — remboursez votre dette avant toute nouvelle dépense.',
    );
    error.statusCode = 402;
    throw error;
  }
  return status;
}
