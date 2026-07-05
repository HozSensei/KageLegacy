import { z } from 'zod';

export const updateCompositionSchema = z.object({
  slots: z
    .array(
      z.object({
        position: z.number().int().min(1).max(3),
        ninjaId: z.number().int().positive(),
      })
    )
    .length(3)
    .refine(
      (slots) => new Set(slots.map((s) => s.position)).size === 3,
      'Les positions 1, 2 et 3 doivent être uniques.'
    )
    .refine(
      (slots) => new Set(slots.map((s) => s.ninjaId)).size === 3,
      'Les trois ninjas actifs doivent être distincts.'
    ),
});
