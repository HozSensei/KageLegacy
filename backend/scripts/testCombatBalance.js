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
 * @see docs/TESTING.md
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
  createSimSession,
  simEndTurn,
  simulateCombat,
} from '../src/services/deckCombat/combatBalanceSim.js';
import { createEmptyPassiveStats, validateDeck } from '../src/services/deckService.js';
import { serializeCardDefinition } from '../src/services/cardService.js';
import {
  getStarterGrantQuantity,
  selectStarterDeckEntries,
  STARTER_CARD_SLUGS,
} from '../src/config/starterLoadout.js';
import { mergeStatBonuses, rankForLevel } from '../src/services/playerCharacterService.js';
import { ALL_CARDS } from './seedCards.js';

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
      `${label}: winRate ${pct(row.winRate)} ≥ ${pct(thresholds.winRateMin)} (hard)`
    );
  }
  if (thresholds.winRateMaxSoft != null) {
    softAssert(
      row.winRate - 1e-9 <= thresholds.winRateMaxSoft,
      `${label}: winRate ${pct(row.winRate)} ≤ ${pct(thresholds.winRateMaxSoft)} (soft/design)`
    );
  }
  if (thresholds.avgTurnsMin != null) {
    softAssert(
      row.avgTurns + 1e-9 >= thresholds.avgTurnsMin,
      `${label}: avgTurns ${fmt(row.avgTurns)} ≥ ${thresholds.avgTurnsMin} (soft)`
    );
  }
  if (thresholds.avgTurnsMax != null) {
    assert(
      row.avgTurns <= thresholds.avgTurnsMax,
      `${label}: avgTurns ${fmt(row.avgTurns)} ≤ ${thresholds.avgTurnsMax} (hard)`
    );
  }
  if (thresholds.avgDamageTakenMinSoft != null) {
    softAssert(
      row.avgDamageTaken + 1e-9 >= thresholds.avgDamageTakenMinSoft,
      `${label}: avgDamageTaken ${fmt(row.avgDamageTaken)} ≥ ${thresholds.avgDamageTakenMinSoft} (soft/design)`
    );
  }
}

function printReportTable(rows) {
  console.log(
    '\n┌────────────────────┬──────────┬──────┬─────────┬────────┬──────────┬──────────┐'
  );
  console.log('│ Encounter          │ Profile  │ Rank │ WinRate │ Turns  │ HP@win   │ DmgTaken │');
  console.log('├────────────────────┼──────────┼──────┼─────────┼────────┼──────────┼──────────┤');
  for (const r of rows) {
    const name = r.templateId.padEnd(18).slice(0, 18);
    const prof = r.profileId.padEnd(8).slice(0, 8);
    console.log(
      `│ ${name} │ ${prof} │ ${r.rank.padEnd(4)} │ ${pct(r.winRate).padStart(7)} │ ${fmt(r.avgTurns).padStart(6)} │ ${fmt(r.avgHpRemainingOnWin).padStart(8)} │ ${fmt(r.avgDamageTaken).padStart(8)} │`
    );
  }
  console.log('└────────────────────┴──────────┴──────┴─────────┴────────┴──────────┴──────────┘');
}

function mean(list, key) {
  if (!list.length) return 0;
  return list.reduce((s, x) => s + (Number(x[key]) || 0), 0) / list.length;
}

function meanHpOnWin(list) {
  const wins = list.reduce((sum, row) => sum + row.wins, 0);
  if (!wins) return null;
  return list.reduce((sum, row) => sum + (row.avgHpRemainingOnWin || 0) * row.wins, 0) / wins;
}

// Reconstitue les colonnes utilisées par upsertCardDefinition, puis laisse le
// sérialiseur de production appliquer les bonus de collection.
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
      summon_json: seed.summon_json ?? seed.summon ?? null,
      exhaust: seed.exhaust ? 1 : 0,
      passive_bonus_json: seed.passive_bonus_json ?? seed.passiveBonus ?? {},
      upgrade_bonuses_json: seed.upgrade_bonuses_json ?? seed.upgradeBonuses ?? {},
      upgradable: seed.upgradable === false ? 0 : 1,
      description_fr: seed.description_fr ?? seed.descriptionFr,
      description_en: seed.description_en ?? seed.descriptionEn,
    },
    { upgradeLevel }
  );
}

