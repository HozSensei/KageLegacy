const HARMFUL_STATUSES = new Set([
  'weak',
  'vulnerable',
  'poison',
  'burn',
  'bleed',
  'madness',
  'brûlure',
  'saignement',
  'folie',
  'faiblesse',
  'vulnérabilité',
]);

// This is a UX preview; the server remains the authority for ally targeting.
export function needsFriendlyFireConfirmation(card) {
  if (Number(card?.damage) > 0) return true;
  return (card?.effects ?? []).some(effect => {
    if (!effect || effect.target === 'self') return false;
    return (
      effect.type === 'multi_strike' ||
      Number(effect.damage) > 0 ||
      (effect.type === 'apply_status' && HARMFUL_STATUSES.has(String(effect.status).toLowerCase()))
    );
  });
}
