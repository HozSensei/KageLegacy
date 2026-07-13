/**
 * Smoke test — combat par plis (deck 9 techniques + 5 éléments).
 */
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import { MAX_PLIS, DECK_ELEMENTS_COUNT } from '../src/services/combat/pli/constants.js';

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

const result = simulatePliCombat(home, away, {
  homeDeck: { techniquesByNinjaId: {}, elementCards: [] },
  awayDeck: { techniquesByNinjaId: {}, elementCards: [] },
});

console.assert(result.logs.length === 9, `attendu 9 plis sans éléments, reçu ${result.logs.length}`);
console.assert(['home', 'away', 'draw'].includes(result.winner), 'winner valide');
console.assert(result.homeScorePct >= 0 && result.awayScorePct >= 0, 'PV restants');

const sample = squadA[0];
const stats = applyFormeToStats(sample);
const pv = computeMatchPvFromRating(stats);
console.assert(pv === Math.max(10, Math.round((stats.taijutsu + stats.ninjutsu + stats.genjutsu + stats.medecine + stats.vitesse + stats.intelligence) / 6) * 10), 'PV note globale');

console.assert(DECK_ELEMENTS_COUNT === 5, '5 éléments deck');

console.log('testPliCombat OK', {
  plis: result.logs.length,
  winner: result.winner,
  homePv: result.homeScorePct,
  awayPv: result.awayScorePct,
  plisWon: result.plisWon,
});
