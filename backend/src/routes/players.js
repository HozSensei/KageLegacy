import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { getPublicPlayer } from '../services/publicPlayerService.js';

const router = Router();

const userIdParam = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .transform(Number)
  .pipe(z.number().int().positive());

/** GET /api/players/:userId/public — fiche ninja visible par les autres joueurs */
router.get('/:userId/public', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const userId = userIdParam.parse(req.params.userId);
    const player = await getPublicPlayer(userId);
    res.json({ player });
  } catch (error) {
    next(error);
  }
});

export default router;
