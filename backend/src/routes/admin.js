import { Router } from 'express';
import {
  advanceHourDev,
  getClockRow,
  getGameClock,
  setCycleStartAt,
  setHourDev,
} from '../services/gameClock.js';
import { processCycleTick, resetCycleJobsFromHour } from '../services/cycleJobs.js';
import { setHourSchema } from '../validators/squadTactics.js';
import {
  hardResetSchema,
  repairPoolsSchema,
  setCycleStartSchema,
} from '../validators/admin.js';
import { hardSeasonReset } from '../services/seasonResetService.js';
import { purgeExpiredGuestAccounts } from '../services/guestCleanupService.js';
import {
  assignMissingHumanPools,
  repairAllActivePoolSchedules,
  repairPoolSchedule,
} from '../services/poolService.js';
import { retuneBotSenseiIdentities } from '../services/botFactory.js';
import { isAdminUser, requireAdmin } from '../middleware/admin.js';
import { ensureStarterSquad } from '../services/starterSquadService.js';
import { ensureStarterTacticCards } from '../services/tacticCards/tacticCardService.js';
import { query } from '../config/database.js';

const router = Router();

router.get('/status', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié.', isAdmin: false });
  }

  res.json({
    isAdmin: isAdminUser(req.user),
    username: req.user.username,
  });
});

router.use(requireAdmin);

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
    const row = await getClockRow();
    if (row?.cycle_start_at) {
      await resetCycleJobsFromHour(row.cycle_start_at, hour);
    }
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

/** Réassigne une ligue à tous les humains orphelins (rétroactif). */
router.post('/pools/assign-missing', async (req, res, next) => {
  try {
    const seasonNumber = Number(req.body?.seasonNumber) || 1;
    const withStarter = req.body?.withStarter !== false;
    const assignment = await assignMissingHumanPools({ seasonNumber });

    const starters = [];
    if (withStarter) {
      for (const row of assignment.results) {
        if (!row.ok) continue;
        try {
          const languageRows = await query(
            'SELECT language FROM sensei WHERE user_id = ? LIMIT 1',
            [row.userId]
          );
          const language = languageRows[0]?.language || 'fr';
          const squadCreated = await ensureStarterSquad(row.userId, language);
          await ensureStarterTacticCards(row.userId);
          starters.push({ userId: row.userId, squadCreated, ok: true });
        } catch (error) {
          starters.push({ userId: row.userId, ok: false, error: error.message });
        }
      }
    }

    res.json({
      assignment,
      starters,
      clock: await getGameClock(),
    });
  } catch (error) {
    next(error);
  }
});

/** Répartit villages + noms « Xxx no Kuni » sur les bots existants. */
router.post('/bots/retune-identities', async (req, res, next) => {
  try {
    const force = Boolean(req.body?.force);
    const poolId = req.body?.poolId != null ? Number(req.body.poolId) : null;
    const result = await retuneBotSenseiIdentities({
      poolId: Number.isFinite(poolId) ? poolId : null,
      force,
    });
    res.json({ ...result, clock: await getGameClock() });
  } catch (error) {
    next(error);
  }
});

export default router;
