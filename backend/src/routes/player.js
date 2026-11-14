import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { findAllClanTraits } from '../models/clanTrait.js';
import {
  addXP,
  chooseSpecialization,
  createCharacter,
  getCharacter,
  getComputedStats,
  levelUp,
} from '../services/playerCharacterService.js';
import {
  addXpSchema,
  createCharacterSchema,
  specializationSchema,
} from '../validators/player.js';

const router = Router();

/** GET /api/player — personnage + stats calculées */
router.get('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const character = await getCharacter(user.id);
    if (!character) {
      return res.status(404).json({ error: 'Aucun personnage. Créez-en un via /api/player/create.' });
    }
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

/** GET /api/player/stats — stats calculées (talents + cartes) */
router.get('/stats', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const character = await getCharacter(user.id);
    if (!character) {
      return res.status(404).json({ error: 'Aucun personnage.' });
    }

    const stats = await getComputedStats(user.id);
    res.json({ stats, level: character.level, rank: character.rank });
  } catch (error) {
    next(error);
  }
});

/** GET /api/player/clans — clans disponibles à la création */
router.get('/clans', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const clans = await findAllClanTraits();
    res.json({
      clans: clans.map((c) => ({
        id: c.id,
        name: c.name,
        isNoble: Boolean(c.is_noble),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** POST /api/player/create — onboarding */
router.post('/create', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createCharacterSchema.parse(req.body);
    const character = await createCharacter(user.id, {
      name: parsed.name,
      clanTraitId: parsed.clanTraitId ?? null,
      elementAffinity: parsed.elementAffinity,
      avatarUrl: parsed.avatarUrl || null,
    });
    res.status(201).json({ character });
  } catch (error) {
    next(error);
  }
});

/** POST /api/player/xp — gain d'XP (level-up auto → +1 talent point / niveau) */
router.post('/xp', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = addXpSchema.parse(req.body);
    const result = await addXP(user.id, parsed.amount);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /api/player/level-up — consomme l'XP pour +1 niveau / +1 talent point */
router.post('/level-up', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const result = await levelUp(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** PUT /api/player/specialization — choix (niveau 10+) */
router.put('/specialization', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = specializationSchema.parse(req.body);
    const character = await chooseSpecialization(user.id, parsed.specialization);
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

export default router;
