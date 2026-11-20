/** Identifiants de fond de carte ninja partagés frontend / backend. */
export const CARD_BACKGROUND_IDS = Object.freeze(['joueur-1', 'joueur-2']);

const known = new Set(CARD_BACKGROUND_IDS);

export function isKnownCardBackgroundId(backgroundId) {
  return known.has(backgroundId);
}
