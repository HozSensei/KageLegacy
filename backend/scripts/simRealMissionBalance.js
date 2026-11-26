/**
 * Simule des missions réelles avec un deck JSON exporté.
 *
 *   npm run sim:real-mission-balance --prefix backend -- --deck ./path/to/deck.json
 *   npm run sim:real-mission-balance --prefix backend -- --deck deck.json --branch ninjutsu --profile moyen
 *   npm run sim:real-mission-balance --prefix backend -- --deck deck.json --report --runs 40
 *
 * Admin UI : onglet « Simulation / équilibrage » (même moteur).
 *
 * Pistes design (non live) : +5 max deck/rang ; +PV/niveau.
 *
 * @see docs/TESTING.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  REAL_MISSION_BRANCHES,
  REAL_MISSION_RANKS,
  REAL_MISSION_SIM,
  REAL_MISSION_STRENGTHS,
} from '../src/config/realMissionBalanceProfiles.js';
import { parseDeckExport } from '../src/services/deckExportService.js';
import { runRealMissionBalanceSim } from '../src/services/realMissionBalanceService.js';
import { serializeCardDefinition } from '../src/services/cardService.js';
import { ALL_CARDS } from './seedCards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function usage(exitCode = 1) {
  console.log(`Usage:
  node scripts/simRealMissionBalance.js --deck <fichier.json> [options]

Options:
  --deck <path>       Export JSON admin (schema kage-deck-export v1) — requis
  --branch <voie>     taijutsu|ninjutsu|genjutsu|medicine (défaut: auto depuis deck)
  --profile <ids>     faible,moyen,haut (défaut: tous)
  --rank <ranks>      D,C,B,A (défaut: tous)
  --runs <n>          Runs par cellule (défaut: ${REAL_MISSION_SIM.runsPerCell})
  --seed <n>          Seed de base (défaut: ${REAL_MISSION_SIM.baseSeed})
  --hard              Mode difficile
  --report            Plus de runs (${REAL_MISSION_SIM.reportRunsPerCell})
  --json              Sortie JSON brute
  --help              Aide
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = {
    deckPath: null,
    branch: null,
    strengths: [...REAL_MISSION_STRENGTHS],
    ranks: [...REAL_MISSION_RANKS],
    runs: null,
    seed: REAL_MISSION_SIM.baseSeed,
    hardMode: false,
    report: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--deck') out.deckPath = argv[++i];
    else if (a === '--branch') out.branch = String(argv[++i] || '').trim().toLowerCase();
    else if (a === '--profile' || a === '--profiles') {
      out.strengths = String(argv[++i] || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (a === '--rank' || a === '--ranks') {
      out.ranks = String(argv[++i] || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
    } else if (a === '--runs') out.runs = Number(argv[++i]);
    else if (a === '--seed') out.seed = Number(argv[++i]) >>> 0;
    else if (a === '--hard') out.hardMode = true;
    else if (a === '--report') out.report = true;
    else if (a === '--json') out.json = true;
    else {
      console.error(`Option inconnue: ${a}`);
      usage(1);
    }
  }
  return out;
}

function serializeSeedCard(seed, upgradeLevel = 0) {
  return serializeCardDefinition(
    {
      id: seed.slug,
      slug: seed.slug,
      name_fr: seed.name_fr ?? seed.nameFr,
      name_en: seed.name_en ?? seed.nameEn,
      type: seed.type,
      stat_type: seed.stat_type ?? seed.statType ?? null,
      element: seed.element ?? null,
      rarity: seed.rarity,
      base_cost: seed.base_cost ?? seed.baseCost ?? 0,
      base_damage: seed.base_damage ?? seed.baseDamage ?? 0,
      base_block: seed.base_block ?? seed.baseBlock ?? 0,
      base_heal: seed.base_heal ?? seed.baseHeal ?? 0,
      effects_json: seed.effects_json ?? seed.effects ?? [],
      held_effect_json: seed.held_effect_json ?? seed.heldEffect ?? null,
      summon_json: seed.summon_json ?? seed.summon ?? null,
      exhaust: seed.exhaust ? 1 : 0,
      passive_bonus_json: seed.passive_bonus_json ?? seed.passiveBonus ?? {},
      upgrade_bonuses_json: seed.upgrade_bonuses_json ?? seed.upgradeBonuses ?? {},
      upgradable: seed.upgradable === false ? 0 : 1,
      description_fr: seed.description_fr ?? seed.descriptionFr,
      description_en: seed.description_en ?? seed.descriptionEn,
      passive_description_fr: seed.passive_description_fr ?? seed.passiveDescriptionFr,
      passive_description_en: seed.passive_description_en ?? seed.passiveDescriptionEn,
      image_url: seed.image_url ?? seed.imageUrl ?? null,
    },
    { upgradeLevel },
  );
}

function resolveDeckEntries(parsed) {
  const catalog = new Map();
  for (const seed of ALL_CARDS) {
    if (!catalog.has(seed.slug)) catalog.set(seed.slug, seed);
  }
  const entries = [];
  const missing = [];
  for (const row of parsed.cards) {
    const seed = catalog.get(row.slug);
    if (!seed) {
      missing.push(row.slug);
      continue;
    }
    entries.push({
      quantity: row.quantity,
      card: serializeSeedCard(seed, row.upgradeLevel),
    });
  }
  if (missing.length) {
    throw new Error(`Slugs absents du catalogue seed: ${[...new Set(missing)].join(', ')}`);
  }
  return entries;
}

function pct(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

function verdict(clearanceRate) {
  if (clearanceRate >= 0.7) return 'souvent réussissable';
  if (clearanceRate >= 0.35) return 'mitigé';
  if (clearanceRate >= 0.1) return 'difficile';
  return 'quasi injouable (bot greedy)';
}

const args = parseArgs(process.argv.slice(2));
if (!args.deckPath) {
  console.error('Erreur: --deck <fichier.json> est requis.');
  usage(1);
}
if (args.branch && !REAL_MISSION_BRANCHES.includes(args.branch)) {
  console.error(`Voie inconnue: ${args.branch}. Valides: ${REAL_MISSION_BRANCHES.join(', ')}`);
  process.exit(1);
}
for (const id of args.strengths) {
  if (!REAL_MISSION_STRENGTHS.includes(id)) {
    console.error(`Profil inconnu: ${id}. Valides: ${REAL_MISSION_STRENGTHS.join(', ')}`);
    process.exit(1);
  }
}

const absDeck = path.isAbsolute(args.deckPath)
  ? args.deckPath
  : path.resolve(process.cwd(), args.deckPath);
const raw = fs.readFileSync(absDeck, 'utf8');
const parsed = parseDeckExport(raw);
const entries = resolveDeckEntries(parsed);
const runsPerCell =
  args.runs ??
  (args.report ? REAL_MISSION_SIM.reportRunsPerCell : REAL_MISSION_SIM.runsPerCell);

const result = runRealMissionBalanceSim({
  deckEntries: entries,
  branch: args.branch,
  strengths: args.strengths,
  ranks: args.ranks,
  runs: runsPerCell,
  hardMode: args.hardMode,
  seed: args.seed,
});

console.log('=== Sim missions réelles × deck exporté ===');
console.log(`Deck: ${absDeck}`);
if (parsed.meta?.player?.username || parsed.meta?.deck?.name) {
  console.log(
    `  joueur=${parsed.meta.player?.username || '—'}  deck=${parsed.meta.deck?.name || '—'}  size=${result.deck.size}`,
  );
}
console.log(
  `  validation: ${result.deck.validation.valid ? 'OK' : 'INVALIDE'} (${result.deck.validation.errors?.join('; ') || 'aucune erreur'})`,
);
console.log(
  `Voie: ${result.branch}${result.branchAuto ? ' (auto)' : ''}  arts=${JSON.stringify(result.inferred.counts)}`,
);
console.log(
  `Profils: ${args.strengths.join(', ')}  |  Rangs: ${args.ranks.join(', ')}  |  runs/cellule: ${runsPerCell}${args.hardMode ? '  |  HARD' : ''}`,
);
console.log(
  'Note: bot greedy ≠ joueur humain. Pistes design non live: +5 max deck/rang ; +PV/niveau.',
);

for (const row of result.rows) {
  console.log(
    `  ${row.strength}@${row.rank}  clear=${pct(row.clearanceRate)}  → ${verdict(row.clearanceRate)}  fights=${fmt(row.avgCombatsCleared)}/${fmt(row.avgCombatsAttempted)}  hp@end=${fmt(row.avgHpAtEnd)}`,
  );
}

console.log(
  '\n┌──────────────┬──────┬───────────┬──────────┬───────────┐',
);
console.log('│ Profile      │ Rank │ Clearance │ Combats  │ HP@end    │');
console.log('├──────────────┼──────┼───────────┼──────────┼───────────┤');
for (const r of result.rows) {
  const label = `${r.strength}`.padEnd(12).slice(0, 12);
  const fights = `${fmt(r.avgCombatsCleared)}/${fmt(r.avgCombatsAttempted)}`;
  console.log(
    `│ ${label} │ ${String(r.rank).padEnd(4)} │ ${pct(r.clearanceRate).padStart(9)} │ ${fights.padStart(8)} │ ${fmt(r.avgHpAtEnd).padStart(9)} │`,
  );
}
console.log('└──────────────┴──────┴───────────┴──────────┴───────────┘');

if (args.json) {
  console.log('\n' + JSON.stringify({ deck: absDeck, meta: parsed.meta, ...result }, null, 2));
}

console.log(`\n✅ ${result.rows.length} cellules simulées (simRealMissionBalance / ${__dirname}).`);
