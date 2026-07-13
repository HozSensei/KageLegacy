#!/usr/bin/env node
/**
 * Tests défis de préparation Élite (sans BDD).
 */
import { buildPreparationChallenges } from '../src/services/elitePreparationChallenges.js';

const ninjas = [
  {
    id: 1,
    name: 'Tai',
    squad_position: 1,
    taijutsu: 12,
    ninjutsu: 6,
    genjutsu: 5,
    medecine: 5,
    vitesse: 8,
    intelligence: 7,
  },
  {
    id: 2,
    name: 'Nin',
    squad_position: 2,
    taijutsu: 6,
    ninjutsu: 12,
    genjutsu: 6,
    medecine: 6,
    vitesse: 7,
    intelligence: 7,
  },
  {
    id: 3,
    name: 'Med',
    squad_position: 3,
    taijutsu: 6,
    ninjutsu: 6,
    genjutsu: 7,
    medecine: 11,
    vitesse: 6,
    intelligence: 8,
  },
];

const operationDeck = {
  techniqueCount: 3,
  techniqueSlotsByNinjaId: {
    1: [1],
    2: [2],
    3: [3],
  },
};

const result = buildPreparationChallenges({ ninjas, operationDeck, locale: 'fr' });
console.assert(result.challenges.length >= 1, 'challenges générés');
console.assert(result.summary.done >= 2, 'majorité validée');
console.assert(
  result.challenges.some((c) => c.id === 'deck_techniques' && c.status === 'done'),
  'deck technique complet'
);

console.log('testPreparationChallenges: OK');
