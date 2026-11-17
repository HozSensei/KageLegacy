import { z } from 'zod';

export const claimRewardSchema = z.object({
  track: z.enum(['free', 'premium']).default('free'),
});

export const unlockPremiumSchema = z.object({
  method: z.enum(['stub', 'kage_coins', 'stripe']).default('stub'),
});

export const buyLevelsSchema = z.object({
  count: z.coerce.number().int().min(1).max(20),
});
