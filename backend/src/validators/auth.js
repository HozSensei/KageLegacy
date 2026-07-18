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
  invitePoolId: z.coerce.number().int().positive().optional(),
  villageId: z.enum(['leaf', 'sand', 'mist', 'stone']),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const guestRegisterSchema = z.object({
  senseiName: z.string().trim().min(2).max(100).optional(),
  language: z.enum(['fr', 'en']).optional(),
  villageId: z.enum(['leaf', 'sand', 'mist', 'stone']).optional(),
});

export const convertGuestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Minimum 3 caractères.')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et underscore uniquement.'),
  password: z.string().min(6, 'Minimum 6 caractères.').max(128),
  email: z.string().trim().email('Adresse e-mail invalide.').optional().or(z.literal('')),
  senseiName: z.string().trim().min(2).max(100).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis.'),
  newPassword: z.string().min(6, 'Minimum 6 caractères.').max(128),
});

export const updateEmailSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').optional().or(z.literal('')),
});

export const updateLanguageSchema = z.object({
  language: z.enum(['fr', 'en']),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).optional(),
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmation requise.' }) }),
});
