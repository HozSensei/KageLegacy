import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { coopRooms } from '../services/coopRoomService.js';

const router = Router();
const joinSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[0-9A-F]{10}$/) });
const card = z.string().min(1).max(140);
const revision = z.number().int().nonnegative().optional();
const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('play'), instanceId: card, target: z.enum(['enemy', 'ally']).optional(),
    confirmedFriendlyFire: z.boolean().optional(), revision,
  }),
  z.object({ type: z.literal('discard_chakra'), instanceId: card, revision }),
  z.object({ type: z.literal('discard_draw'), instanceId: card, revision }),
  z.object({ type: z.literal('end_turn'), revision }),
  z.object({ type: z.literal('forfeit'), revision }),
]);

function authenticated(handler) {
  return async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (user) await handler(req, res, user.id);
    } catch (error) {
      if (error.code === 'FRIENDLY_FIRE_CONFIRMATION') {
        return res.status(error.statusCode || 400).json({ error: error.message, code: error.code });
      }
      next(error);
    }
  };
}

router.post('/', authenticated(async (_req, res, userId) => {
  res.status(201).json({ room: await coopRooms.create(userId) });
}));
router.post('/join', authenticated(async (req, res, userId) => {
  const { code } = joinSchema.parse(req.body);
  res.json({ room: await coopRooms.join(userId, code) });
}));
router.get('/:id', authenticated((req, res, userId) => {
  res.set('Cache-Control', 'no-store');
  res.json({ room: coopRooms.get(req.params.id, userId) });
}));
router.post('/:id/action', authenticated((req, res, userId) => {
  res.json({ room: coopRooms.action(req.params.id, userId, actionSchema.parse(req.body)) });
}));

export default router;
