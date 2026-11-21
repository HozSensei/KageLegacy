import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/database.js';
import { STARTING_RYOS } from '../config/economyConfig.js';
import { DEFAULT_AVATAR_ID } from './characterAppearance.js';
import { createCharacter } from './playerCharacterService.js';
import {
  accountUsername,
  findUserById,
  mapUserRow,
} from './authService.js';

const PROVIDER = 'google';

function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

export function isGoogleAuthConfigured() {
  return Boolean(googleClientId());
}

export function getGoogleAuthPublicConfig() {
  const clientId = googleClientId();
  if (!clientId) return { enabled: false, clientId: null };
  return { enabled: true, clientId };
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeCharacterName(raw, email) {
  const fromGoogle = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  if (fromGoogle.length >= 2) return fromGoogle;
  const local = String(email || '')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 100);
  if (local.length >= 2) return local;
  return 'Shinobi';
}

async function findUserIdByOAuth(providerUserId) {
  const rows = await query(
    `SELECT user_id FROM oauth_accounts
     WHERE provider = ? AND provider_user_id = ?
     LIMIT 1`,
    [PROVIDER, providerUserId],
  );
  return rows[0]?.user_id || null;
}

async function findUserByEmail(email) {
  const rows = await query(
    `SELECT id, username, is_admin, is_guest, guest_expires_at, email, created_at,
            password_hash IS NOT NULL AS has_password
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [email],
  );
  return mapUserRow(rows[0]);
}

async function linkOAuthAccount(userId, providerUserId, email) {
  const existingForUser = await query(
    `SELECT id, provider_user_id FROM oauth_accounts
     WHERE user_id = ? AND provider = ?
     LIMIT 1`,
    [userId, PROVIDER],
  );
  if (existingForUser[0]) {
    if (existingForUser[0].provider_user_id !== providerUserId) {
      throw httpError(409, 'Ce compte est déjà lié à un autre compte Google.');
    }
    await query('UPDATE oauth_accounts SET email = ? WHERE id = ?', [
      email,
      existingForUser[0].id,
    ]);
    return;
  }

  const existingProvider = await query(
    `SELECT user_id FROM oauth_accounts
     WHERE provider = ? AND provider_user_id = ?
     LIMIT 1`,
    [PROVIDER, providerUserId],
  );
  if (existingProvider[0] && existingProvider[0].user_id !== userId) {
    throw httpError(409, 'Ce compte Google est déjà lié à un autre utilisateur.');
  }

  try {
    await query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
       VALUES (?, ?, ?, ?)`,
      [userId, PROVIDER, providerUserId, email],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Ce compte Google est déjà lié à un autre utilisateur.');
    }
    throw error;
  }
}

async function convertGuestWithGoogle(userId, { email, providerUserId }) {
  try {
    await query(
      `UPDATE users
       SET email = ?, is_guest = FALSE, guest_expires_at = NULL
       WHERE id = ? AND is_guest = TRUE`,
      [email, userId],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Cette adresse e-mail est déjà utilisée.');
    }
    throw error;
  }
  await linkOAuthAccount(userId, providerUserId, email);
  return findUserById(userId);
}

async function registerGoogleUser({ email, name, providerUserId, language, avatarId }) {
  const characterName = normalizeCharacterName(name, email);
  let username = accountUsername();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (!rows[0]) break;
    username = accountUsername();
  }

  let userResult;
  try {
    userResult = await query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, NULL)',
      [username, email],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Cette adresse e-mail est déjà utilisée.');
    }
    throw error;
  }
  const userId = userResult.insertId;

  try {
    await query(
      `INSERT INTO player_profiles (user_id, display_name, ryos, language)
       VALUES (?, ?, ?, ?)`,
      [userId, characterName, STARTING_RYOS, language === 'en' ? 'en' : 'fr'],
    );
    await createCharacter(userId, {
      name: characterName,
      avatarId: avatarId || DEFAULT_AVATAR_ID,
    });
    await linkOAuthAccount(userId, providerUserId, email);
  } catch (error) {
    await query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
    throw error;
  }

  return findUserById(userId);
}

/**
 * Vérifie un ID token Google Identity Services et renvoie le profil minimal.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!isGoogleAuthConfigured()) {
    throw httpError(503, 'Connexion Google non configurée.');
  }
  if (!idToken || typeof idToken !== 'string') {
    throw httpError(400, 'Jeton Google manquant.');
  }

  const client = new OAuth2Client(googleClientId());
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId(),
    });
  } catch {
    throw httpError(401, 'Jeton Google invalide.');
  }

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw httpError(401, 'Jeton Google invalide.');
  }
  if (!payload.email) {
    throw httpError(400, 'Adresse e-mail Google introuvable.');
  }
  if (payload.email_verified === false) {
    throw httpError(403, 'Adresse e-mail Google non vérifiée.');
  }

  return {
    providerUserId: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name || null,
  };
}

/**
 * Connexion / inscription Google.
 * Règle : même e-mail = même compte (liaison OAuth si besoin).
 * Invité sans conflit d'e-mail → conversion de l'essai.
 */
export async function authenticateWithGoogle(
  { idToken, language = 'fr', avatarId = null },
  { currentUser = null } = {},
) {
  const google = await verifyGoogleIdToken(idToken);

  const linkedUserId = await findUserIdByOAuth(google.providerUserId);
  if (linkedUserId) {
    const linked = await findUserById(linkedUserId);
    if (!linked) throw httpError(500, 'Compte Google orphelin.');
    return linked;
  }

  const byEmail = await findUserByEmail(google.email);
  if (byEmail) {
    if (byEmail.is_guest) {
      throw httpError(409, 'Compte invité en conflit — reconnectez-vous.');
    }
    await linkOAuthAccount(byEmail.id, google.providerUserId, google.email);
    return findUserById(byEmail.id);
  }

  if (currentUser?.is_guest) {
    return convertGuestWithGoogle(currentUser.id, google);
  }

  return registerGoogleUser({
    email: google.email,
    name: google.name,
    providerUserId: google.providerUserId,
    language,
    avatarId,
  });
}