function starterStats(entries) {
  // getDeckPassiveBonuses filtre d'abord avec les clés de deckService ;
  // getComputedStats filtre ensuite avec celles de playerCharacterService.
  const deckKeys = Object.keys(createEmptyPassiveStats());
  const bonuses = entries.flatMap(entry =>
    Array.from({ length: entry.quantity }, () =>
      Object.fromEntries(deckKeys.map(key => [key, entry.card.passiveBonus[key] || 0]))
    )
  );
  return mergeStatBonuses(...bonuses);
}

function buildStarterFixture() {
  const collection = STARTER_CARD_SLUGS.map(slug => {
    const matches = ALL_CARDS.filter(card => card.slug === slug);
    if (matches.length !== 1)
      throw new Error(`Starter ${slug}: ${matches.length} définitions seed`);
    return { quantity: getStarterGrantQuantity(slug), card: serializeSeedCard(matches[0]) };
  });
  const entries = selectStarterDeckEntries(collection);
  return {
    entries,
    profile: {
      id: 'starter',
      label: 'Starter niveau 1',
      level: 1,
      stats: starterStats(entries),
      talentCodes: [],
      deck: 'starter',
      deckUpgradeLevel: 0,
    },
  };
}

// --- Profils de progression sans DB ---
console.log('=== Profils de progression ===');
{
  const expectedRanks = { beginner: 'Genin', mid: 'Chunin', strong: 'Jonin' };
  const expectedUpgradeLevels = { beginner: 0, mid: 1, strong: 2 };
  const expectedFistDamage = { beginner: 4, mid: 5, strong: 6 };

  for (const [profileId, profile] of Object.entries(BALANCE_PROFILES)) {
    const session = createSimSession({ profileId, seed: 7 });
    const fist = session.player.drawPile
      .concat(session.player.hand)
      .find(card => card.slug === 'practice-fist');

    assert(
      rankForLevel(profile.level) === expectedRanks[profileId],
      `${profileId}: niveau ${profile.level} → rang ${expectedRanks[profileId]}`
    );
    assert(
      session.deck === 'practice' && session.deckUpgradeLevel === expectedUpgradeLevels[profileId],
      `${profileId}: deck practice upgrade L${expectedUpgradeLevels[profileId]}`
    );
    assert(
      fist?.damage === expectedFistDamage[profileId],
      `${profileId}: upgrade de carte applique ${expectedFistDamage[profileId]} dégâts`
    );
    assert(
      session.talentEffects.applied.length === profile.talentCodes.length,
      `${profileId}: talents de profil appliqués`
    );
  }

  const [profileId, profile] = Object.entries(BALANCE_PROFILES)[0];
  const armorSession = createSimSession({
    profileId,
    profileOverride: {
      ...profile,
      stats: { ...profile.stats, maxChakra: 2, startingBlock: 4 },
    },
    deckEntries: [],
  });
  assert(armorSession.player.block === 4, 'starting armor is present at combat start');
  assert(armorSession.player.maxChakra === 5, 'max Chakra passive increases the reserve');
}

