import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getGameClock } from '../models/sensei.js';
import { getOperationLivePayload } from '../services/operationService.js';
import {
  getOperationDossierForUser,
  setOperationPosture,
} from '../services/operationDossierService.js';

const router = Router();

router.get('/live', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const payload = await getOperationLivePayload(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/dossier', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const dossier = await getOperationDossierForUser(user.id);
    const clock = await getGameClock();
    res.json({ dossier, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.patch('/dossier', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const operationPosture = req.body?.operationPosture;
    await setOperationPosture(user.id, operationPosture);
    const dossier = await getOperationDossierForUser(user.id);
    const clock = await getGameClock();
    res.json({ dossier, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;
