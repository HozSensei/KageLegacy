#!/usr/bin/env node
/**
 * Benchmark combat multi-scénarios + simulation multi-cycles.
 * Usage: npm run combat:benchmark [-- --runs=500 --cycles=12]
 */
import { runFullBenchmark } from '../src/services/simulation/cycleSimulator.js';

function parseArgs() {
  const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1]) || 400;
  const cycles = Number(process.argv.find((a) => a.startsWith('--cycles='))?.split('=')[1]) || 12;
  return { runs, cycles };
}

function printScenario(key, data) {
  console.log(`\n── ${data.label || key} ──`);
  console.log(
    `  Home: ${data.homeWinPct}% · Away: ${data.awayWinPct}% · Nuls: ${data.drawPct}% · Upsets: ${data.upsetPct}%`
  );
  if (data.winPctFavorite != null) {
    console.log(`  (Favori: ${data.winPctFavorite}% win)`);
  }
  console.log(`  KO: ${data.koPct}% · Tours moyens: ${data.avgTours}`);
}

function printMultiCycle(label, data) {
  const s = data.summary;
  console.log(`\n══ Multi-cycle (${label}) — ${s.matches} cycles ══`);
  console.log(
    `  Home: ${s.homeWinPct}% · Away: ${s.awayWinPct}% · Nuls: ${s.drawPct}% · Upsets: ${s.upsetPct}%`
  );
  console.log('  Progression home (combat total):', data.timeline.map((t) => t.homeCombatSum).join(' → '));
  console.log('  Progression away (combat total):', data.timeline.map((t) => t.awayCombatSum).join(' → '));
  console.log('  Roster final home:', JSON.stringify(data.finalHome, null, 0));
}

const { runs, cycles } = parseArgs();
console.log(`\n🥋 Kage Legacy — combat:benchmark (${runs} matchs/scénario, ${cycles} cycles)\n`);

const bench = runFullBenchmark({ runs, cycles });

for (const [key, scenario] of Object.entries(bench.scenarios)) {
  printScenario(key, scenario);
}

printMultiCycle('équipes égales', bench.multiCycle.equalTeams);
printMultiCycle('bot +40 % favori', bench.multiCycle.botFavored);

console.log('\n── Cercle des compositions (mêmes stats) ──');
console.log('  Cible : avantage matchup ~58–65 % win (+20 pts vs 50/50)');
for (const [label, row] of Object.entries(bench.compositionMatrix)) {
  const mark = row.onTarget ? '✓' : '⚠';
  console.log(
    `  ${mark} ${label}: home ${row.homeWinPct}% · away ${row.awayWinPct}% · nuls ${row.drawPct}%`
  );
}

console.log('\n── Cibles indicatives (milestone-9) ──');
console.log('  Favori équilibré vs underdog fort: 63–65 % win (si home = favori démo)');
console.log('  Nuls: ~30–33 % · Upsets: ~4–5 % · KO: ~0 %');

console.log('\n📋 JSON complet (copier dans milestone-9 si besoin):');
console.log(JSON.stringify(bench, null, 2));
