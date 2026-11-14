import { z } from 'zod';

export const claimRewardSchema = z.object({
  track: z.enum(['free', 'premium']).default('free'),
});

export const addXpSchema = z.object({
  amount: z.coerce.number().int().positive('amount doit être un entier positif.'),
  source: z.string().trim().max(80).optional(),
});

export const unlockPremiumSchema = z.object({
  method: z.enum(['stub', 'kage_coins']).default('stub'),
});

export const buyLevelsSchema = z.object({
  count: z.coerce.number().int().min(1).max(20),
});

export const progressQuestSchema = z.object({
  questKey: z.string().trim().min(1).max(100),
  value: z.coerce.number().int().positive().default(1),
});
