import { Router } from 'express';
import {
  authenticateUser,
  buildSessionCookie,
  clearSessionCookie,
  convertGuestToAccount,
  createSession,
  findUserById,
  getUserBySessionToken,
  registerGuestUser,
  registerUser,
  revokeSession,
} from '../services/authService.js';
import { findSenseiByUserId } from '../models/sensei.js';
import { getSessionToken } from '../middleware/auth.js';
import {
  convertGuestSchema,
  guestRegisterSchema,
  loginSchema,
  registerSchema,
} from '../validators/auth.js';

const router = Router();

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    isGuest: Boolean(user.is_guest),
    guestExpiresAt: user.guest_expires_at || null,
    email: user.email || null,
  };
}

function serializeSensei(sensei) {
  return sensei ? { name: sensei.name, language: sensei.language } : null;
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const { user, poolJoin } = await registerUser(parsed);
    const { token, expiresAt } = await createSession(user.id);

    res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
    const sensei = await findSenseiByUserId(user.id);
    res.status(201).json({
      user: serializeUser(user),
      sensei: serializeSensei(sensei),
      pool: poolJoin.pool
        ? {
            id: poolJoin.pool.id,
            inviteFallback: poolJoin.fallback,
            inviteReason: poolJoin.reason,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/guest', async (req, res, next) => {
  try {
    const parsed = guestRegisterSchema.parse(req.body);
    const { user, poolJoin, guestExpiresAt } = await registerGuestUser(parsed);
    const { token, expiresAt } = await createSession(user.id);

    res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
    const sensei = await findSenseiByUserId(user.id);
    res.status(201).json({
      user: serializeUser(user),
      sensei: serializeSensei(sensei),
      guestExpiresAt,
      pool: poolJoin.pool ? { id: poolJoin.pool.id } : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/convert', async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    const current = token ? await getUserBySessionToken(token) : null;
    if (!current?.is_guest) {
      return res.status(400).json({ error: 'Compte invité requis pour la conversion.' });
    }

    const parsed = convertGuestSchema.parse(req.body);
    const email = parsed.email?.trim() || null;
    const user = await convertGuestToAccount(current.id, { ...parsed, email });
    const sensei = await findSenseiByUserId(user.id);

    res.json({
      user: serializeUser(user),
      sensei: serializeSensei(sensei),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const user = await authenticateUser(parsed.username, parsed.password);
    const { token, expiresAt } = await createSession(user.id);

    res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
    const sensei = await findSenseiByUserId(user.id);
    res.json({
      user: serializeUser(user),
      sensei: serializeSensei(sensei),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    await revokeSession(token);
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    const user = token ? await getUserBySessionToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    const sensei = await findSenseiByUserId(user.id);
    res.json({
      user: serializeUser(user),
      sensei: serializeSensei(sensei),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
