import { applyEquipmentToFighter, getTrainingBoostMultiplier } from '../src/services/combat/equipment.js';
import { getFormeMultiplier } from '../src/services/combat/forme.js';
import { ENVIRONMENT_MODIFIERS } from '../src/services/matchEnvironment.js';
import { getMissionMoralGain } from '../src/services/dispensaryService.js';
import { meetsChuninRequirements } from '../src/services/chuninExam.js';

function fighter(overrides = {}) {
  return {
    stats: { taijutsu: 10, ninjutsu: 10, genjutsu: 8, vitesse: 8 },
    maxPv: 100,
    pv: 100,
    ...overrides,
  };
}

const cycleBoost = [
  {
    slug: 'entrainement-focus',
    user_item_id: 10,
    effects: {
      cycle: { trigger: 'training_boost', multiplier: 1.1 },
    },
  },
];

const f = fighter();
applyEquipmentToFighter(f, cycleBoost);
console.assert(f.equipment?.cycle?.length === 1, 'cycle equipment attached');
console.assert(getTrainingBoostMultiplier(f, cycleBoost) > 1, 'training boost');

console.assert(getFormeMultiplier('Excellent') > getFormeMultiplier('Passable'), 'forme multiplier');
console.assert(ENVIRONMENT_MODIFIERS.pluie, 'environment pluie');
console.assert(getMissionMoralGain('success') > 0, 'mission moral');
console.assert(meetsChuninRequirements({ taijutsu: 12, ninjutsu: 12, genjutsu: 12, medecine: 12, vitesse: 12, intelligence: 12 }), 'chunin req');

console.log('testGameplayPolish: OK');
