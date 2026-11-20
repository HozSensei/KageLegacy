import joueur1 from '../assets/illustrations/bg-joueur.png';
import joueur2 from '../assets/illustrations/bg-joueur-2.png';

export const NINJA_CARD_BACKGROUNDS = Object.freeze([
  Object.freeze({ id: 'joueur-1', src: joueur1 }),
  Object.freeze({ id: 'joueur-2', src: joueur2 }),
]);

const byId = new Map(NINJA_CARD_BACKGROUNDS.map(entry => [entry.id, entry]));

export function getNinjaCardBackground(backgroundId) {
  return byId.get(backgroundId) ?? null;
}

export function ninjaCardBackgroundUrl(backgroundId) {
  return getNinjaCardBackground(backgroundId)?.src ?? null;
}
