import { findDemoUser } from '../models/sensei.js';
import { getUserBySessionToken } from '../services/authService.js';

const SESSION_COOKIE = 'kage_session';

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    })
  );
}

export function getSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

export async function attachUser(req, _res, next) {
  try {
    const token = getSessionToken(req);
    req.user = token ? await getUserBySessionToken(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}

/** Résout le joueur courant : session, puis repli démo si activé. */
export async function requireUser(req, res) {
  if (req.user) return req.user;

  if (process.env.AUTH_DEMO_FALLBACK !== 'false') {
    const demo = await findDemoUser();
    if (demo) return demo;
  }

  res.status(401).json({ error: 'Non authentifié.' });
  return null;
}
