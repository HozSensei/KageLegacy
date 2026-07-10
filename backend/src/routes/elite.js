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
import { createEliteCheckoutSession, confirmEliteCheckoutSession } from '../services/eliteStripeService.js';
import {
  getEliteToolsPayloadForUser,
  simulateEliteMatchup,
} from '../services/eliteToolsService.js';

const router = Router();

router.get('/me', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const locale = await getUserLanguage(user.id);
    const elite = await getEliteMePayload(user.id, locale);
    const pool = await findUserPool(user.id);
    const identity = await buildSenseiIdentity(user.id, locale, pool);

    if (!elite.subscription.isActive) {
      return res.json({
        ...elite,
        seasonPass: { active: false, quests: [], summary: { completed: 0, total: 0 } },
        catalog: null,
        identity,
      });
    }

    const seasonPass = await getSeasonPassPayload(user.id, locale);
    const catalog = await getCosmeticsCatalog(user.id, locale);

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

router.post('/checkout', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const session = await createEliteCheckoutSession(user.id);
    res.json(session);
  } catch (error) {
    next(error);
  }
});

router.get('/checkout/confirm', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const sessionId = req.query.session_id;
    const result = await confirmEliteCheckoutSession(user.id, sessionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/tools', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const tools = await getEliteToolsPayloadForUser(user.id);
    res.json(tools);
  } catch (error) {
    next(error);
  }
});

router.post('/tools/matchup', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const locale = await getUserLanguage(user.id);
    const { opponentComposition, runs } = req.body ?? {};
    const result = await simulateEliteMatchup(user.id, { opponentComposition, runs, locale });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
