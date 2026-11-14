import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock, getSquadPayload } from '../models/sensei.js';
import {
  createPlayerClan,
  getClanPayload,
  joinPlayerClan,
  leavePlayerClan,
} from '../services/playerClanService.js';
import {
  listClanAcademyBoard,
  recommendAspirantToClan,
  recruitFromClanBoard,
} from '../services/clanAcademyBoardService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const clan = await getClanPayload(user.id);
    const board = await listClanAcademyBoard(user.id);
    const clock = await getGameClock();
    res.json({ clan, board, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/create', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const clan = await createPlayerClan(user.id, req.body?.name);
    const board = await listClanAcademyBoard(user.id);
    const clock = await getGameClock();
    res.json({ clan, board, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const clan = await joinPlayerClan(user.id, req.body?.inviteCode);
    const board = await listClanAcademyBoard(user.id);
    const clock = await getGameClock();
    res.json({ clan, board, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/leave', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    await leavePlayerClan(user.id);
    const clan = await getClanPayload(user.id);
    const board = await listClanAcademyBoard(user.id);
    const clock = await getGameClock();
    res.json({ clan, board, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/board/recommend', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const drawId = Number(req.body?.drawId);
    if (!drawId) {
      const error = new Error('drawId requis.');
      error.statusCode = 400;
      throw error;
    }

    const board = await recommendAspirantToClan(user.id, drawId);
    const clan = await getClanPayload(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ board, clan, ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/board/recruit', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const postId = Number(req.body?.postId);
    if (!postId) {
      const error = new Error('postId requis.');
      error.statusCode = 400;
      throw error;
    }

    const result = await recruitFromClanBoard(user.id, postId);
    const board = await listClanAcademyBoard(user.id);
    const clan = await getClanPayload(user.id);
    const squad = await getSquadPayload(user.id);
    const clock = await getGameClock();
    res.json({ result, board, clan, ...squad, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;
