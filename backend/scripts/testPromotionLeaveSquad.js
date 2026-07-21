/**
 * Tests : sortie d'escouade à la promotion Chunin + combat escouade incomplète.
 */
import { buildTeamDeck, createRelaisFillerCard } from '../src/services/combat/pli/deckBuilder.js';
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import { MAX_PLIS, CARDS_PER_NINJA } from '../src/services/combat/pli/constants.js';

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

const emptyDeck = { techniqueSlotsByNinjaId: {}, techniqueCardsById: {}, techniquesByNinjaId: {} };

// Escouade incomplète (2 actifs) : deck complété à MAX_PLIS via relais.
const incomplete = createBalancedSquad('Inc', 0, 1.0).slice(0, 2);
const full = createBalancedSquad('Full', 20, 1.0);
const homeIncomplete = buildTeam(incomplete, 'home');
const awayFull = buildTeam(full, 'away');

const incompleteDeck = buildTeamDeck(homeIncomplete, emptyDeck);
console.assert(
  incompleteDeck.length === MAX_PLIS,
  `deck incomplet doit atteindre ${MAX_PLIS} plis, reçu ${incompleteDeck.length}`
);
const incompleteRelais = incompleteDeck.filter((c) => c.kind === 'relais' && c.relaisReason === 'incomplete_squad');
console.assert(
  incompleteRelais.length === MAX_PLIS - incomplete.length * CARDS_PER_NINJA,
  `relais incomplete_squad attendus : ${MAX_PLIS - incomplete.length * CARDS_PER_NINJA}, reçu ${incompleteRelais.length}`
);

const result = simulatePliCombat(homeIncomplete, awayFull, {
  homeDeck: emptyDeck,
  awayDeck: emptyDeck,
});
console.assert(
  result.logs.length === MAX_PLIS || result.endReason === 'ko',
  `combat incomplet : ${MAX_PLIS} plis ou KO, reçu ${result.logs.length} (${result.endReason})`
);
console.assert(['home', 'away', 'draw'].includes(result.winner), 'winner valide avec escouade incomplète');

// Escouade vide : relais seuls — le combat s'arrête sans crash (forfait logique).
const emptyTeam = buildTeam([], 'home');
const freshAway = buildTeam(createBalancedSquad('Fresh', 40, 1.0), 'away');
const emptyDeckCards = buildTeamDeck(emptyTeam, emptyDeck);
console.assert(emptyDeckCards.length === MAX_PLIS, 'deck vide paddé à MAX_PLIS');
const emptyResult = simulatePliCombat(emptyTeam, freshAway, {
  homeDeck: emptyDeck,
  awayDeck: emptyDeck,
});
console.assert(
  emptyResult.winner === 'away' && emptyResult.endReason === 'forfeit',
  `escouade vide doit perdre par forfait, reçu ${emptyResult.winner}/${emptyResult.endReason}`
);

// createRelaisFillerCard reste utilisable sans fighter.
const filler = createRelaisFillerCard(emptyTeam, null, { reason: 'incomplete_squad' });
console.assert(filler.kind === 'relais' && filler.padded === true, 'filler relais valide');

console.log('testPromotionLeaveSquad OK', {
  incompletePlis: result.logs.length,
  incompleteWinner: result.winner,
  emptyPlis: emptyResult.logs.length,
  emptyWinner: emptyResult.winner,
  incompleteSquadRelais: incompleteRelais.length,
});
