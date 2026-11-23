import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  closeRoom,
  createRoom,
  getRoom,
  joinRoom,
  setGuestReady,
  setStake,
  setupRoom,
  findOpenRoomForUser,
  serializeRoom,
} from '../services/coopMissionRoomService.js';
import {
  abandonCoopRun,
  applyCoopCombatAction,
  enterCoopNode,
  getActiveCoopRun,
  getCoopRun,
  inventoryDiscard,
  inventoryUse,
  resolveCoopEvent,
  setNodeReady,
  shopBuy,
  startCoopMissionFromRoom,
} from '../services/coopMissionRunService.js';

const router = Router();
const joinSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[0-9A-F]{10}$/) });
const setupSchema = z.object({
  missionId: z.coerce.number().int().positive(),
  hardMode: z.boolean().optional(),
});
const stakeSchema = z.object({ stake: z.coerce.number().int().nonnegative() });
const readySchema = z.object({ ready: z.boolean().optional() });
const buySchema = z.object({
  itemId: z.string().min(1).max(80),
  replaceSlot: z.number().int().min(0).max(3).nullable().optional(),
});
const slotSchema = z.object({ slotIndex: z.coerce.number().int().min(0).max(3) });
const resolveSchema = z.object({ choiceId: z.string().min(1).max(80) });
const card = z.string().min(1).max(140);
const revision = z.number().int().nonnegative().optional();
const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('play'),
    instanceId: card,
    target: z.enum(['enemy', 'ally']).optional(),
    confirmedFriendlyFire: z.boolean().optional(),
    revision,
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

/** Lobby + run actif (reprise). */
router.get(
  '/me',
  authenticated(async (_req, res, userId) => {
    res.set('Cache-Control', 'no-store');
    const [run, openRoom] = await Promise.all([
      getActiveCoopRun(userId),
      findOpenRoomForUser(userId),
    ]);
    res.json({
      run,
      room: openRoom ? serializeRoom(openRoom, userId, { runId: run?.id || null }) : null,
    });
  }),
);

router.post(
  '/',
  authenticated(async (_req, res, userId) => {
    res.status(201).json({ room: await createRoom(userId) });
  }),
);

router.post(
  '/join',
  authenticated(async (req, res, userId) => {
    const { code } = joinSchema.parse(req.body);
    res.json({ room: await joinRoom(userId, code) });
  }),
);

router.get(
  '/rooms/:id',
  authenticated(async (req, res, userId) => {
    res.set('Cache-Control', 'no-store');
    const room = await getRoom(userId, req.params.id);
    if (room.runId) {
      const run = await getCoopRun(userId, room.runId);
      return res.json({ room, run });
    }
    res.json({ room });
  }),
);

router.patch(
  '/rooms/:id/setup',
  authenticated(async (req, res, userId) => {
    const body = setupSchema.parse(req.body);
    res.json({ room: await setupRoom(userId, req.params.id, body) });
  }),
);

router.patch(
  '/rooms/:id/stake',
  authenticated(async (req, res, userId) => {
    const { stake } = stakeSchema.parse(req.body);
    res.json({ room: await setStake(userId, req.params.id, stake) });
  }),
);

router.post(
  '/rooms/:id/ready',
  authenticated(async (req, res, userId) => {
    const { ready = true } = readySchema.parse(req.body || {});
    res.json({ room: await setGuestReady(userId, req.params.id, ready) });
  }),
);

router.post(
  '/rooms/:id/start',
  authenticated(async (req, res, userId) => {
    const run = await startCoopMissionFromRoom(userId, req.params.id);
    res.status(201).json({ run, room: await getRoom(userId, req.params.id) });
  }),
);

router.post(
  '/rooms/:id/close',
  authenticated(async (req, res, userId) => {
    res.json({ room: await closeRoom(userId, req.params.id) });
  }),
);

router.get(
  '/runs/active',
  authenticated(async (_req, res, userId) => {
    res.set('Cache-Control', 'no-store');
    res.json({ run: await getActiveCoopRun(userId) });
  }),
);

router.get(
  '/runs/:id',
  authenticated(async (req, res, userId) => {
    res.set('Cache-Control', 'no-store');
    res.json({ run: await getCoopRun(userId, req.params.id) });
  }),
);

/** Compat : GET /:id → room (ou run lié). */
router.get(
  '/:id',
  authenticated(async (req, res, userId) => {
    res.set('Cache-Control', 'no-store');
    const room = await getRoom(userId, req.params.id);
    if (room.runId) {
      const run = await getCoopRun(userId, room.runId);
      return res.json({ room, run });
    }
    return res.json({ room });
  }),
);

router.post(
  '/runs/:id/enter',
  authenticated(async (req, res, userId) => {
    res.json(await enterCoopNode(userId, req.params.id));
  }),
);

router.post(
  '/runs/:id/node-ready',
  authenticated(async (req, res, userId) => {
    const { ready = true } = readySchema.parse(req.body || {});
    res.json({ run: await setNodeReady(userId, req.params.id, ready) });
  }),
);

router.post(
  '/runs/:id/shop/buy',
  authenticated(async (req, res, userId) => {
    const body = buySchema.parse(req.body);
    res.json({
      run: await shopBuy(userId, req.params.id, body.itemId, {
        replaceSlot: body.replaceSlot,
      }),
    });
  }),
);

router.post(
  '/runs/:id/inventory/use',
  authenticated(async (req, res, userId) => {
    const { slotIndex } = slotSchema.parse(req.body);
    res.json({ run: await inventoryUse(userId, req.params.id, slotIndex) });
  }),
);

router.post(
  '/runs/:id/inventory/discard',
  authenticated(async (req, res, userId) => {
    const { slotIndex } = slotSchema.parse(req.body);
    res.json({ run: await inventoryDiscard(userId, req.params.id, slotIndex) });
  }),
);

router.post(
  '/runs/:id/resolve-event',
  authenticated(async (req, res, userId) => {
    const { choiceId } = resolveSchema.parse(req.body);
    res.json({ run: await resolveCoopEvent(userId, req.params.id, choiceId) });
  }),
);

router.post(
  '/runs/:id/choose-branch',
  authenticated(async (req, res, userId) => {
    const { choiceId } = resolveSchema.parse(req.body);
    res.json({ run: await resolveCoopEvent(userId, req.params.id, choiceId) });
  }),
);

router.post(
  '/runs/:id/action',
  authenticated(async (req, res, userId) => {
    const action = actionSchema.parse(req.body);
    res.json(await applyCoopCombatAction(userId, req.params.id, action));
  }),
);

router.post(
  '/runs/:id/abandon',
  authenticated(async (req, res, userId) => {
    res.json({ run: await abandonCoopRun(userId, req.params.id) });
  }),
);

export default router;
