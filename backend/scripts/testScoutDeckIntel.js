/**
 * Smoke test — libellés du rapport deck scout (système pli).
 */
import assert from 'node:assert/strict';
import { buildDeckReportFromDeck } from '../src/services/scoutDeckIntel.js';

const ninjas = [
  {
    id: 1,
    element_affinity: 'feu',
    taijutsu: 50,
    ninjutsu: 30,
    genjutsu: 20,
    medecine: 10,
    vitesse: 40,
    intelligence: 35,
    grade: 'genin',
  },
  {
    id: 2,
    element_affinity: 'eau',
    taijutsu: 20,
    ninjutsu: 55,
    genjutsu: 25,
    medecine: 15,
    vitesse: 45,
    intelligence: 40,
    grade: 'genin',
  },
  {
    id: 3,
    element_affinity: 'terre',
    taijutsu: 15,
    ninjutsu: 20,
    genjutsu: 25,
    medecine: 60,
    vitesse: 35,
    intelligence: 50,
    grade: 'genin',
  },
];

const deckUnconfigured = {
  elementCardIds: [],
  rawTechniquesByNinjaId: {},
  techniquesByNinjaId: {
    1: { primary: 'taijutsu', secondary: 'ninjutsu' },
    2: { primary: 'ninjutsu', secondary: 'taijutsu' },
    3: { primary: 'medecine', secondary: 'ninjutsu' },
  },
  elementCards: [],
};

const report = buildDeckReportFromDeck(deckUnconfigured, ninjas, 'fr', 'full');
assert.equal(report.pliCount, 14, '14 plis');
assert.equal(report.configuredTechniqueNinjas, 0, 'aucune technique enregistrée');
assert(report.relaisPadding >= 9, 'relais attendus pour techniques manquantes');
assert(report.lines[0].includes('0/3 ninjas avec techniques enregistrées'), 'résumé techniques');
assert(report.lines.some((line) => line.includes('relais de comblement attendus')), 'emplacements sans techniques');
assert(!report.lines.some((line) => line.includes('18 plis')), 'pas de 18 plis');

const deckPartial = {
  ...deckUnconfigured,
  rawTechniquesByNinjaId: {
    1: { primary: 'taijutsu', secondary: 'ninjutsu' },
  },
};
const partialConfigured = buildDeckReportFromDeck(deckPartial, ninjas, 'fr', 'full');
assert.equal(partialConfigured.configuredTechniqueNinjas, 1, '1 ninja configuré');
assert(partialConfigured.lines.some((line) => line.includes('Taijutsu / Ninjutsu')), 'slot configuré affiché');
assert(
  partialConfigured.lines.some((line) => line.includes('techniques non enregistrées')),
  'slots non configurés'
);

console.log('test:scout-deck-intel OK');
