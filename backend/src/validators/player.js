import { z } from 'zod';
import { FACTION_IDS } from '../services/factionCatalog.js';
import {
  ASPIRANT_RANK,
  isAvatarAvailableToRank,
  isKnownAvatarId,
  isProfileColor,
} from '../services/characterAppearance.js';

export const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
export { FACTION_IDS };

const avatarIdSchema = z.string().refine(isKnownAvatarId, 'Portrait invalide.');
export const startingAvatarIdSchema = avatarIdSchema
  .refine(id => isAvatarAvailableToRank(id, ASPIRANT_RANK), 'Portrait Aspirant ninja requis.')
  .nullish();
const profileColorSchema = z.string().refine(isProfileColor, 'Couleur attendue au format #RRGGBB.');

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
  avatarId: startingAvatarIdSchema,
});

export const characterProfilePatchSchema = z
  .object({
    avatarId: avatarIdSchema.optional(),
    borderColor: profileColorSchema.nullable().optional(),
    backgroundColor: profileColorSchema.nullable().optional(),
    nicknameId: z.string().min(1).max(32).nullable().optional(),
  })
  .strict()
  .refine(value => Object.values(value).some(field => field !== undefined), {
    message: 'Indiquez au moins un champ de profil.',
  });
