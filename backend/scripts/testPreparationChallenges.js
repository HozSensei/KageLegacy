#!/usr/bin/env node
/**
 * Tests défis de préparation Élite (sans BDD).
 */
import { buildPreparationChallenges } from '../src/services/elitePreparationChallenges.js';
import {
  getStrategiesForComposition,
  normalizeOrderStyle,
} from '../src/services/combat/squadPowerScaling.js';

const ninjas = [
  {
    id: 1,
    name: 'Tai',
    squad_position: 1,
    battle_strategy: 'Offensive',
    taijutsu: 12,
    ninjutsu: 6,
    genjutsu: 5,
    medecine: 5,
    vitesse: 8,
    intelligence: 7,
  },
  {
    id: 2,
    name: 'Tank',
    squad_position: 2,
    battle_strategy: 'Tank',
    taijutsu: 10,
    ninjutsu: 8,
    genjutsu: 6,
    medecine: 6,
    vitesse: 7,
    intelligence: 7,
  },
  {
    id: 3,
    name: 'Med',
    squad_position: 3,
    battle_strategy: 'Protect',
    protect_target_ninja_id: 1,
    taijutsu: 6,
    ninjutsu: 6,
    genjutsu: 7,
    medecine: 11,
    vitesse: 6,
    intelligence: 8,
  },
];

const cards = [
  {
    ninja_id: 1,
    card_type: 'attack',
    stat_type: 'ninjutsu',
    slug: 'nin-eclair-discret',
  },
  {
    ninja_id: 2,
    card_type: 'defense',
    stat_type: 'taijutsu',
    slug: 'tai-parade-ecole',
  },
  {
    ninja_id: 3,
    card_type: 'support',
    stat_type: 'medecine',
    slug: 'med-pansement-rapide',
  },
];

const result = buildPreparationChallenges({ ninjas, cardRows: cards, locale: 'fr' });
console.assert(result.challenges.length >= 5, 'challenges générés');
console.assert(result.summary.done >= 4, 'majorité validée');
console.assert(
  result.challenges.some((c) => c.id === 'equip_all_cards' && c.status === 'done'),
  'cartes complètes'
);

console.assert(normalizeOrderStyle('assaut') === 'offensive', 'alias assaut');
console.assert(getStrategiesForComposition('tank')[0] === 'Tank', 'style tank');
console.assert(getStrategiesForComposition('offensive').every((s) => s === 'Offensive'), 'style offensive');

console.log('testPreparationChallenges: OK');
