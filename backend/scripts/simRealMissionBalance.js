/**
 * Simule des missions réelles (parcours branchés, PV persistants) avec un deck
 * JSON exporté depuis l’admin, croisé avec des profils talents types.
 *
 *   npm run sim:real-mission-balance --prefix backend -- --deck ./path/to/deck.json
 *   npm run sim:real-mission-balance --prefix backend -- --deck deck.json --profile moyen --rank D,C
 *   npm run sim:real-mission-balance --prefix backend -- --deck deck.json --report --runs 40
 *
 * Réutilise combatBalanceSim.aggregateMissionRuns (même politique greedy que
 * test:combat-balance). Sans DB : les cartes sont résolues via le catalogue seed.
 *
 * Pistes design (non live) — voir aussi realMissionBalanceProfiles.js :
 * - +5 cartes max deck par rang gagné
 * - +PV à chaque montée de niveau (aujourd’hui aucune stat auto au level-up)
 *
 * @see docs/TESTING.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  REAL_MISSION_PROFILES,
  REAL_MISSION_RANKS,
  REAL_MISSION_SIM,
} from '../src/config/realMissionBalanceProfiles.js';
import { parseDeckExport } from '../src/services/deckExportService.js';
import { aggregateMissionRuns } from '../src/services/deckCombat/combatBalanceSim.js';
import { createEmptyPassiveStats, validateDeck } from '../src/services/deckService.js';
import { serializeCardDefinition } from '../src/services/cardService.js';
import { mergeStatBonuses } from '../src/services/playerCharacterService.js';
import { ALL_CARDS } from './seedCards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function usage(exitCode = 1) {
  console.log(`Usage:
  node scripts/simRealMissionBalance.js --deck <fichier.json> [options]

Options:
  --deck <path>       Export JSON admin (schema kage-deck-export v1) — requis
  --profile <ids>     faible,moyen,haut (défaut: tous)
  --rank <ranks>      D,C,B,A (défaut: tous)
  --runs <n>          Runs par cellule (défaut: ${REAL_MISSION_SIM.runsPerCell})
  --seed <n>          Seed de base (défaut: ${REAL_MISSION_SIM.baseSeed})
  --hard              Mode difficile
  --report            Plus de runs (${REAL_MISSION_SIM.reportRunsPerCell}) + tableau détaillé
  --json              Sortie JSON brute en plus du tableau
  --help              Aide
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = {
    deckPath: null,
    profiles: Object.keys(REAL_MISSION_PROFILES),
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
    else if (a === '--profile' || a === '--profiles') {
      out.profiles = String(argv[++i] || '')
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

function cardsBySlug() {
  const map = new Map();
  for (const seed of ALL_CARDS) {
    if (!map.has(seed.slug)) map.set(seed.slug, seed);
  }
  return map;
}

/**
 * Transforme l’export JSON en entrées deck pour combatBalanceSim + passifs.
 */
