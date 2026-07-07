import { ZodError } from 'zod';

const FRIENDLY = {
  'strategies.too_small': 'Aucun ninja en escouade active — complétez votre composition d\'abord.',
  'strategies.too_big': 'Trois ninjas actifs maximum en escouade.',
};

export function formatZodError(error) {
  if (!(error instanceof ZodError)) {
    return error?.message || 'Données invalides.';
  }

  const issue = error.issues[0];
  if (!issue) return 'Données invalides.';

  const pathKey = `${issue.path.join('.')}.${issue.code}`;
  if (FRIENDLY[pathKey]) return FRIENDLY[pathKey];

  if (issue.path[0] === 'strategies' && issue.code === 'too_small') {
    return FRIENDLY['strategies.too_small'];
  }

  return issue.message || 'Données invalides.';
}
