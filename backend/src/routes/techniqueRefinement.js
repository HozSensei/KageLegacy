import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  getTechniqueRefinementPayload,
  refineTechniqueCard,
} from '../services/tacticCards/techniqueRefinementService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const payload = await getTechniqueRefinementPayload(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/refine', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const userTacticCardId = Number(req.body?.userTacticCardId);
    if (!userTacticCardId) {
      res.status(400).json({ error: 'userTacticCardId requis.' });
      return;
    }

    const refinement = await refineTechniqueCard(user.id, userTacticCardId);
    const payload = await getTechniqueRefinementPayload(user.id);
    res.json({ ...payload, refinement });
  } catch (error) {
    next(error);
  }
});

export default router;
