/**
 * Fusion monotone de la progression onboarding.
 * Empêche un GET /api/onboarding périmé d’annuler une visite déjà enregistrée
 * (course fréquente : POST /visit encore en vol → retour hub → fetchProgress).
 */

export function mergeOnboardingSteps(current, incoming) {
  const next = Array.isArray(incoming) ? incoming : [];
  if (!next.length) return Array.isArray(current) ? current.slice() : [];
  if (!Array.isArray(current) || !current.length) {
    return next.map(step => ({ ...step }));
  }

  const prevByKey = new Map(current.map(step => [step.key, step]));
  return next.map(step => {
    const prev = prevByKey.get(step.key);
    if (!prev) return { ...step };
    const completed = Boolean(step.completed || prev.completed);
    const claimed = Boolean(step.claimed || prev.claimed);
    return {
      ...step,
      completed,
      claimed,
      claimable: completed && !claimed,
      completedAt: step.completedAt || prev.completedAt || null,
      claimedAt: step.claimedAt || prev.claimedAt || null,
    };
  });
}

export function metaFromSteps(steps) {
  const list = Array.isArray(steps) ? steps : [];
  const completed = list.filter(s => s.completed).length;
  const claimed = list.filter(s => s.claimed).length;
  const claimable = list.filter(s => s.completed && !s.claimed).length;
  return {
    total: list.length,
    completed,
    claimed,
    claimable,
    finished: list.length > 0 && claimed >= list.length,
    allCompleted: list.length > 0 && completed >= list.length,
  };
}
