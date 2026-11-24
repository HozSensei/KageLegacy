import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  deleteUserNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from '../services/userNotificationService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const notifications = await listUserNotifications(user.id);
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
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

router.post('/:id/unread', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await markNotificationUnread(user.id, id));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await deleteUserNotification(user.id, id));
  } catch (error) {
    next(error);
  }
});

export default router;
