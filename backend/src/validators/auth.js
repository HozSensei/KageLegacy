import { z } from 'zod';
import { startingAvatarIdSchema } from './player.js';

export const registerSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').max(255),
  password: z.string().min(6, 'Minimum 6 caractères.').max(128),
  characterName: z.string().trim().min(2).max(100),
  avatarId: startingAvatarIdSchema,
  language: z.enum(['fr', 'en']).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const guestRegisterSchema = z.object({
  characterName: z.string().trim().min(2).max(100),
  avatarId: startingAvatarIdSchema,
  language: z.enum(['fr', 'en']).optional(),
});

export const convertGuestSchema = z.object({
  password: z.string().min(6, 'Minimum 6 caractères.').max(128),
  email: z.string().trim().email('Adresse e-mail invalide.').max(255),
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

export const googleLoginSchema = z.object({
  idToken: z.string().trim().min(20, 'Jeton Google invalide.'),
  language: z.enum(['fr', 'en']).optional(),
  avatarId: startingAvatarIdSchema,
});
