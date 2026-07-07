#!/usr/bin/env node
/**
 * Calibrage des primes match — priorité milestone-9 #32.
 * Usage: npm run economy:calibrate [-- --cycles=20 --apply]
 *
 * --apply : écrit la recommandation dans stdout (les constantes restent dans matchEconomy.js)
 */
import { calibrateMatchPrizes } from '../src/services/simulation/economyCalibrator.js';
import { MATCH_DRAW_RYOS, MATCH_WIN_RYOS } from '../src/services/matchEconomy.js';

function parseArgs() {
  const cycles = Number(process.argv.find((a) => a.startsWith('--cycles='))?.split('=')[1]) || 20;
  const apply = process.argv.includes('--apply');
  return { cycles, apply };
}

function formatRyos(n) {
  return n.toLocaleString('fr-FR');
}

const { cycles, apply } = parseArgs();

console.log('\n💰 Kage Legacy — economy:calibrate\n');
console.log(`  Actuel : victoire ${formatRyos(MATCH_WIN_RYOS)} · nul ${formatRyos(MATCH_DRAW_RYOS)} Ryos`);
console.log(`  Horizon : ${cycles} cycles · départ 15 400 Ryos\n`);

const report = calibrateMatchPrizes({ cycles });

console.log('── Profils de référence ──');
for (const profile of report.profiles) {
  console.log(`  ${profile.label} : ${profile.description}`);
}

console.log('\n── Recommandation ──');
console.log(
  `  Victoire : ${formatRyos(report.recommended.winRyos)} Ryos · Nul : ${formatRyos(report.recommended.drawRyos)} Ryos`
);
console.log(
  `  Combinaisons viables (modéré ≥ ${formatRyos(report.minRyosTarget)} + engagé ≥ 0) : ${report.viableCount}`
);

const currentMod = report.currentConstants?.results?.moderate;
if (currentMod) {
  console.log('\n── Bilan constantes actuelles (1 500 / 500) ──');
  console.log(
    `  Modéré : min ${formatRyos(currentMod.minRyos)} · fin ${formatRyos(currentMod.ryosEnd)} · ${currentMod.netPerCycle >= 0 ? '+' : ''}${formatRyos(currentMod.netPerCycle)}/cycle`
  );
  const currentEng = report.currentConstants.results.engaged;
  console.log(
    `  Engagé : min ${formatRyos(currentEng.minRyos)} · fin ${formatRyos(currentEng.ryosEnd)} · ${currentEng.netPerCycle >= 0 ? '+' : ''}${formatRyos(currentEng.netPerCycle)}/cycle`
  );
}

const rec = report.grid[0];
const recMod = rec.results.moderate;
const recEng = rec.results.engaged;

console.log('\n── Meilleur bilan modéré (grille) ──');
console.log(
  `  ${formatRyos(rec.winRyos)} / ${formatRyos(rec.drawRyos)} · min modéré ${formatRyos(recMod.minRyos)} · min engagé ${formatRyos(recEng.minRyos)}`
);

if (report.viableCount === 0) {
  console.log(
    `\n  🟡 Aucune combinaison ne tient ${cycles} cycles pour le profil modéré — le joueur doit compléter par missions / magasin frugal.`
  );
  console.log(
    `  Piste : monter les primes vers ${formatRyos(report.recommended.winRyos)} / ${formatRyos(report.recommended.drawRyos)} améliore la trésorerie minimale.`
  );
} else if (
  report.recommended.winRyos !== MATCH_WIN_RYOS ||
  report.recommended.drawRyos !== MATCH_DRAW_RYOS
) {
  console.log(
    `\n  🟡 Ajuster MATCH_WIN_RYOS=${report.recommended.winRyos} · MATCH_DRAW_RYOS=${report.recommended.drawRyos}`
  );
} else {
  console.log('\n  ✅ Constantes actuelles alignées avec le calibrage analytique.');
}

console.log('\n── Top combinaisons (par min modéré) ──');
for (const row of report.grid.slice(0, 5)) {
  const m = row.results.moderate;
  const tag = row.meetsModerate && row.meetsEngagedFloor ? '✓' : '·';
  console.log(
    `  ${tag} ${formatRyos(row.winRyos)} / ${formatRyos(row.drawRyos)} · min modéré ${formatRyos(m.minRyos)}`
  );
}

if (apply) {
  console.log('\n📋 JSON (milestone-9 / matchEconomy.js) :');
  console.log(
    JSON.stringify(
      {
        MATCH_WIN_RYOS: report.recommended.winRyos,
        MATCH_DRAW_RYOS: report.recommended.drawRyos,
        calibratedAt: new Date().toISOString(),
        cycles,
      },
      null,
      2
    )
  );
}

console.log('\n✅ Calibrage terminé.\n');
