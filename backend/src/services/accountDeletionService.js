import { query } from '../config/database.js';
import { findUserByUsername, verifyPassword } from './authService.js';

async function verifyDeletePassword(user, password) {
  if (user.is_guest) return;
  if (!password) {
    const err = new Error('Mot de passe requis pour supprimer le compte.');
    err.statusCode = 400;
    throw err;
  }
  const row = await findUserByUsername(user.username);
  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) {
    const err = new Error('Mot de passe incorrect.');
    err.statusCode = 401;
    throw err;
  }
}

/**
 * Suppression de compte V2 — sans remplacement bot de pool / clans joueurs (legacy).
 * player_character part via ON DELETE CASCADE.
 */
export async function deleteUserAccount(user, { password } = {}) {
  if (user.is_bot) {
    const err = new Error('Ce compte ne peut pas être supprimé.');
    err.statusCode = 403;
    throw err;
  }

  await verifyDeletePassword(user, password);

  await query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
  await query('DELETE FROM users WHERE id = ?', [user.id]);

  return { ok: true };
}
