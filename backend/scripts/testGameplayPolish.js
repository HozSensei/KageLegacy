import {
  applyEquipmentToFighter,
  getElementResistBonus,
} from '../src/services/combat/equipment.js';
import { getFormeMultiplier } from '../src/services/combat/forme.js';
import { ENVIRONMENT_MODIFIERS } from '../src/services/matchEnvironment.js';
import { getMissionMoralGain } from '../src/services/dispensaryService.js';
import { meetsChuninRequirements } from '../src/services/chuninExam.js';

function fighter(overrides = {}) {
  return {
    battle_strategy: 'Normal',
    stats: { taijutsu: 10, ninjutsu: 10, genjutsu: 8, vitesse: 8 },
    maxPv: 100,
    pv: 100,
    ...overrides,
  };
}

const brassardKaton = [
  {
    slug: 'brassard-katon',
    user_item_id: 10,
    effects: {
      match: {
        trigger: 'element_resist',
        element: 'Katon',
        defenseBonus: 2,
        usesPerMatch: 2,
      },
    },
  },
];

let f = fighter();
applyEquipmentToFighter(f, brassardKaton);
console.assert(
  getElementResistBonus(f, 'Katon', 'ninjutsu') === 2,
  'Brassard Katon +2 défense vs ninjutsu Katon'
);
console.assert(
  getElementResistBonus(f, 'Suiton', 'ninjutsu') === 0,
  'Brassard Katon ignoré vs autre élément'
);
console.assert(
  getElementResistBonus(f, 'Katon', 'taijutsu') === 0,
  'Brassard Katon ignoré hors ninjutsu'
);

console.assert(getFormeMultiplier('Excellent', 6) < getFormeMultiplier('Excellent', 10), 'Moral bas pénalise la forme');
console.assert(getFormeMultiplier('Excellent', 18) > getFormeMultiplier('Excellent', 10), 'Moral haut booste la forme');

console.assert(getMissionMoralGain('D') === 1, 'Mission D +1 moral');
console.assert(getMissionMoralGain('C') === 2, 'Mission C +2 moral');
console.assert(getMissionMoralGain('routine') === 1, 'legacy routine moral');
console.assert(getMissionMoralGain('unknown') === 0, 'Tier inconnu sans gain moral');

const elementEnvs = ENVIRONMENT_MODIFIERS.filter(
  (env) => env.effects?.elementAffinityBonus && env.effects?.affinityElement
);
const elements = new Set(elementEnvs.map((env) => env.effects.affinityElement));
console.assert(elements.has('Katon'), 'Environnement Katon');
console.assert(elements.has('Suiton'), 'Environnement Suiton');
console.assert(elements.has('Raiton'), 'Environnement Raiton');
console.assert(elements.has('Doton'), 'Environnement Doton');
console.assert(elements.has('Futon'), 'Environnement Futon');
console.assert(elementEnvs.length >= 5, 'Au moins 5 bonus élémentaires météo');

const readyGenin = {
  taijutsu: 12,
  ninjutsu: 8,
  genjutsu: 7,
  medecine: 6,
  vitesse: 6,
  intelligence: 9,
};
console.assert(meetsChuninRequirements(readyGenin), 'Genin éligible Chunin');
console.assert(!meetsChuninRequirements({ ...readyGenin, vitesse: 2 }), 'note moyenne insuffisante');

console.log('gameplay polish tests OK');
