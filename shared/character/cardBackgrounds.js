/** Identifiants de fond de carte ninja partagés frontend / backend. */
export const CARD_BACKGROUND_IDS = Object.freeze([
  'joueur-1',
  'joueur-2',
  'joueur-3',
  'joueur-4',
  'joueur-5',
  'joueur-6',
  'joueur-7',
  'joueur-8',
]);

const known = new Set(CARD_BACKGROUND_IDS);

export function isKnownCardBackgroundId(backgroundId) {
  return known.has(backgroundId);
}
