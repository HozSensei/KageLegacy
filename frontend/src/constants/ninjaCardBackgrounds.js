import { CARD_BACKGROUND_IDS } from '@shared/character/cardBackgrounds.js';
import joueur1 from '../assets/illustrations/bg-joueur.png';
import joueur2 from '../assets/illustrations/bg-joueur-2.png';

const ASSETS = Object.freeze({
  'joueur-1': joueur1,
  'joueur-2': joueur2,
});

export const NINJA_CARD_BACKGROUNDS = Object.freeze(
  CARD_BACKGROUND_IDS.map(id => Object.freeze({ id, src: ASSETS[id] }))
);

const byId = new Map(NINJA_CARD_BACKGROUNDS.map(entry => [entry.id, entry]));

export function getNinjaCardBackground(backgroundId) {
  return byId.get(backgroundId) ?? null;
}

export function ninjaCardBackgroundUrl(backgroundId) {
  return getNinjaCardBackground(backgroundId)?.src ?? null;
}
