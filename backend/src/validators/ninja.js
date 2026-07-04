import { z } from 'zod';

export const GRADES = ['Genin', 'Chunin', 'Jonin'];
export const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
export const CHARACTER_TRAITS = ['Egoiste', 'Altruiste', 'Faineant', 'Temeraire', 'Discipline'];
export const WEEKLY_FORMES = ['Lamentable', 'Passable', 'Excellent', 'Divin'];
export const LANGUAGES = ['fr', 'en'];

const statSchema = z.number().int().min(1).max(20);

export const ninjaStatsSchema = z.object({
  taijutsu: statSchema,
  ninjutsu: statSchema,
  genjutsu: statSchema,
  medecine: statSchema,
  vitesse: statSchema,
  intelligence: statSchema,
});

export const ninjaInputSchema = z.object({
  user_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(15).max(18),
  grade: z.enum(GRADES),
  clan_trait_id: z.number().int().positive(),
  element_affinity: z.enum(ELEMENTS),
  character_trait: z.enum(CHARACTER_TRAITS),
  language: z.enum(LANGUAGES).default('fr'),
  weekly_forme: z.enum(WEEKLY_FORMES).default('Passable'),
  moral: statSchema,
  squad_position: z.number().int().min(1).max(3).nullable().optional(),
  ...ninjaStatsSchema.shape,
});

export function validateNinjaStats(stats) {
  return ninjaStatsSchema.parse(stats);
}

export function validateNinjaInput(data) {
  return ninjaInputSchema.parse(data);
}