function resolveDeckEntries(parsed) {
  const catalog = cardsBySlug();
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

function deckPassiveStats(entries) {
  const deckKeys = Object.keys(createEmptyPassiveStats());
  const bonuses = entries.flatMap(entry =>
    Array.from({ length: entry.quantity }, () =>
      Object.fromEntries(deckKeys.map(key => [key, entry.card.passiveBonus?.[key] || 0])),
    ),
  );
  return mergeStatBonuses(...bonuses);
}

function buildSimProfile(profileId, deckPassives) {
  const base = REAL_MISSION_PROFILES[profileId];
  if (!base) throw new Error(`Profil inconnu: ${profileId}`);
  return {
    id: base.id,
    label: base.label,
    level: base.level,
    stats: mergeStatBonuses(base.stats, deckPassives),
    talentCodes: [...base.talentCodes],
    deck: 'exported',
    deckUpgradeLevel: 0,
  };
}

function pct(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmt(n, digits = 1) {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

function printTable(rows) {
  console.log(
    '\n┌──────────┬──────┬───────────┬──────────┬───────────┬──────────┐',
  );
  console.log('│ Profile  │ Rank │ Clearance │ Combats  │ HP@end    │ Hard?    │');
  console.log('├──────────┼──────┼───────────┼──────────┼───────────┼──────────┤');
  for (const r of rows) {
    const fights = `${fmt(r.avgCombatsCleared)}/${fmt(r.avgCombatsAttempted)}`;
    console.log(
      `│ ${r.profileId.padEnd(8).slice(0, 8)} │ ${String(r.rank).padEnd(4)} │ ${pct(r.clearanceRate).padStart(9)} │ ${fights.padStart(8)} │ ${fmt(r.avgHpAtEnd).padStart(9)} │ ${r.hardMode ? 'yes' : 'no '}      │`,
    );
  }
  console.log('└──────────┴──────┴───────────┴──────────┴───────────┴──────────┘');
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

for (const id of args.profiles) {
  if (!REAL_MISSION_PROFILES[id]) {
    console.error(`Profil inconnu: ${id}. Valides: ${Object.keys(REAL_MISSION_PROFILES).join(', ')}`);
    process.exit(1);
  }
}
for (const rank of args.ranks) {
  if (!REAL_MISSION_RANKS.includes(rank)) {
    console.error(`Rang inconnu: ${rank}. Valides: ${REAL_MISSION_RANKS.join(', ')}`);
    process.exit(1);
  }
}

const absDeck = path.isAbsolute(args.deckPath)
  ? args.deckPath
  : path.resolve(process.cwd(), args.deckPath);
const raw = fs.readFileSync(absDeck, 'utf8');
const parsed = parseDeckExport(raw);
const entries = resolveDeckEntries(parsed);
const validation = validateDeck(entries);
const deckPassives = deckPassiveStats(entries);
const runsPerCell =
  args.runs ??
  (args.report ? REAL_MISSION_SIM.reportRunsPerCell : REAL_MISSION_SIM.runsPerCell);

console.log('=== Sim missions réelles × deck exporté ===');
console.log(`Deck: ${absDeck}`);
if (parsed.meta?.player?.username || parsed.meta?.deck?.name) {
  console.log(
    `  joueur=${parsed.meta.player?.username || '—'}  deck=${parsed.meta.deck?.name || '—'}  size=${entries.reduce((s, e) => s + e.quantity, 0)}`,
  );
}
console.log(
  `  validation: ${validation.valid ? 'OK' : 'INVALIDE'} (${validation.errors?.join('; ') || 'aucune erreur'})`,
);
if (!validation.valid) {
  console.warn(
    '  ⚠ Deck hors contraintes live (20–30, copies, arts…) — la sim tourne quand même pour le diagnostic.',
  );
}
console.log(
  `Profils: ${args.profiles.join(', ')}  |  Rangs: ${args.ranks.join(', ')}  |  runs/cellule: ${runsPerCell}${args.hardMode ? '  |  HARD' : ''}`,
);
console.log(
  'Note: bot greedy ≠ joueur humain. Pistes design non live: +5 max deck/rang ; +PV/niveau.',
);

const rows = [];
for (const profileId of args.profiles) {
  const profile = buildSimProfile(profileId, deckPassives);
  console.log(
    `\n── ${profile.label}  talents=[${profile.talentCodes.join(', ') || 'aucun'}]  stats.tai=${profile.stats.taijutsu} maxHp+=${profile.stats.maxHp}`,
  );
  for (const rank of args.ranks) {
    const agg = aggregateMissionRuns({
      rank,
      profileId,
      baseSeed: (args.seed ^ (profileId.charCodeAt(0) << 8) ^ rank.charCodeAt(0)) >>> 0,
      count: runsPerCell,
      hardMode: args.hardMode,
      maxTurns: REAL_MISSION_SIM.maxTurns,
      profileOverride: profile,
      deckEntries: entries,
    });
    const row = { ...agg, label: profile.label };
    rows.push(row);
    console.log(
      `  @${rank}  clear=${pct(agg.clearanceRate)}  → ${verdict(agg.clearanceRate)}  fights=${fmt(agg.avgCombatsCleared)}/${fmt(agg.avgCombatsAttempted)}  hp@end=${fmt(agg.avgHpAtEnd)}`,
    );
  }
}

printTable(rows);

if (args.json) {
  console.log(
    '\n' +
      JSON.stringify(
        {
          deck: absDeck,
          meta: parsed.meta,
          validation,
          runsPerCell,
          hardMode: args.hardMode,
          rows,
        },
        null,
        2,
      ),
  );
}

console.log(`\n✅ ${rows.length} cellules simulées (${__dirname.includes('scripts') ? 'simRealMissionBalance' : 'ok'}).`);
