import { z } from 'zod';
import { FACTION_IDS } from '../services/factionCatalog.js';

export const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
export const SPECIALIZATIONS = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medicine'];
export { FACTION_IDS };

export const createCharacterSchema = z.object({
  name: z.string().trim().min(2, 'Minimum 2 caractères.').max(100),
  clanTraitId: z.coerce.number().int().positive().nullable().optional(),
  elementAffinity: z.enum(ELEMENTS, {
    errorMap: () => ({ message: 'Élément invalide.' }),
  }),
  factionId: z
    .enum(FACTION_IDS, {
      errorMap: () => ({ message: 'Faction invalide.' }),
    })
    .optional()
    .nullable(),
  avatarUrl: z.string().trim().url().max(255).nullable().optional().or(z.literal('')),
});

export const addXpSchema = z.object({
  amount: z.coerce.number().int().positive('amount doit être un entier positif.'),
});

export const specializationSchema = z.object({
  specialization: z.enum(SPECIALIZATIONS, {
    errorMap: () => ({ message: 'Spécialisation invalide.' }),
  }),
});
