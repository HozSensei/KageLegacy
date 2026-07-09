import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { getUserLanguage } from '../services/narrative/viewerLocale.js';
import { getEliteMePayload } from '../services/eliteSubscriptionService.js';
import { getSeasonPassPayload } from '../services/eliteSeasonPassService.js';
import {
  buildSenseiIdentity,
  getCosmeticsCatalog,
  updateEquippedCosmetics,
} from '../services/senseiIdentityService.js';
import { findUserPool } from '../services/poolService.js';

const router = Router();

router.get('/me', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const locale = await getUserLanguage(user.id);
    const elite = await getEliteMePayload(user.id, locale);
    const seasonPass = await getSeasonPassPayload(user.id, locale);
    const catalog = await getCosmeticsCatalog(user.id, locale);
    const pool = await findUserPool(user.id);
    const identity = await buildSenseiIdentity(user.id, locale, pool);

    res.json({ ...elite, seasonPass, catalog, identity });
  } catch (error) {
    next(error);
  }
});

router.get('/season-pass', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const locale = await getUserLanguage(user.id);
    const seasonPass = await getSeasonPassPayload(user.id, locale);
    res.json(seasonPass);
  } catch (error) {
    next(error);
  }
});

router.patch('/cosmetics', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { titleSlug, bannerSlug, nameColor } = req.body ?? {};
    const equipped = await updateEquippedCosmetics(user.id, {
      titleSlug,
      bannerSlug,
      nameColor,
    });
    const locale = await getUserLanguage(user.id);
    const pool = await findUserPool(user.id);
    const identity = await buildSenseiIdentity(user.id, locale, pool);

    res.json({ equipped, identity });
  } catch (error) {
    next(error);
  }
});

export default router;
