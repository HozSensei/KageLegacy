import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from '../config/database.js';
import { joinOrCreatePool, joinPoolByInvite } from './poolService.js';
import { provisionStarterSquad } from './starterSquadService.js';

const SESSION_DAYS = 30;
const GUEST_DAYS = 7;
const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, stored) {
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

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    is_bot: Boolean(row.is_bot),
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

export async function findUserById(userId) {
  const rows = await query(
    `SELECT id, username, is_bot, is_guest, guest_expires_at, email, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return mapUserRow(rows[0]);
}

export async function registerUser({
  username,
  password,
  senseiName,
  language = 'fr',
  invitePoolId,
}) {
  const existing = await findUserByUsername(username);
  if (existing) {
    const err = new Error('Ce nom d\'utilisateur est déjà pris.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = hashPassword(password);
  const userResult = await query(
    'INSERT INTO users (username, password_hash, is_bot) VALUES (?, ?, FALSE)',
    [username, passwordHash]
  );
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Genjutsu', 10000, 0, 100, ?)`,
    [userId, senseiName, language]
  );

  const numericInvite =
    invitePoolId != null && invitePoolId !== '' ? Number(invitePoolId) : null;
  const poolJoin = numericInvite
    ? await joinPoolByInvite(userId, numericInvite)
    : { pool: await joinOrCreatePool(userId), fallback: false, reason: 'standard' };

  await provisionStarterSquad(userId, language);

  return {
    user: await findUserById(userId),
    poolJoin,
  };
}

export async function registerGuestUser({ senseiName, language = 'fr' }) {
  let username = guestUsername();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await findUserByUsername(username);
    if (!existing) break;
    username = guestUsername();
  }

  const expiresAt = guestExpiry();
  const displayName = senseiName?.trim() || 'Sensei invité';

  const userResult = await query(
    `INSERT INTO users (username, is_bot, is_guest, guest_expires_at)
     VALUES (?, FALSE, TRUE, ?)`,
    [username, expiresAt]
  );
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Genjutsu', 10000, 0, 100, ?)`,
    [userId, displayName, language]
  );

  const poolJoin = { pool: await joinOrCreatePool(userId), fallback: false, reason: 'guest' };
  await provisionStarterSquad(userId, language);

  return {
    user: await findUserById(userId),
    poolJoin,
    guestExpiresAt: expiresAt,
  };
}

export async function convertGuestToAccount(userId, { username, password, email, senseiName }) {
  const user = await findUserById(userId);
  if (!user?.is_guest) {
    const err = new Error('Ce compte n\'est pas un essai invité.');
    err.statusCode = 400;
    throw err;
  }
  if (user.guest_expires_at && new Date(user.guest_expires_at) < new Date()) {
    const err = new Error('L\'essai invité a expiré — créez un nouveau compte.');
    err.statusCode = 410;
    throw err;
  }

  const existing = await findUserByUsername(username);
  if (existing && existing.id !== userId) {
    const err = new Error('Ce nom d\'utilisateur est déjà pris.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = hashPassword(password);
  await query(
    `UPDATE users
     SET username = ?, password_hash = ?, email = ?, is_guest = FALSE, guest_expires_at = NULL
     WHERE id = ?`,
    [username, passwordHash, email || null, userId]
  );

  if (senseiName?.trim()) {
    await query('UPDATE sensei SET name = ? WHERE user_id = ?', [senseiName.trim(), userId]);
  }

  return findUserById(userId);
}

export async function authenticateUser(username, password) {
  const user = await findUserByUsername(username);
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

  await query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

export async function getUserBySessionToken(token) {
  if (!token) return null;
  const tokenHash = sessionTokenHash(token);
  const rows = await query(
    `SELECT u.id, u.username, u.is_bot, u.is_guest, u.guest_expires_at, u.email, u.created_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash]
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

export function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `kage_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `kage_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}
