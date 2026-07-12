import { z } from 'zod';

export const setCycleStartSchema = z.object({
  at: z.string().min(1, 'Date ISO requise.'),
});

export const hardResetSchema = z.object({
  seasonNumber: z.number().int().min(1).default(1),
  cycleStartAt: z.string().nullable().optional(),
  dryRun: z.boolean().default(true),
  confirm: z.boolean().default(false),
});

export const repairPoolsSchema = z.object({
  all: z.boolean().default(false),
  poolId: z.number().int().positive().nullable().optional(),
  includePlayed: z.boolean().default(false),
});
