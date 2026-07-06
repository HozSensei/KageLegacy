import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Minimum 3 caractères.')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et underscore uniquement.'),
  password: z.string().min(6, 'Minimum 6 caractères.').max(128),
  senseiName: z.string().trim().min(2).max(100),
  language: z.enum(['fr', 'en']).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
