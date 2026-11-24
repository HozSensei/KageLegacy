import { Router } from 'express';
import { z } from 'zod';
import { requireUser } from '../middleware/auth.js';
import {
  BUG_REPORT_LOCATIONS,
  createBugReport,
} from '../services/bugReportService.js';

const router = Router();

const createSchema = z
  .object({
    location: z.enum(BUG_REPORT_LOCATIONS),
    locationOther: z.string().trim().max(120).optional().nullable(),
    description: z.string().trim().min(10).max(4000),
  })
  .strict();

router.post('/', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const parsed = createSchema.parse(req.body || {});
    const report = await createBugReport(user.id, {
      location: parsed.location,
      locationOther: parsed.locationOther,
      description: parsed.description,
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

export default router;
