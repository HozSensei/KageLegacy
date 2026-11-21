/** Couleurs de fond uni pour la carte ninja (fond « par défaut »). */

export const DEFAULT_NINJA_CARD_BACKGROUND_COLOR = '#1D2238';

export function isProfileColor(color) {
  return typeof color === 'string' && color.length === 7 && /^#[0-9a-f]{6}$/i.test(color);
}

export function normalizeProfileColor(color) {
  return isProfileColor(color) ? color.toUpperCase() : null;
}
