import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from '../config/database.js';
import { STARTING_RYOS } from '../config/economyConfig.js';
import { createCharacter } from './playerCharacterService.js';

const SESSION_DAYS = 30;
const GUEST_DAYS = 7;
const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  if (!stored?.startsWith('scrypt:')) return false;
  const [, salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

function sessionTokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

function guestExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + GUEST_DAYS);
  return d;
}

function guestUsername() {
  return `invite_${randomBytes(4).toString('hex')}`;
}

function accountUsername() {
  return `account_${randomBytes(10).toString('hex')}`;
}

function duplicateEmailError() {
  const err = new Error('Cette adresse e-mail est déjà utilisée.');
  err.statusCode = 409;
  return err;
}

async function assertEmailAvailable(email, excludeUserId = null) {
  const rows = await query(
    `SELECT id FROM users
     WHERE LOWER(email) = LOWER(?) AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [email, excludeUserId, excludeUserId],
  );
  if (rows[0]) throw duplicateEmailError();
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    is_admin: Boolean(row.is_admin),
    is_guest: Boolean(row.is_guest),
    guest_expires_at: row.guest_expires_at,
    email: row.email || null,
    created_at: row.created_at,
  };
}

export async function findUserByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

export async function findDemoAccount() {
  return findUserByUsername('demo_sensei');
}

export async function findUserById(userId) {
  const rows = await query(
    `SELECT id, username, is_admin, is_guest, guest_expires_at, email, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return mapUserRow(rows[0]);
}

export async function registerUser({
  username: requestedUsername,
  email,
  password,
  characterName,
  avatarId,
  language = 'fr',
}) {
  const normalizedEmail = email.trim().toLowerCase();
  await assertEmailAvailable(normalizedEmail);

  let username = requestedUsername || accountUsername();
  if (requestedUsername && (await findUserByUsername(requestedUsername))) {
    const err = new Error("Ce nom d'utilisateur interne est déjà pris.");
    err.statusCode = 409;
    throw err;
  }
  for (let attempt = 0; !requestedUsername && attempt < 5; attempt += 1) {
    if (!(await findUserByUsername(username))) break;
    username = accountUsername();
  }

  const passwordHash = hashPassword(password);
  let userResult;
  try {
    userResult = await query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, normalizedEmail, passwordHash],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateEmailError();
    throw error;
  }
  const userId = userResult.insertId;

  try {
    await query(
      `INSERT INTO player_profiles (user_id, display_name, ryos, language)
       VALUES (?, ?, ?, ?)`,
      [userId, characterName, STARTING_RYOS, language],
    );
    await createCharacter(userId, { name: characterName, avatarId });
  } catch (error) {
    await query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    throw error;
  }

  return { user: await findUserById(userId) };
}

export async function registerGuestUser({ characterName, avatarId, language = 'fr' }) {
  let username = guestUsername();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await findUserByUsername(username);
    if (!existing) break;
    username = guestUsername();
  }

  const expiresAt = guestExpiry();
  const playerDisplayName = characterName.trim();

  const userResult = await query(
    `INSERT INTO users (username, is_guest, guest_expires_at)
     VALUES (?, TRUE, ?)`,
    [username, expiresAt],
  );
  const userId = userResult.insertId;

  try {
    await query(
      `INSERT INTO player_profiles (user_id, display_name, ryos, language)
       VALUES (?, ?, ?, ?)`,
      [userId, playerDisplayName, STARTING_RYOS, language],
    );
    await createCharacter(userId, { name: playerDisplayName, avatarId });
  } catch (error) {
    await query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    throw error;
  }

  return {
    user: await findUserById(userId),
    guestExpiresAt: expiresAt,
  };
}

export async function convertGuestToAccount(userId, { password, email }) {
  const user = await findUserById(userId);
  if (!user?.is_guest) {
    const err = new Error("Ce compte n'est pas un essai invité.");
    err.statusCode = 400;
    throw err;
  }
  if (user.guest_expires_at && new Date(user.guest_expires_at) < new Date()) {
    const err = new Error("L'essai invité a expiré — créez un nouveau compte.");
    err.statusCode = 410;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  await assertEmailAvailable(normalizedEmail, userId);

  const passwordHash = hashPassword(password);
  try {
    await query(
      `UPDATE users
       SET password_hash = ?, email = ?, is_guest = FALSE, guest_expires_at = NULL
       WHERE id = ?`,
      [passwordHash, normalizedEmail, userId],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateEmailError();
    throw error;
  }

  return findUserById(userId);
}

export async function authenticateUser(identifier, password) {
  const normalizedIdentifier = identifier.trim();
  const rows = await query(
    `SELECT * FROM users
     WHERE username = ? OR LOWER(email) = LOWER(?)
     LIMIT 1`,
    [normalizedIdentifier, normalizedIdentifier],
  );
  const user = rows[0] || null;
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    const err = new Error('Identifiants invalides.');
    err.statusCode = 401;
    throw err;
  }
  return findUserById(user.id);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = sessionTokenHash(token);
  const expiresAt = sessionExpiry();

  await query('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [
    userId,
    tokenHash,
    expiresAt,
  ]);

  return { token, expiresAt };
}

export async function getUserBySessionToken(token) {
  if (!token) return null;
  const tokenHash = sessionTokenHash(token);
  const rows = await query(
    `SELECT u.id, u.username, u.is_admin, u.is_guest, u.guest_expires_at, u.email, u.created_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );
  const user = mapUserRow(rows[0]);
  if (!user) return null;

  if (user.is_guest && user.guest_expires_at && new Date(user.guest_expires_at) < new Date()) {
    await revokeSession(token);
    return null;
  }

  return user;
}

export async function revokeSession(token) {
  if (!token) return;
  const tokenHash = sessionTokenHash(token);
  await query('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash]);
}

export async function setUserPassword(userId, password) {
  const passwordHash = hashPassword(password);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const rows = await query('SELECT password_hash, is_guest FROM users WHERE id = ? LIMIT 1', [
    userId,
  ]);
  const row = rows[0];
  if (!row) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  if (row.is_guest) {
    const err = new Error("Compte invité : convertissez d'abord votre essai.");
    err.statusCode = 400;
    throw err;
  }
  if (!row.password_hash || !verifyPassword(currentPassword, row.password_hash)) {
    const err = new Error('Mot de passe actuel incorrect.');
    err.statusCode = 401;
    throw err;
  }
  await setUserPassword(userId, newPassword);
}

export async function updateUserEmail(userId, email) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  const normalizedEmail = email?.trim().toLowerCase() || null;
  if (!normalizedEmail && !user.is_guest && user.email) {
    const err = new Error('Une adresse e-mail est requise pour ce compte.');
    err.statusCode = 400;
    throw err;
  }
  if (normalizedEmail) await assertEmailAvailable(normalizedEmail, userId);
  try {
    await query('UPDATE users SET email = ? WHERE id = ?', [normalizedEmail, userId]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateEmailError();
    throw error;
  }
  return findUserById(userId);
}

export async function updatePlayerProfileLanguage(userId, language) {
  const result = await query('UPDATE player_profiles SET language = ? WHERE user_id = ?', [
    language,
    userId,
  ]);
  if (!result.affectedRows) {
    const err = new Error('Profil joueur introuvable.');
    err.statusCode = 404;
    throw err;
  }
  return language;
}

export function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `kage_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `kage_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
