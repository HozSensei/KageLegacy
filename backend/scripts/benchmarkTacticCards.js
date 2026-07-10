#!/usr/bin/env node
/**
 * Benchmark Monte Carlo — cartes tactiques en combat.
 * Usage: npm run combat:tactic-cards [-- --runs=500]
 */
import {
  createBalancedSquad,
  createNinja,
  runMonteCarlo,
} from '../src/services/simulation/cycleSimulator.js';
import {
  equipCardsOnSquad,
  MIXED_LOADOUT,
  RARE_LOADOUT,
  STARTER_LOADOUT,
} from '../src/services/tacticCards/tacticCardFixtures.js';

function parseArgs() {
  const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.split('=')[1]) || 500;
  return { runs };
}

function squadCombatSum(ninjas) {
  return ninjas.reduce((s, n) => s + n.taijutsu + n.ninjutsu + n.genjutsu + n.medecine, 0);
}

function printScenario(label, data, extra = '') {
  const ok = data.errors === 0 ? '✓' : '✗';
  console.log(`\n── ${label} ${ok} ──`);
  console.log(
    `  Slot A: ${data.slotAWinPct}% · Slot B: ${data.slotBWinPct}% · Nuls: ${data.drawPct}%`
  );
  if (data.winPctFavorite != null) {
    console.log(`  Favori: ${data.winPctFavorite}% win · Upsets: ${data.upsetPct}%`);
  }
  console.log(
    `  KO: ${data.koPct}% · Tours moyens: ${data.avgTours} · Procs cartes: ${data.matchProcPct}% matchs (${data.cardProcsPerMatch}/match)`
  );
  if (data.errors) console.log(`  ⚠ Erreurs: ${data.errors}`);
  if (extra) console.log(`  ${extra}`);
}

function createVeteranSquad(prefix, idOffset, statScale = 1) {
  const scale = (v) => Math.round(v * statScale);
  return [
    createNinja({
      id: idOffset + 1,
      name: `${prefix} Jounin`,
      grade: 'Jounin',
      battle_strategy: 'Offensive',
      stats: {
        taijutsu: scale(12),
        ninjutsu: scale(10),
        genjutsu: scale(8),
        medecine: scale(6),
        vitesse: scale(11),
        intelligence: scale(9),
      },
    }),
    createNinja({
      id: idOffset + 2,
      name: `${prefix} Chunin`,
      grade: 'Chunin',
      battle_strategy: 'Tank',
      stats: {
        taijutsu: scale(10),
        ninjutsu: scale(11),
        genjutsu: scale(9),
        medecine: scale(7),
        vitesse: scale(9),
        intelligence: scale(10),
      },
    }),
    createNinja({
      id: idOffset + 3,
      name: `${prefix} Chunin2`,
      grade: 'Chunin',
      battle_strategy: 'Protect',
      stats: {
        taijutsu: scale(8),
        ninjutsu: scale(9),
        genjutsu: scale(11),
        medecine: scale(10),
        vitesse: scale(8),
        intelligence: scale(11),
      },
    }),
  ];
}

function createRookieSquad(prefix, idOffset, statScale = 1) {
  const scale = (v) => Math.round(v * statScale);
  return [
    createNinja({
      id: idOffset + 1,
      name: `${prefix} Genin`,
      grade: 'Genin',
      battle_strategy: 'Offensive',
      stats: {
        taijutsu: scale(8),
        ninjutsu: scale(6),
        genjutsu: scale(5),
        medecine: scale(5),
        vitesse: scale(7),
        intelligence: scale(6),
      },
    }),
    createNinja({
      id: idOffset + 2,
      name: `${prefix} Genin2`,
      grade: 'Genin',
      battle_strategy: 'Normal',
      stats: {
        taijutsu: scale(6),
        ninjutsu: scale(8),
        genjutsu: scale(6),
        medecine: scale(5),
        vitesse: scale(7),
        intelligence: scale(7),
      },
    }),
    createNinja({
      id: idOffset + 3,
      name: `${prefix} Genin3`,
      grade: 'Genin',
      battle_strategy: 'Protect',
      stats: {
        taijutsu: scale(6),
        ninjutsu: scale(6),
        genjutsu: scale(7),
        medecine: scale(7),
        vitesse: scale(6),
        intelligence: scale(8),
      },
    }),
  ];
}

function runScenario(label, config, runs) {
  const slotA = config.slotANinjas;
  const slotB = config.slotBNinjas;
  const slotATacticCards = config.slotATacticCards || equipCardsOnSquad(slotA, config.slotACards || []);
  const slotBTacticCards = config.slotBTacticCards || equipCardsOnSquad(slotB, config.slotBCards || []);

  const data = runMonteCarlo({
    slotANinjas: slotA,
    slotBNinjas: slotB,
    runs,
    favoriteSide: config.favoriteSide || 'slotA',
    slotATacticCards: config.slotACards === null ? {} : slotATacticCards,
    slotBTacticCards: config.slotBCards === null ? {} : slotBTacticCards,
  });

  const powerA = squadCombatSum(slotA);
  const powerB = squadCombatSum(slotB);
  const extra = `Puissance A=${powerA} B=${powerB} (Δ ${Math.round(((powerB - powerA) / powerA) * 100)}%)`;
  printScenario(label, data, extra);
  return { label, data, hasCards: config.slotACards !== null || config.slotBCards !== null };
}

