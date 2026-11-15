/**
 * Tests d’équilibrage combat PvE (déterministes, sans DB).
 *
 *   npm run test:combat-balance --prefix backend
 *   npm run test:combat-balance:report --prefix backend
 *   npm run test:combat-balance --prefix backend -- --strict
 *
 * Mode CI : hard-fail sur planchers de régression + ordre de difficulté.
 * Soft (trop trivial) : warning ; fail seulement avec --strict.
 * Mode rapport (--report) : tableau lisible, exit 0 sauf erreur fatale.
 *
 * @see docs/COMBAT_BALANCE_TESTS.md
 */
import {
  BALANCE_ENCOUNTERS,
  BALANCE_PROFILES,
  BALANCE_SIM,
  BALANCE_THRESHOLDS,
  DESIGN_WINRATE_TARGETS,
  PLAYER_POLICY,
} from '../src/config/combatBalanceConfig.js';
import {
  aggregateFights,
  createSeededRng,
  simulateCombat,
} from '../src/services/deckCombat/combatBalanceSim.js';

const args = process.argv.slice(2);
const REPORT = args.includes('--report') || process.env.COMBAT_BALANCE_REPORT === '1';
const STRICT = args.includes('--strict') || process.env.COMBAT_BALANCE_STRICT === '1';
const VERBOSE = args.includes('--verbose');

let passed = 0;
let failed = 0;
let softFailed = 0;
const failures = [];
const softFailures = [];

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    if (VERBOSE) console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

function softAssert(cond, msg) {
  if (cond) {
    passed += 1;
    if (VERBOSE) console.log(`  ✓ ${msg}`);
    return;
  }
  softFailed += 1;
  softFailures.push(msg);
  if (STRICT) {
    failed += 1;
    failures.push(`[strict] ${msg}`);
    console.error(`  ✗ [strict] ${msg}`);
  } else {
    console.warn(`  ⚠ ${msg}`);
  }
}

