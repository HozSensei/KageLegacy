import { CARD_BACKGROUND_IDS } from '@shared/character/cardBackgrounds.js';
import joueur1 from '../assets/illustrations/bg-joueur.png';
import joueur2 from '../assets/illustrations/bg-joueur-2.png';
import joueur3 from '../assets/illustrations/bg-joueur-3.jpg';
import joueur4 from '../assets/illustrations/bg-joueur-4.jpg';
import joueur5 from '../assets/illustrations/bg-joueur-5.jpg';
import joueur6 from '../assets/illustrations/bg-joueur-6.jpg';
import joueur7 from '../assets/illustrations/bg-joueur-7.jpg';
import joueur8 from '../assets/illustrations/bg-joueur-8.jpg';

const ASSETS = Object.freeze({
  'joueur-1': joueur1,
  'joueur-2': joueur2,
  'joueur-3': joueur3,
  'joueur-4': joueur4,
  'joueur-5': joueur5,
  'joueur-6': joueur6,
  'joueur-7': joueur7,
  'joueur-8': joueur8,
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
