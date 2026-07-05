import { Router } from 'express';
import { findDemoUser } from '../models/sensei.js';
import { getOperationLivePayload } from '../services/operationService.js';

const router = Router();

router.get('/live', async (_req, res, next) => {
  try {
    const user = await findDemoUser();
    if (!user) {
      res.status(404).json({ error: 'Aucun joueur de démonstration. Exécutez npm run db:seed.' });
      return;
    }

    const payload = await getOperationLivePayload(user.id);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
