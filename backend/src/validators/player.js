import { z } from 'zod';
import { FACTION_IDS } from '../services/factionCatalog.js';

export const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
export { FACTION_IDS };

export const createCharacterSchema = z.object({
  name: z.string().trim().min(2, 'Minimum 2 caractères.').max(100),

  elementAffinity: z
    .enum(ELEMENTS, {
      errorMap: () => ({ message: 'Élément invalide.' }),
    })
    .optional(),
  factionId: z
    .enum(FACTION_IDS, {
      errorMap: () => ({ message: 'Faction invalide.' }),
    })
    .optional()
    .nullable(),
  avatarUrl: z.string().trim().url().max(255).nullable().optional().or(z.literal('')),
});
