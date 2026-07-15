import { applyEquipmentToFighter } from '../src/services/combat/equipment.js';
import { getTrainingBuffMultiplier } from '../src/services/training.js';
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

const f = fighter();
applyEquipmentToFighter(f);
console.assert(f.equipment?.cycle?.length === 0, 'no cycle equipment');
console.assert(getTrainingBuffMultiplier({ training_buff: 'training_weights' }) === 1.2, 'training weights buff');
console.assert(getTrainingBuffMultiplier({ training_buff: 'strategy_book' }) === 1.15, 'strategy book buff');

console.assert(getFormeMultiplier('Excellent') > getFormeMultiplier('Passable'), 'forme multiplier');
console.assert(ENVIRONMENT_MODIFIERS.pluie, 'environment pluie');
console.assert(getMissionMoralGain('success') > 0, 'mission moral');
console.assert(meetsChuninRequirements({ taijutsu: 12, ninjutsu: 12, genjutsu: 12, medecine: 12, vitesse: 12, intelligence: 12 }), 'chunin req');

console.log('testGameplayPolish: OK');
