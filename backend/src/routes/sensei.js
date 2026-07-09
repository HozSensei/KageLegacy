import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getSenseiPublicProfile } from '../services/senseiProfileService.js';

const router = Router();

router.get('/:userId/profile', async (req, res, next) => {
  try {
    const viewer = await requireUser(req, res);
    if (!viewer) return;

    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'userId invalide.' });
    }

    const profile = await getSenseiPublicProfile(userId, viewer.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;
