import { query } from '../config/database.js';

/** Prime ligue — versée à H72 lors de l'application des résultats (humains uniquement). */
/** Calibré juil. 2026 — economy:calibrate profil modéré 20 cycles (missions + match). */
export const MATCH_WIN_RYOS = 1600;
export const MATCH_DRAW_RYOS = 800;
/** Consolation défaite + lot bonus via combatLootService. */
export const MATCH_LOSS_RYOS = 100;

async function isHumanUser(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  return Boolean(rows[0] && !rows[0].is_bot);
}

/**
 * Crédite la prime de match (victoire, nul ou consolation défaite).
 * @deprecated Préférer grantLeagueMatchLoot (combatLootService) pour Ryos + objets + cartes.
 * @returns {number} Montant crédité
 */
export async function creditMatchOutcome(userId, outcome) {
  const amount =
    outcome === 'win'
      ? MATCH_WIN_RYOS
      : outcome === 'draw'
        ? MATCH_DRAW_RYOS
        : MATCH_LOSS_RYOS;
  if (!amount || !(await isHumanUser(userId))) return 0;

  await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [amount, userId]);
  return amount;
}
