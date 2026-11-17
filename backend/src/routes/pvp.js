import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  enqueue,
  leaveQueue,
  getQueueStatus,
  getMatch,
  createInvitation,
  acceptInvitation,
} from '../services/pvp/matchmakingService.js';
import { checkPvpRateLimit } from '../services/pvp/pvpRateLimit.js';
import { markReady, reportMatchResult, cancelMatch } from '../services/pvp/pvpMatchService.js';
import {
  ALLOWED_LEVEL_WINDOWS,
  ANTI_CHEAT_MODE,
  DEFAULT_LEVEL_WINDOW,
  RESULT_CONFIRMATION_TIMEOUT_MS,
  PVP_WS_PATH,
} from '../services/pvp/config.js';

const router = Router();

const enqueueSchema = z.object({
  deckId: z.number().int().positive().optional().nullable(),
  levelWindow: z.number().int().min(0).max(20).optional(),
});

const invitationSchema = z.object({
  deckId: z.number().int().positive().optional().nullable(),
  levelWindow: z.number().int().min(0).max(20).optional(),
});

const inviteCodeSchema = z.string().trim().min(1).max(16);

const reportSchema = z.object({
  winnerSeat: z.enum(['host', 'guest']).optional(),
  checksum: z.string().min(1).max(32).optional(),
  summary: z.record(z.any()).optional(),
  resultSummary: z.record(z.any()).optional(),
  endReason: z.string().max(40).optional(),
  forfeit: z.boolean().optional(),
  confirmOnly: z.boolean().optional(),
});

/** GET /api/pvp/config */
router.get('/config', async (_req, res) => {
  res.json({
    levelWindowDefault: DEFAULT_LEVEL_WINDOW,
    levelWindows: ALLOWED_LEVEL_WINDOWS,
    antiCheatMode: ANTI_CHEAT_MODE,
    resultConfirmationTimeoutMs: RESULT_CONFIRMATION_TIMEOUT_MS,
    wsPath: PVP_WS_PATH,
    architecture: 'host',
    serverRole: [
      'matchmaking',
      'match_create',
      'host_guest_designate',
      'bootstrap_validation',
      'signaling_relay',
      'end_match_checksum',
      'result_sanity_checks',
      'guest_checksum_challenge',
      'two_party_result_confirmation',
      'rate_limit_queue_report',
    ],
    serverDoesNot: ['authoritative_card_resolution', 'continuous_pve_engine_truth'],
    guestChallenge: true,
  });
});

/** POST /api/pvp/queue — rejoindre la file */
router.post('/queue', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = enqueueSchema.parse(req.body || {});
    const result = await enqueue(user.id, body);
    res.status(result.status === 'matched' ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/pvp/invites — créer une invitation privée */
router.post('/invites', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const rate = checkPvpRateLimit('invite', user.id);
    if (!rate.allowed) {
      const error = new Error('Trop d’invitations PvP — réessayez plus tard.');
      error.statusCode = 429;
      error.retryAfterMs = rate.retryAfterMs;
      throw error;
    }
    const body = invitationSchema.parse(req.body || {});
    const result = await createInvitation(user.id, body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/pvp/invites/:code/accept — accepter une invitation */
router.post('/invites/:code/accept', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const rate = checkPvpRateLimit('inviteAccept', user.id);
    if (!rate.allowed) {
      const error = new Error('Trop de tentatives d’invitation PvP — réessayez plus tard.');
      error.statusCode = 429;
      error.retryAfterMs = rate.retryAfterMs;
      throw error;
    }
    const code = inviteCodeSchema.parse(req.params.code);
    const result = await acceptInvitation(user.id, code);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/pvp/queue — statut file / match */
router.get('/queue', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await getQueueStatus(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/pvp/queue — quitter la file */
router.delete('/queue', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await leaveQueue(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** GET /api/pvp/matches/:id */
router.get('/matches/:id', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await getMatch(req.params.id, user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/pvp/matches/:id/ready */
router.post('/matches/:id/ready', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await markReady(req.params.id, user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/pvp/matches/:id/report — résultat Host puis confirmation checksum Guest */
router.post('/matches/:id/report', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = reportSchema.parse(req.body || {});
    const result = await reportMatchResult(req.params.id, user.id, body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/pvp/matches/:id/cancel */
router.post('/matches/:id/cancel', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await cancelMatch(req.params.id, user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
