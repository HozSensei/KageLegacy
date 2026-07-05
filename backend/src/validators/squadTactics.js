import { z } from 'zod';

export const STRATEGY_VALUES = ['Normal', 'Tank', 'Protect', 'Offensive'];

export const FOCUS_VALUES = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence'];

export const updateStrategiesSchema = z.object({
  strategies: z
    .array(
      z.object({
        ninjaId: z.number().int().positive(),
        strategy: z.enum(STRATEGY_VALUES),
      })
    )
    .min(1)
    .max(3),
});

export const updateTrainingFocusSchema = z.object({
  trainingFocus: z.enum(FOCUS_VALUES),
});

export const setHourSchema = z.object({
  hour: z.number().int().min(0).max(72),
});

export const requestChuninExamSchema = z.object({
  ninjaId: z.number().int().positive(),
});