function pct(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

function checkThresholds(row, rank, profileId) {
  const thresholds = BALANCE_THRESHOLDS[rank]?.[profileId];
  if (!thresholds) return;

  const label = `${profileId} vs ${row.templateId} (${rank})`;

  if (thresholds.winRateMin != null) {
    assert(
      row.winRate + 1e-9 >= thresholds.winRateMin,
      `${label}: winRate ${pct(row.winRate)} ≥ ${pct(thresholds.winRateMin)} (hard)`,
    );
  }
  if (thresholds.winRateMaxSoft != null) {
    softAssert(
      row.winRate - 1e-9 <= thresholds.winRateMaxSoft,
      `${label}: winRate ${pct(row.winRate)} ≤ ${pct(thresholds.winRateMaxSoft)} (soft/design)`,
    );
  }
  if (thresholds.avgTurnsMin != null) {
    softAssert(
      row.avgTurns + 1e-9 >= thresholds.avgTurnsMin,
      `${label}: avgTurns ${fmt(row.avgTurns)} ≥ ${thresholds.avgTurnsMin} (soft)`,
    );
  }
  if (thresholds.avgTurnsMax != null) {
    assert(
      row.avgTurns <= thresholds.avgTurnsMax,
      `${label}: avgTurns ${fmt(row.avgTurns)} ≤ ${thresholds.avgTurnsMax} (hard)`,
    );
  }
  if (thresholds.avgDamageTakenMinSoft != null) {
    softAssert(
      row.avgDamageTaken + 1e-9 >= thresholds.avgDamageTakenMinSoft,
      `${label}: avgDamageTaken ${fmt(row.avgDamageTaken)} ≥ ${thresholds.avgDamageTakenMinSoft} (soft/design)`,
    );
  }
}

function printReportTable(rows) {
  console.log('\n┌────────────────────┬──────────┬──────┬─────────┬────────┬──────────┬──────────┐');
  console.log(
    '│ Encounter          │ Profile  │ Rank │ WinRate │ Turns  │ HP@win   │ DmgTaken │',
  );
  console.log('├────────────────────┼──────────┼──────┼─────────┼────────┼──────────┼──────────┤');
  for (const r of rows) {
    const name = r.templateId.padEnd(18).slice(0, 18);
    const prof = r.profileId.padEnd(8).slice(0, 8);
    console.log(
      `│ ${name} │ ${prof} │ ${r.rank.padEnd(4)} │ ${pct(r.winRate).padStart(7)} │ ${fmt(r.avgTurns).padStart(6)} │ ${fmt(r.avgHpRemainingOnWin).padStart(8)} │ ${fmt(r.avgDamageTaken).padStart(8)} │`,
    );
  }
  console.log('└────────────────────┴──────────┴──────┴─────────┴────────┴──────────┴──────────┘');
}

function mean(list, key) {
  if (!list.length) return 0;
  return list.reduce((s, x) => s + (Number(x[key]) || 0), 0) / list.length;
}

// --- Smoke déterminisme ---
console.log('=== Combat balance — smoke déterminisme ===');
{
  const a = simulateCombat({
    profileId: 'beginner',
    templateId: 'ronin_bandit',
    seed: 42,
    maxTurns: BALANCE_SIM.maxTurns,
  });
  const b = simulateCombat({
    profileId: 'beginner',
    templateId: 'ronin_bandit',
    seed: 42,
    maxTurns: BALANCE_SIM.maxTurns,
  });
  assert(a.outcome === b.outcome, `même seed → même outcome (${a.outcome})`);
  assert(a.turns === b.turns, `même seed → mêmes tours (${a.turns})`);
  assert(a.hpRemaining === b.hpRemaining, `même seed → même HP restant (${a.hpRemaining})`);
  assert(a.damageTaken === b.damageTaken, `même seed → même dégâts reçus (${a.damageTaken})`);

  const rng = createSeededRng(1);
  const seq = [rng(), rng(), rng()];
  const rng2 = createSeededRng(1);
  assert(
    seq[0] === rng2() && seq[1] === rng2() && seq[2] === rng2(),
    'createSeededRng reproductible',
  );
}

console.log(`\nPolitique joueur : ${PLAYER_POLICY.id}`);
console.log(`  ${PLAYER_POLICY.summary}`);
if (STRICT) console.log('Mode --strict : soft/design → hard fail');

const fightsPerCell = REPORT ? BALANCE_SIM.reportFightsPerCell : BALANCE_SIM.fightsPerCell;
const profileIds = Object.keys(BALANCE_PROFILES);

console.log(
  `\n=== Matrice ${fightsPerCell} fights/cellule × ${BALANCE_ENCOUNTERS.length} encounters × ${profileIds.length} profils ===`,
);

const rows = [];
for (const enc of BALANCE_ENCOUNTERS) {
  for (const profileId of profileIds) {
    if (!REPORT && enc.rank === 'A' && profileId === 'beginner') continue;
    if (!REPORT && enc.rank === 'B' && profileId === 'beginner') continue;

    const agg = aggregateFights({
      profileId,
      templateId: enc.templateId,
      difficulty: enc.difficulty,
      baseSeed: BALANCE_SIM.baseSeed,
      count: fightsPerCell,
      maxTurns: BALANCE_SIM.maxTurns,
    });
    const row = { ...agg, rank: enc.rank };
    rows.push(row);

    if (!REPORT) {
      checkThresholds(row, enc.rank, profileId);
    } else if (VERBOSE) {
      console.log(
        `  ${profileId.padEnd(8)} ${enc.templateId.padEnd(20)} ${enc.rank}  WR=${pct(agg.winRate)}  T=${fmt(agg.avgTurns)}  HP=${fmt(agg.avgHpRemainingOnWin)}  DMG=${fmt(agg.avgDamageTaken)}`,
      );
    }
  }
}

// Agrégats par rang × profil
console.log('\n=== Agrégats par rang × profil ===');
const byRankProfile = new Map();
for (const r of rows) {
  const key = `${r.rank}|${r.profileId}`;
  if (!byRankProfile.has(key)) byRankProfile.set(key, []);
  byRankProfile.get(key).push(r);
}

const aggregates = {};
for (const [key, list] of byRankProfile) {
  const [rank, profileId] = key.split('|');
  const agg = {
    rank,
    profileId,
    templateId: `rank:${rank}`,
    winRate: mean(list, 'winRate'),
    avgTurns: mean(list, 'avgTurns'),
    avgHpRemainingOnWin: mean(list, 'avgHpRemainingOnWin'),
    avgDamageTaken: mean(list, 'avgDamageTaken'),
  };
  aggregates[key] = agg;
  console.log(
    `  Rang ${rank} / ${profileId.padEnd(8)}  WR=${pct(agg.winRate)}  turns=${fmt(agg.avgTurns)}  hp@win=${fmt(agg.avgHpRemainingOnWin)}  dmg=${fmt(agg.avgDamageTaken)}`,
  );

  if (!REPORT) {
    checkThresholds(agg, rank, profileId);

    const design = DESIGN_WINRATE_TARGETS[rank]?.[profileId];
    if (design) {
      softAssert(
        agg.winRate + 1e-9 >= design.min && agg.winRate - 1e-9 <= design.max,
        `design target ${profileId}@${rank}: WR ${pct(agg.winRate)} in [${pct(design.min)}–${pct(design.max)}]`,
      );
    }
  }
}

// Ordre de difficulté (régression structurelle)
if (!REPORT) {
  console.log('\n=== Ordre de difficulté ===');
  const get = (rank, profile) => aggregates[`${rank}|${profile}`];

  const begD = get('D', 'beginner');
  const begC = get('C', 'beginner');
  const midD = get('D', 'mid');
  const midA = get('A', 'mid');
  const strongD = get('D', 'strong');
  const strongA = get('A', 'strong');

  if (begD && begC) {
    assert(
      begC.avgTurns >= begD.avgTurns - 0.05,
      `beginner: tours C (${fmt(begC.avgTurns)}) ≥ D (${fmt(begD.avgTurns)})`,
    );
    assert(
      begC.avgDamageTaken >= begD.avgDamageTaken - 0.05,
      `beginner: dmg C (${fmt(begC.avgDamageTaken)}) ≥ D (${fmt(begD.avgDamageTaken)})`,
    );
  }
  if (midD && midA) {
    assert(
      midA.avgTurns >= midD.avgTurns - 0.05,
      `mid: tours A (${fmt(midA.avgTurns)}) ≥ D (${fmt(midD.avgTurns)})`,
    );
    assert(
      midA.avgDamageTaken >= midD.avgDamageTaken - 0.05,
      `mid: dmg A (${fmt(midA.avgDamageTaken)}) ≥ D (${fmt(midD.avgDamageTaken)})`,
    );
  }
  if (strongD && strongA) {
    assert(
      strongA.avgTurns >= strongD.avgTurns - 0.05,
      `strong: tours A (${fmt(strongA.avgTurns)}) ≥ D (${fmt(strongD.avgTurns)})`,
    );
  }
  if (begD && midD && strongD) {
    assert(
      midD.avgTurns <= begD.avgTurns + 0.05,
      `rang D: mid tours (${fmt(midD.avgTurns)}) ≤ beginner (${fmt(begD.avgTurns)})`,
    );
    assert(
      strongD.avgTurns <= midD.avgTurns + 0.05,
      `rang D: strong tours (${fmt(strongD.avgTurns)}) ≤ mid (${fmt(midD.avgTurns)})`,
    );
  }
  if (midA && strongA) {
    assert(
      strongA.avgTurns <= midA.avgTurns + 0.05,
      `rang A: strong tours (${fmt(strongA.avgTurns)}) ≤ mid (${fmt(midA.avgTurns)})`,
    );
  }
}

if (REPORT) {
  printReportTable(rows);
  console.log('\nCibles design (win rate) :');
  for (const [rank, profiles] of Object.entries(DESIGN_WINRATE_TARGETS)) {
    for (const [profileId, band] of Object.entries(profiles)) {
      const agg = aggregates[`${rank}|${profileId}`];
      const actual = agg ? pct(agg.winRate) : 'n/a';
      const ok =
        agg && agg.winRate + 1e-9 >= band.min && agg.winRate - 1e-9 <= band.max;
      console.log(
        `  ${rank}/${profileId}: cible [${pct(band.min)}–${pct(band.max)}]  actuel ${actual}  ${ok ? 'OK' : 'HORS CIBLE'}`,
      );
    }
  }
  console.log('\n(Mode rapport — pas de fail sur seuils)');
  console.log(`\n✅ Rapport combat-balance généré (${rows.length} cellules).`);
  process.exit(0);
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed, ${softFailed} soft ===`);
if (softFailures.length && !STRICT) {
  console.warn('\nHors balance (soft/design) — retune templates ou `npm run test:combat-balance -- --strict` :');
  for (const f of softFailures) console.warn(`  - ${f}`);
}
if (failed > 0) {
  console.error('\nÉchecs hard / strict :');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ testCombatBalance passed');
