#!/usr/bin/env node
/**
 * Benchmark combat multi-scénarios + simulation multi-cycles.
 * Usage: npm run combat:benchmark [-- --runs=500 --cycles=12]
 */
import { runFullBenchmark } from '../src/services/simulation/cycleSimulator.js';

const COMPOSITION_NAMES = {
  assaut: 'Assaut',
  mur: 'Mur',
  flux: 'Flux',
  equilibre: 'Équilibre',
};

function parseArgs() {
  const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1]) || 400;
  const cycles = Number(process.argv.find((a) => a.startsWith('--cycles='))?.split('=')[1]) || 12;
  return { runs, cycles };
}

function printScenario(key, data) {
  console.log(`\n── ${data.label || key} ──`);
  console.log(
    `  Slot A: ${data.slotAWinPct}% · Slot B: ${data.slotBWinPct}% · Nuls: ${data.drawPct}% · Upsets: ${data.upsetPct}%`
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
    `  Slot A: ${s.slotAWinPct}% · Slot B: ${s.slotBWinPct}% · Nuls: ${s.drawPct}% · Upsets: ${s.upsetPct}%`
  );
  console.log('  Progression slot A (combat total):', data.timeline.map((t) => t.slotACombatSum).join(' → '));
  console.log('  Progression slot B (combat total):', data.timeline.map((t) => t.slotBCombatSum).join(' → '));
  console.log('  Roster final slot A:', JSON.stringify(data.finalSlotA, null, 0));
  console.log('  Roster final slot B:', JSON.stringify(data.finalSlotB, null, 0));
}

const { runs, cycles } = parseArgs();
console.log(`\n🥋 Kage Legacy — combat:benchmark (${runs} matchs/scénario, ${cycles} cycles)\n`);
console.log('  Slot A / Slot B = positions techniques du moteur (pas domicile/extérieur)\n');

const bench = runFullBenchmark({ runs, cycles });

for (const [key, scenario] of Object.entries(bench.scenarios)) {
  printScenario(key, scenario);
}

printMultiCycle('équipes égales', bench.multiCycle.equalTeams);
printMultiCycle('bot +40 % favori', bench.multiCycle.botFavored);

console.log('\n── Compositions (matchups symétriques) ──');
console.log('  Chaque paire jouée 50 % en slot A / 50 % en slot B · même sensei des deux côtés');
console.log('  Cercle : compo favorisée ~54–70 % · Neutre : ~38–62 % chaque côté');
for (const [label, row] of Object.entries(bench.compositionMatrix)) {
  const mark = row.onTarget ? '✓' : '⚠';
  if (row.mirror) {
    console.log(
      `  ${mark} ${label}: slot A ${row.slotAWinPct}% · slot B ${row.slotBWinPct}% · nuls ${row.drawPct}%`
    );
    continue;
  }
  const aKey = `${row.compA}WinPct`;
  const bKey = `${row.compB}WinPct`;
  let extra = '';
  if (row.favored) {
    const favPct = row.favored === row.compA ? row[aKey] : row[bKey];
    extra = ` · favori ${COMPOSITION_NAMES[row.favored]} ${favPct}%`;
  }
  console.log(
    `  ${mark} ${label}: ${row.compAName} ${row[aKey]}% · ${row.compBName} ${row[bKey]}% · nuls ${row.drawPct}%${extra}`
  );
}

console.log('\n── Cibles indicatives (milestone-9) ──');
console.log('  Favori équilibré vs underdog fort: 63–65 % win (favori en slot A dans le scénario démo)');
console.log('  Nuls: ~30–33 % · Upsets: ~4–5 % · KO: ~0 %');

console.log('\n📋 JSON complet (copier dans milestone-9 si besoin):');
console.log(JSON.stringify(bench, null, 2));
