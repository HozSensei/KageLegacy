import { query } from '../config/database.js';

/** Prime ligue — versée à H72 lors de l'application des résultats (humains uniquement). */
export const MATCH_WIN_RYOS = 1500;
export const MATCH_DRAW_RYOS = 500;

async function isHumanUser(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  return Boolean(rows[0] && !rows[0].is_bot);
}

/**
 * Crédite la prime de match (victoire ou nul). Défaite = 0 Ryos.
 * @returns {number} Montant crédité
 */
export async function creditMatchOutcome(userId, outcome) {
  const amount =
    outcome === 'win' ? MATCH_WIN_RYOS : outcome === 'draw' ? MATCH_DRAW_RYOS : 0;
  if (!amount || !(await isHumanUser(userId))) return 0;

  await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [amount, userId]);
  return amount;
}
