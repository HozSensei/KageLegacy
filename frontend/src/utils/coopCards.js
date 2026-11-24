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

/** Effets dont le champ `damage` n’est pas des dégâts infligés à la cible. */
const NON_HARMFUL_DAMAGE_EFFECTS = new Set(['counter']);

// This is a UX preview; the server remains the authority for ally targeting.
export function needsFriendlyFireConfirmation(card) {
  if (Number(card?.damage) > 0) return true;
  return (card?.effects ?? []).some(effect => {
    if (!effect || effect.target === 'self') return false;
    if (NON_HARMFUL_DAMAGE_EFFECTS.has(effect.type)) return false;
    return (
      effect.type === 'multi_strike' ||
      Number(effect.damage) > 0 ||
      (effect.type === 'apply_status' && HARMFUL_STATUSES.has(String(effect.status).toLowerCase()))
    );
  });
}
