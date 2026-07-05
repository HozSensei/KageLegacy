import { Router } from 'express';
import { findDemoUser, getGameClock } from '../models/sensei.js';
import {
  getRecruitmentPayload,
  purchaseRecruitmentOffer,
} from '../services/recruitmentService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      return res.status(404).json({ error: 'Aucun joueur de démonstration.' });
    }

    const recruitment = await getRecruitmentPayload(user.id);
    const clock = await getGameClock();
    res.json({ recruitment, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

router.post('/purchase', async (req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) return res.status(404).json({ error: 'Joueur introuvable.' });

    const offerId = Number(req.body?.offerId);
    if (!offerId) return res.status(400).json({ error: 'offerId requis.' });

    const result = await purchaseRecruitmentOffer(user.id, offerId);
    const recruitment = await getRecruitmentPayload(user.id);
    const clock = await getGameClock();
    res.json({ result, recruitment, gameClock: clock });
  } catch (error) {
    next(error);
  }
});

export default router;
