/**
 * Smoke test — libellés du rapport deck scout (deck hybride 18 plis).
 */
import assert from 'node:assert/strict';
import { buildDeckReportFromDeck } from '../src/services/scoutDeckIntel.js';
import { MAX_PLIS } from '../src/services/combat/pli/constants.js';

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

const deckEmpty = {
  techniqueCount: 0,
  techniqueSlotsByNinjaId: {},
  rawTechniquesByNinjaId: {},
  techniquesByNinjaId: {
    1: { primary: 'taijutsu', secondary: 'ninjutsu' },
    2: { primary: 'ninjutsu', secondary: 'taijutsu' },
    3: { primary: 'medecine', secondary: 'ninjutsu' },
  },
  techniqueCards: [],
};

const report = buildDeckReportFromDeck(deckEmpty, ninjas, 'fr', 'full');
assert.equal(report.pliCount, MAX_PLIS, `${MAX_PLIS} plis`);
assert.equal(report.inventoryAssigned, 0, 'aucune carte inventaire');
assert(report.relaisInventory === 3, '3 relais inventaire attendus');
assert(report.lines[0].includes('0/3 cartes technique inventaire'), 'résumé inventaire');
assert(
  report.lines.some((line) => line.includes('relais de comblement attendus')),
  'emplacements sans carte inventaire'
);

const deckPartial = {
  ...deckEmpty,
  techniqueCount: 1,
  techniqueSlotsByNinjaId: { 1: [42] },
  techniqueCards: [
    {
      userTacticCardId: 42,
      slug: 'test-card',
      nameFr: 'Carte test',
      statType: 'taijutsu',
      pliBonusPct: 5,
    },
  ],
  rawTechniquesByNinjaId: {
    1: { primary: 'taijutsu', secondary: 'ninjutsu' },
  },
};
const partialConfigured = buildDeckReportFromDeck(deckPartial, ninjas, 'fr', 'full');
assert.equal(partialConfigured.inventoryAssigned, 1, '1 carte inventaire');
assert(partialConfigured.lines.some((line) => line.includes('Carte test')), 'carte affichée');
assert(
  partialConfigured.lines.some((line) => line.includes('pas de carte inventaire')),
  'slots sans carte'
);

console.log('test:scout-deck-intel OK');
