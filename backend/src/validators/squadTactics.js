import { z } from 'zod';

export const TRAINING_TYPE_VALUES = [
  'Chakra',
  'Physique',
  'Medical',
  'Genjutsu',
  'Ninjutsu',
  'Equilibre',
];

/** @deprecated */
export const FOCUS_VALUES = TRAINING_TYPE_VALUES;

export const updateTrainingPlansSchema = z.object({
  plans: z
    .array(
      z.object({
        ninjaId: z.number().int().positive(),
        preparationType: z.enum(TRAINING_TYPE_VALUES).nullable(),
      }),
    )
    .max(20)
    .optional(),
  globalTrainingType: z.enum(TRAINING_TYPE_VALUES).nullable().optional(),
});

export const setHourSchema = z.object({
  hour: z.number().int().min(0).max(72),
});

export const requestChuninExamSchema = z.object({
  ninjaId: z.number().int().positive(),
});

export const requestBirdFlightSchema = z.object({
  ninjaId: z.number().int().positive(),
});

export const dispensaryTreatSchema = z.object({
  ninjaId: z.number().int().positive(),
});

export const releaseNinjaSchema = z.object({
  ninjaId: z.number().int().positive(),
});

export const dismissNotificationSchema = z.object({
  notificationId: z.number().int().positive(),
});