const { runs } = parseArgs();
console.log(`\n🃏 Kage Legacy — benchmark cartes tactiques (${runs} matchs/scénario)\n`);

const squadA = createBalancedSquad('Alpha', 0, 1);
const squadB = createBalancedSquad('Beta', 10, 1);
const squadStrong = createBalancedSquad('Fort', 20, 1.15);
const squadWeak = createBalancedSquad('Faible', 30, 0.85);
const veterans = createVeteranSquad('Vet', 40, 1);
const rookies = createRookieSquad('Rook', 50, 1);

const scenarios = [
  runScenario('Équipes égales — sans cartes', {
    slotANinjas: squadA,
    slotBNinjas: squadB,
    slotACards: null,
    slotBCards: null,
  }, runs),
  runScenario('Équipes égales — cartes starter des deux côtés', {
    slotANinjas: squadA,
    slotBNinjas: squadB,
    slotACards: STARTER_LOADOUT,
    slotBCards: STARTER_LOADOUT,
  }, runs),
  runScenario('Équipes égales — starter vs rares', {
    slotANinjas: squadA,
    slotBNinjas: squadB,
    slotACards: STARTER_LOADOUT,
    slotBCards: RARE_LOADOUT,
    favoriteSide: 'slotB',
  }, runs),
  runScenario('Équipes égales — loadout mixte vs sans cartes', {
    slotANinjas: squadA,
    slotBNinjas: squadB,
    slotACards: MIXED_LOADOUT,
    slotBCards: null,
  }, runs),
  runScenario('Favori +15% — sans cartes (référence)', {
    slotANinjas: squadStrong,
    slotBNinjas: squadWeak,
    slotACards: null,
    slotBCards: null,
    favoriteSide: 'slotA',
  }, runs),
  runScenario('Favori +15% vs underdog — underdog avec cartes rares', {
    slotANinjas: squadStrong,
    slotBNinjas: squadWeak,
    slotACards: null,
    slotBCards: RARE_LOADOUT,
    favoriteSide: 'slotA',
  }, runs),
  runScenario('Underdog +15% cartes rares vs favori nu', {
    slotANinjas: squadWeak,
    slotBNinjas: squadStrong,
    slotACards: RARE_LOADOUT,
    slotBCards: null,
    favoriteSide: 'slotB',
  }, runs),
  runScenario('Vétérans (Jounin/Chunin) vs rookies (Genin) — puissance proche', {
    slotANinjas: veterans,
    slotBNinjas: rookies,
    slotACards: RARE_LOADOUT,
    slotBCards: STARTER_LOADOUT,
    favoriteSide: 'slotA',
  }, runs),
  runScenario('Symétrique Offensive/Tank/Protect — cartes alignées rôles', {
    slotANinjas: squadA,
    slotBNinjas: squadB,
    slotACards: ['nin-eclair-discret', 'tai-parade-ecole', 'med-pansement-rapide'],
    slotBCards: ['raiton-surcharge', 'gen-kage-bunshin', 'med-soin-zone'],
  }, runs),
];

console.log('\n── Assertions de sanité ──');
let allOk = true;
for (const { label, data, hasCards } of scenarios) {
  const issues = [];
  if (data.errors > 0) issues.push(`${data.errors} crash(s)`);
  if (hasCards && data.matchProcPct < 5) {
    issues.push(`taux proc trop bas (${data.matchProcPct}%)`);
  }
  const maxWin = Math.max(data.slotAWinPct, data.slotBWinPct);
  if (maxWin > 80 && data.drawPct < 3) {
    issues.push(`déséquilibre extrême (${maxWin}% win)`);
  }
  const mark = issues.length ? '✗' : '✓';
  console.log(`  ${mark} ${label}: ${issues.length ? issues.join(', ') : 'OK'}`);
  if (issues.length) allOk = false;
}

console.log('\n── Interprétation ──');
console.log('  • Équipes égales : viser ~45–55 % win par slot (hors nuls ~5–15 %).');
console.log('  • Cartes : proc attendu sur une partie significative des matchs (>5 %).');
console.log('  • Underdog carté : win% slot faible devrait monter vs favori nu si les cartes compensent.');
console.log(`\n${allOk ? '✅ Benchmark cartes tactiques : système stable.' : '⚠️  Anomalies détectées — voir scénarios ci-dessus.'}\n`);

process.exit(allOk ? 0 : 1);
