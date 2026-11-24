import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/userNotificationService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const notifications = await listUserNotifications(user.id);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await markAllNotificationsRead(user.id));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await markNotificationRead(user.id, id));
  } catch (error) {
    next(error);
  }
});

export default router;
