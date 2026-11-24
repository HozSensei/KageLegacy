import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import { PURSE_STAKES } from '../config/missionRunEconomy.js';
import { getItem } from '../config/itemCatalog.js';
import {
  getInventory,
  moveItem,
  setPouchRyos,
  revealSealedFromChest,
  openBoosterFromChest,
} from '../services/playerInventoryService.js';

const router = Router();

const moveSchema = z.object({
  itemKey: z.string().min(1).max(64),
  from: z.enum(['chest', 'pouch']),
  to: z.enum(['chest', 'pouch']),
  quantity: z.number().int().min(1).max(99).optional().default(1),
});

const pouchRyosSchema = z.object({
  amount: z.number().int().refine(v => PURSE_STAKES.includes(v), {
    message: 'Montant invalide (0/100/200/300).',
  }),
});

const revealSchema = z.object({
  itemKey: z.string().min(1).max(64),
});

/** GET /api/inventory */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const inventory = await getInventory(user.id);
    res.json({ ...inventory, stakes: PURSE_STAKES });
  } catch (error) {
    next(error);
  }
});

/** POST /api/inventory/move — coffre ↔ poche */
router.post('/move', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = moveSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }
    if (!getItem(parsed.data.itemKey)) {
      return res.status(404).json({ error: 'Objet inconnu.' });
    }
    const inventory = await moveItem(user.id, parsed.data.itemKey, parsed.data);
    res.json({ ...inventory, stakes: PURSE_STAKES });
  } catch (error) {
    next(error);
  }
});

/** POST /api/inventory/pouch-ryos — préparer la bourse de poche */
router.post('/pouch-ryos', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = pouchRyosSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }
    const result = await setPouchRyos(user.id, parsed.data.amount);
    const inventory = await getInventory(user.id);
    res.json({ ...inventory, ...result, stakes: PURSE_STAKES });
  } catch (error) {
    next(error);
  }
});

/** POST /api/inventory/reveal — ouvrir un scellé depuis le coffre */
router.post('/reveal', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = revealSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }
    const result = await revealSealedFromChest(user.id, parsed.data.itemKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/inventory/open — ouvrir un booster depuis le coffre */
router.post('/open', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = revealSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Requête invalide.', details: parsed.error.flatten() });
    }
    const result = await openBoosterFromChest(user.id, parsed.data.itemKey);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
