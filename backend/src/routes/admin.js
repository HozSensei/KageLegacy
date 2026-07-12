import { Router } from 'express';
import {
  advanceHourDev,
  getGameClock,
  setCycleStartAt,
  setHourDev,
} from '../services/gameClock.js';
import { processCycleTick } from '../services/cycleJobs.js';
import { setHourSchema } from '../validators/squadTactics.js';
import {
  hardResetSchema,
  repairPoolsSchema,
  setCycleStartSchema,
} from '../validators/admin.js';
import { hardSeasonReset } from '../services/seasonResetService.js';
import { purgeExpiredGuestAccounts } from '../services/guestCleanupService.js';
import { repairAllActivePoolSchedules, repairPoolSchedule } from '../services/poolService.js';
import { isAdminPanelEnabled, requireAdminSecret } from '../middleware/admin.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    enabled: isAdminPanelEnabled(),
    secretConfigured: Boolean(process.env.ADMIN_SECRET),
  });
});

router.use(requireAdminSecret);

router.get('/clock', async (_req, res, next) => {
  try {
    const clock = await getGameClock();
    res.json({ clock });
  } catch (error) {
    next(error);
  }
});

router.post('/clock/advance-hour', async (_req, res, next) => {
  try {
    const clock = await advanceHourDev();
    const tick = await processCycleTick();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

router.post('/clock/set-hour', async (req, res, next) => {
  try {
    const { hour } = setHourSchema.parse(req.body);
    const clock = await setHourDev(hour);
    const tick = await processCycleTick();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

router.post('/clock/set-start', async (req, res, next) => {
  try {
    const { at } = setCycleStartSchema.parse(req.body);
    const clock = await setCycleStartAt(at);
    res.json({ clock });
  } catch (error) {
    next(error);
  }
});

router.post('/clock/tick', async (_req, res, next) => {
  try {
    const tick = await processCycleTick();
    const clock = await getGameClock();
    res.json({ clock, tick });
  } catch (error) {
    next(error);
  }
});

router.post('/season/hard-reset', async (req, res, next) => {
  try {
    const { seasonNumber, cycleStartAt, dryRun, confirm } = hardResetSchema.parse(req.body);

    if (!dryRun && !confirm) {
      return res.status(400).json({
        error: 'Opération destructive : envoyez dryRun=true pour prévisualiser ou confirm=true pour exécuter.',
      });
    }

    const result = await hardSeasonReset({
      seasonNumber,
      cycleStartAt: cycleStartAt || null,
      dryRun: dryRun || !confirm,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/guest/purge', async (_req, res, next) => {
  try {
    const result = await purgeExpiredGuestAccounts();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/pools/repair-schedules', async (req, res, next) => {
  try {
    const { all, poolId, includePlayed } = repairPoolsSchema.parse(req.body);
    const options = { onlyScheduled: !includePlayed };

    if (poolId) {
      const result = await repairPoolSchedule(poolId, options);
      return res.json({ results: [result] });
    }

    if (all) {
      const results = await repairAllActivePoolSchedules(options);
      return res.json({ results });
    }

    const clock = await getGameClock();
    res.json({
      results: [],
      message: 'Spécifiez all=true ou poolId pour lancer une réparation.',
      clock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