// --- Starter de collection, séparé du filet practice historique ---
console.log('\n=== Fixture starter niveau 1 ===');
const starter = buildStarterFixture();
{
  const validation = validateDeck(starter.entries);
  assert(validation.valid && validation.size === 22, 'starter : deck valide de 22 cartes');
  assert(
    validation.legendaryOrMythicCount === 2 && validation.clanCount === 0,
    'starter : limites de rareté et clan respectées'
  );
  assert(
    starter.entries.length === 18 &&
      starter.entries.every(
        entry =>
          entry.quantity === getStarterGrantQuantity(entry.card.slug) &&
          entry.card.upgradeLevel === 0
      ),
    'starter : exemplaires possédés au niveau L0'
  );
  assert(
    JSON.stringify(starter.profile.stats) ===
      JSON.stringify({
        // Remap Vit→art primaire / Int→secondaire|Gen (combatArts).
        taijutsu: 23,
        ninjutsu: 29,
        genjutsu: 18,
        medicine: 3,
        maxHp: 14,
        maxChakra: 0,
        startingBlock: 0,
      }),
    'starter : passifs filtrés et agrégés comme getComputedStats'
  );
  const bySlug = slug => starter.entries.find(entry => entry.card.slug === slug).card;
  assert(
    bySlug('barrage-de-lames').effects[0]?.hits === 3,
    'starter : effet multi-strike conservé'
  );
  assert(bySlug('clone-de-combat').summon?.hp === 20, 'starter : invocation du seed conservée');
  assert(
    bySlug('kunai-de-fer').exhaust && bySlug('ampoule-de-chakra').cost === 0,
    'starter : exhaust et coût conservés'
  );
  const fistSeed = ALL_CARDS.find(card => card.slug === 'poing-rapide');
  const fist1 = serializeSeedCard(fistSeed, 1);
  const fist2 = serializeSeedCard(fistSeed, 2);
  assert(
    fist1.damage === 9 && fist1.passiveBonus.taijutsu === 4,
    'starter seed : bonus L1 actifs et passifs'
  );
  assert(
    fist2.damage === 12 && fist2.cost === 0 && fist2.passiveBonus.taijutsu === 5,
    'starter seed : bonus L2 relatifs à la base'
  );
  const upgradedEntries = starter.entries.map(entry =>
    entry.card.slug === fistSeed.slug ? { ...entry, card: fist1 } : entry
  );
  assert(
    starterStats(upgradedEntries).taijutsu === starter.profile.stats.taijutsu + 2,
    'bonus passif L1 ajouté pour les deux exemplaires du deck'
  );
  const session = createSimSession({
    profileId: 'starter',
    profileOverride: starter.profile,
    deckEntries: starter.entries,
    seed: 7,
  });
  const runtime = [...session.player.hand, ...session.player.drawPile];
  assert(
    session.profileLevel === 1 &&
      session.profileRank === 'Aspirant ninja' &&
      session.talentEffects.applied.length === 0,
    'starter : niveau 1, Aspirant ninja, aucun talent'
  );
  assert(
    session.player.maxHp === 114 && session.player.maxChakra === 3,
    'starter : PV et chakra issus des passifs'
  );
  assert(
    runtime.length === 22 &&
      starter.entries.every(entry => {
        const card = runtime.find(c => c.slug === entry.card.slug);
        return (
          card &&
          [
            'type',
            'statType',
            'element',
            'rarity',
            'cost',
            'damage',
            'block',
            'heal',
            'exhaust',
            'upgradeLevel',
          ].every(key => card[key] === entry.card[key]) &&
          JSON.stringify(card.effects) === JSON.stringify(entry.card.effects) &&
          JSON.stringify(card.summon) === JSON.stringify(entry.card.summon)
        );
      }),
    'starter : toutes les cartes sérialisées arrivent intactes au runtime'
  );
}

// --- Métriques de simulation ---
console.log('\n=== Combat balance — métriques ===');
{
  const session = createSimSession({ seed: 7 });
  session.player.statuses = [
    { key: 'burn', value: 4, duration: 1 },
    { key: 'poison', value: 7, duration: 3 },
    { key: 'regen', value: 3, duration: 3 },
  ];
  session.enemy.intent = { type: 'defend', block: 1 };
  const ended = simEndTurn(session, session.rng).session;
  assert(ended.damageTakenTotal === 11, 'brûlure et poison comptés malgré la régénération');
  assert(ended.player.hp === 92, 'PV après brûlure, poison et régénération');

  const lethal = createSimSession({ seed: 7 });
  lethal.player.statuses = [{ key: 'burn', value: 200, duration: 1 }];
  const burned = simEndTurn(lethal, lethal.rng).session;
  assert(
    burned.state === 'defeat' && burned.damageTakenTotal === 100,
    'brûlure fatale plafonnée aux PV'
  );

  const timeout = simulateCombat({
    profileId: 'beginner',
    templateId: 'ronin_bandit',
    seed: 7,
    maxTurns: 1,
  });
  assert(timeout.timeout && timeout.turns === 1, 'timeout compté au dernier tour joué');
  const capped = createSimSession({ seed: 7 });
  capped.enemy.hp = 1;
  capped.enemy.intent = { type: 'defend', block: 1 };
  capped.player.ally = { hp: 10, attack: 100 };
  const cappedResult = simEndTurn(capped, capped.rng, 1).session;
  assert(
    cappedResult.timeout && cappedResult.enemy.hp === 1 && cappedResult.currentTurn === 1,
    'timeout avant les actions du tour suivant'
  );
  const noWins = aggregateFights({
    profileId: 'beginner',
    templateId: 'ronin_bandit',
    baseSeed: 7,
    count: 2,
    maxTurns: 1,
  });
  assert(
    noWins.wins === 0 && noWins.avgHpRemainingOnWin === null,
    'PV à la victoire absents sans victoire'
  );
  assert(
    meanHpOnWin([
      { wins: 1, avgHpRemainingOnWin: 10 },
      { wins: 3, avgHpRemainingOnWin: 30 },
      { wins: 0, avgHpRemainingOnWin: null },
    ]) === 25,
    'PV à la victoire pondérés par nombre de victoires'
  );
  assert(
    meanHpOnWin([{ wins: 0, avgHpRemainingOnWin: null }]) === null,
    'PV agrégés absents sans victoire'
  );
}

