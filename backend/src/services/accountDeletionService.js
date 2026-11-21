import { query } from '../config/database.js';
import { findUserByUsername, verifyPassword } from './authService.js';

async function userHasOAuth(userId) {
  const rows = await query(
    'SELECT id FROM oauth_accounts WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return Boolean(rows[0]);
}

async function verifyDeletePassword(user, password) {
  if (user.is_guest) return;
  const row = await findUserByUsername(user.username);
  if (!row?.password_hash) {
    if (await userHasOAuth(user.id)) return;
    const err = new Error('Mot de passe requis pour supprimer le compte.');
    err.statusCode = 400;
    throw err;
  }
  if (!password) {
    const err = new Error('Mot de passe requis pour supprimer le compte.');
    err.statusCode = 400;
    throw err;
  }
  if (!verifyPassword(password, row.password_hash)) {
    const err = new Error('Mot de passe incorrect.');
    err.statusCode = 401;
    throw err;
  }
}

/** Supprime le compte et ses données associées via les clés étrangères. */
export async function deleteUserAccount(user, { password } = {}) {
  await verifyDeletePassword(user, password);

  await query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
  await query('DELETE FROM users WHERE id = ?', [user.id]);

  return { ok: true };
}
