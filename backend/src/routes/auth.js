import { Router } from 'express';
import {
  authenticateUser,
  buildSessionCookie,
  clearSessionCookie,
  createSession,
  findUserById,
  getUserBySessionToken,
  registerUser,
  revokeSession,
} from '../services/authService.js';
import { findSenseiByUserId } from '../models/sensei.js';
import { getSessionToken } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await registerUser(parsed);
    const { token, expiresAt } = await createSession(user.id);

    res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt));
    const sensei = await findSenseiByUserId(user.id);
    res.status(201).json({
      user: { id: user.id, username: user.username },
      sensei: sensei ? { name: sensei.name, language: sensei.language } : null,
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
      user: { id: user.id, username: user.username },
      sensei: sensei ? { name: sensei.name, language: sensei.language } : null,
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
      user: { id: user.id, username: user.username },
      sensei: sensei ? { name: sensei.name, language: sensei.language } : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