// --- Smoke déterminisme ---
console.log('\n=== Combat balance — smoke déterminisme ===');
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
    'createSeededRng reproductible'
  );
}

console.log(`\nPolitique joueur : ${PLAYER_POLICY.id}`);
console.log(`  ${PLAYER_POLICY.summary}`);
console.log('Profils :');
for (const profile of Object.values(BALANCE_PROFILES)) {
  console.log(
    `  ${profile.id}: niveau ${profile.level} (${rankForLevel(profile.level)}), ${profile.deck} L${profile.deckUpgradeLevel}, ${profile.talentCodes.length} talent(s)`
  );
}
if (STRICT) console.log('Mode --strict : soft/design → hard fail');

const fightsPerCell = REPORT ? BALANCE_SIM.reportFightsPerCell : BALANCE_SIM.fightsPerCell;
const profileIds = Object.keys(BALANCE_PROFILES);

console.log(
  `\n=== Matrice ${fightsPerCell} fights/cellule × ${BALANCE_ENCOUNTERS.length} encounters × ${profileIds.length} profils ===`
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
        `  ${profileId.padEnd(8)} ${enc.templateId.padEnd(20)} ${enc.rank}  WR=${pct(agg.winRate)}  T=${fmt(agg.avgTurns)}  HP=${fmt(agg.avgHpRemainingOnWin)}  DMG=${fmt(agg.avgDamageTaken)}`
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
    avgHpRemainingOnWin: meanHpOnWin(list),
    avgDamageTaken: mean(list, 'avgDamageTaken'),
  };
  aggregates[key] = agg;
  console.log(
    `  Rang ${rank} / ${profileId.padEnd(8)}  WR=${pct(agg.winRate)}  turns=${fmt(agg.avgTurns)}  hp@win=${fmt(agg.avgHpRemainingOnWin)}  dmg=${fmt(agg.avgDamageTaken)}`
  );

  if (!REPORT) {
    checkThresholds(agg, rank, profileId);

    const design = DESIGN_WINRATE_TARGETS[rank]?.[profileId];
    if (design) {
      softAssert(
        agg.winRate + 1e-9 >= design.min && agg.winRate - 1e-9 <= design.max,
        `design target ${profileId}@${rank}: WR ${pct(agg.winRate)} in [${pct(design.min)}–${pct(design.max)}]`
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
      `beginner: tours C (${fmt(begC.avgTurns)}) ≥ D (${fmt(begD.avgTurns)})`
    );
    assert(
      begC.avgDamageTaken >= begD.avgDamageTaken - 0.05,
      `beginner: dmg C (${fmt(begC.avgDamageTaken)}) ≥ D (${fmt(begD.avgDamageTaken)})`
    );
  }
  if (midD && midA) {
    assert(
      midA.avgTurns >= midD.avgTurns - 0.05,
      `mid: tours A (${fmt(midA.avgTurns)}) ≥ D (${fmt(midD.avgTurns)})`
    );
    assert(
      midA.avgDamageTaken >= midD.avgDamageTaken - 0.05,
      `mid: dmg A (${fmt(midA.avgDamageTaken)}) ≥ D (${fmt(midD.avgDamageTaken)})`
    );
  }
  if (strongD && strongA) {
    assert(
      strongA.avgTurns >= strongD.avgTurns - 0.05,
      `strong: tours A (${fmt(strongA.avgTurns)}) ≥ D (${fmt(strongD.avgTurns)})`
    );
  }
  if (begD && midD && strongD) {
    assert(
      midD.avgTurns <= begD.avgTurns + 0.05,
      `rang D: mid tours (${fmt(midD.avgTurns)}) ≤ beginner (${fmt(begD.avgTurns)})`
    );
    assert(
      strongD.avgTurns <= midD.avgTurns + 0.05,
      `rang D: strong tours (${fmt(strongD.avgTurns)}) ≤ mid (${fmt(midD.avgTurns)})`
    );
  }
  if (midA && strongA) {
    assert(
      strongA.avgTurns <= midA.avgTurns + 0.05,
      `rang A: strong tours (${fmt(strongA.avgTurns)}) ≤ mid (${fmt(midA.avgTurns)})`
    );
  }
}

