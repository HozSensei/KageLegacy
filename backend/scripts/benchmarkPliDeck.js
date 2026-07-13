/**
 * Benchmark smoke — combat par plis (remplace benchmarkTacticCards).
 */
import { runMonteCarlo } from '../src/services/simulation/cycleSimulator.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';

const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1]) || 200;

const squadA = createBalancedSquad('A', 0, 1.05);
const squadB = createBalancedSquad('B', 10, 1.0);

const stats = runMonteCarlo({
  runs,
  slotANinjas: squadA,
  slotBNinjas: squadB,
  favoriteSide: 'slotA',
});

console.log('benchmarkPliDeck', { runs, ...stats });

if (stats.errors > runs * 0.05) {
  console.error('Trop d\'erreurs benchmark pli');
  process.exit(1);
}
