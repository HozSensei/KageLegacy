import { ZodError } from 'zod';

export function formatZodError(error) {
  if (!(error instanceof ZodError)) {
    return error?.message || 'Données invalides.';
  }

  const issue = error.issues[0];
  if (!issue) return 'Données invalides.';

  return issue.message || 'Données invalides.';
}
