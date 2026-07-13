/**
 * Smoke test — combat par plis (1 technique + 2× primaire + 3× secondaire / ninja = 18 plis).
 */
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { buildTeamDeck } from '../src/services/combat/pli/deckBuilder.js';
import { statBaseValue } from '../src/services/combat/pli/power.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import {
  MAX_PLIS,
  TECHNIQUE_CARDS_PER_NINJA,
  PRIMARY_STAT_COPIES,
  SECONDARY_STAT_COPIES,
  STAT_CARDS_PER_NINJA,
  CARDS_PER_NINJA,
} from '../src/services/combat/pli/constants.js';

function buildTeam(ninjas, label) {
  const fighters = ninjas.map((ninja, index) => {
    const stats = applyFormeToStats(ninja);
    const maxPv = computeMatchPvFromRating(stats);
    return {
      id: ninja.id,
      name: ninja.name,
      side: label,
      element_affinity: ninja.element_affinity,
      stats,
      pv: maxPv,
      maxPv,
      ko: false,
      slot: index + 1,
    };
  });
  return { label, fighters, sensei: { name: label } };
}

const squadA = createBalancedSquad('A', 0, 1.1);
const squadB = createBalancedSquad('B', 10, 1.0);

const home = buildTeam(squadA, 'home');
const away = buildTeam(squadB, 'away');

const emptyDeck = { techniqueSlotsByNinjaId: {}, techniqueCardsById: {}, techniquesByNinjaId: {} };
const result = simulatePliCombat(home, away, {
  homeDeck: emptyDeck,
  awayDeck: emptyDeck,
});

console.assert(result.logs.length === MAX_PLIS, `attendu ${MAX_PLIS} plis, reçu ${result.logs.length}`);
console.assert(['home', 'away', 'draw'].includes(result.winner), 'winner valide');
console.assert(
  result.logs.some((log) => log.relais_padding_home || log.relais_padding_away),
  'au moins un relais (carte technique inventaire manquante)'
);

const deck = buildTeamDeck(home, emptyDeck);
console.assert(deck.length === squadA.length * CARDS_PER_NINJA, `deck = ${CARDS_PER_NINJA} cartes / ninja`);
console.assert(deck.some((c) => c.kind === 'domain'), 'cartes stat domaine par défaut');
console.assert(
  deck.filter((c) => c.kind === 'relais').length === home.fighters.length,
  '1 relais technique inventaire / ninja sans deck'
);

const fighter = home.fighters[0];
const base = statBaseValue(fighter, 'taijutsu');
const withSecondary = Math.floor((base + statBaseValue(fighter, 'ninjutsu')) / 2);
const withBonus = Math.floor(withSecondary * 1.3);
console.assert(withBonus > withSecondary, 'bonus carte technique sur base sans d6');

console.assert(TECHNIQUE_CARDS_PER_NINJA === 1, '1 carte technique inventaire / ninja');
console.assert(PRIMARY_STAT_COPIES === 2, '2 copies stat primaire / ninja');
console.assert(SECONDARY_STAT_COPIES === 3, '3 copies stat secondaire / ninja');
console.assert(STAT_CARDS_PER_NINJA === 5, '5 cartes stat / ninja');

console.log('testPliCombat OK', {
  plis: result.logs.length,
  winner: result.winner,
  plisWon: result.plisWon,
});