// Scénario de référence additionnel : aucune cible practice n'est appliquée.
console.log(`\n=== Starter niveau 1 — ${fightsPerCell} combats/cellule, mêmes seeds ===`);
const starterRows = BALANCE_ENCOUNTERS.map(enc => {
  const options = {
    profileId: 'starter',
    profileOverride: starter.profile,
    deckEntries: starter.entries,
    templateId: enc.templateId,
    difficulty: enc.difficulty,
    baseSeed: BALANCE_SIM.baseSeed,
    count: fightsPerCell,
    maxTurns: BALANCE_SIM.maxTurns,
  };
  const first = aggregateFights(options);
  const replayMatches = Array.from({ length: fightsPerCell }, (_, i) => {
    const fightOptions = { ...options, seed: (BALANCE_SIM.baseSeed + i * 9973) >>> 0 };
    return (
      JSON.stringify(simulateCombat(fightOptions)) === JSON.stringify(simulateCombat(fightOptions))
    );
  }).every(Boolean);
  assert(replayMatches, `starter vs ${enc.templateId} : chaque seed reproduit le même combat`);
  return { ...first, rank: enc.rank };
});
printReportTable(starterRows);
for (const rank of ['D', 'C', 'B', 'A']) {
  const list = starterRows.filter(row => row.rank === rank);
  console.log(
    `  Rang ${rank} / starter  WR=${pct(mean(list, 'winRate'))}  turns=${fmt(mean(list, 'avgTurns'))}  hp@win=${fmt(meanHpOnWin(list))}  dmg=${fmt(mean(list, 'avgDamageTaken'))}`
  );
}
console.log(
  `  Timeouts starter : ${starterRows.reduce((sum, row) => sum + row.timeouts, 0)} / ${starterRows.length * fightsPerCell} combats (hors répétition)`
);

if (REPORT) {
  printReportTable(rows);
  console.log('\nCibles design (win rate) :');
  for (const [rank, profiles] of Object.entries(DESIGN_WINRATE_TARGETS)) {
    for (const [profileId, band] of Object.entries(profiles)) {
      const agg = aggregates[`${rank}|${profileId}`];
      const actual = agg ? pct(agg.winRate) : 'n/a';
      const ok = agg && agg.winRate + 1e-9 >= band.min && agg.winRate - 1e-9 <= band.max;
      console.log(
        `  ${rank}/${profileId}: cible [${pct(band.min)}–${pct(band.max)}]  actuel ${actual}  ${ok ? 'OK' : 'HORS CIBLE'}`
      );
    }
  }
  const timeouts = rows.reduce((sum, row) => sum + row.timeouts, 0);
  console.log(`\nTimeouts : ${timeouts} / ${rows.length * fightsPerCell} combats`);
  console.log('(Mode rapport — pas de fail sur seuils)');
  if (failed > 0) {
    console.error(`\nÉchec de ${failed} assertion(s) de simulation.`);
    process.exit(1);
  }
  console.log(`\n✅ Rapport combat-balance généré (${rows.length} cellules).`);
  process.exit(0);
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed, ${softFailed} soft ===`);
if (softFailures.length && !STRICT) {
  console.warn(
    '\nHors balance (soft/design) — retune templates ou `npm run test:combat-balance -- --strict` :'
  );
  for (const f of softFailures) console.warn(`  - ${f}`);
}
if (failed > 0) {
  console.error('\nÉchecs hard / strict :');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ testCombatBalance passed');
