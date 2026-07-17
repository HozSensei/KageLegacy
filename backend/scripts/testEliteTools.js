/**
 * Tests Rapport Élite + outils d'analyse (Pack Élite).
 * Usage: node scripts/testEliteTools.js
 */
import { query } from '../src/config/database.js';
import { grantEliteSubscription, getEliteMePayload } from '../src/services/eliteSubscriptionService.js';
import {
  buildEliteMatchReport,
  buildOrdersAdvice,
  buildSimulationVerdict,
  ELITE_RULES_COMPOSITION_ANCHOR,
} from '../src/services/eliteReportService.js';
import {
  getEliteToolsPayload,
  simulateEliteMatchup,
} from '../src/services/eliteToolsService.js';
import { openChakraSeal, grantDailySealsForUser } from '../src/services/dailySealService.js';
import { getSeasonPassPayload, recordEliteQuestEvent } from '../src/services/eliteSeasonPassService.js';
import {
  buildDeckComparison,
  buildDomainPliWins,
  buildRelaisStats,
} from '../src/services/eliteMatchAnalytics.js';
import {
  buildCustomOpponentDeck,
  buildSyntheticOpponentDeck,
  isCustomOpponentDeckInput,
  normalizeOpponentDeckProfile,
} from '../src/services/eliteDeckSimulation.js';
import { buildScoutMatchupConfigFromReport } from '../src/services/eliteScoutPrefill.js';

const PREFIX = `elite_tools_${Date.now()}`;

const MINIMAL_COMBAT_LOG = {
  plisWon: { home: 6, away: 4 },
  homeScorePct: 62,
  awayScorePct: 38,
  endReason: 'points',
  koNinjaIds: [],
  deckSnapshots: {
    home: {
      elementCount: 5,
      elementSlugs: ['katon-mur', 'raiton-surcharge'],
      primaryDomains: { taijutsu: 1, ninjutsu: 2, genjutsu: 0, medecine: 0 },
    },
    away: {
      elementCount: 3,
      elementSlugs: ['doton-racines'],
      primaryDomains: { taijutsu: 0, ninjutsu: 2, genjutsu: 1, medecine: 0 },
    },
  },
  logs: [
    {
      tour: 1,
      type: 'pli',
      carte_home: 'Taijutsu',
      carte_away: 'Genjutsu',
      technique_type_home: 'Taijutsu',
      technique_type_away: 'Genjutsu',
      pli_winner: 'home',
      degats_pv: 18,
      degats_pv_away: 0,
    },
    {
      tour: 2,
      type: 'element',
      carte_home: 'Katon — Mur',
      carte_away: 'Ninjutsu',
      technique_type_home: 'Ninjutsu',
      technique_type_away: 'Ninjutsu',
      pli_winner: 'home',
      degats_pv: 12,
    },
    {
      tour: 3,
      type: 'relais',
      carte_home: 'Relais · Genin',
      carte_away: 'Taijutsu',
      technique_type_home: 'Taijutsu',
      technique_type_away: 'Taijutsu',
      pli_winner: 'away',
      degats_pv: 0,
      degats_pv_away: 10,
    },
    {
      tour: 5,
      type: 'pli',
      carte_home: 'Genjutsu',
      carte_away: 'Taijutsu',
      technique_type_home: 'Genjutsu',
      technique_type_away: 'Taijutsu',
      pli_winner: 'home',
      degats_pv: 24,
      degats_pv_away: 0,
      sensei_interception: true,
    },
  ],
  equipmentSummary: [],
};

async function createSensei(username) {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [username]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Genjutsu', 10000, 0, 100, 'fr')`,
    [userId, username]
  );
  return userId;
}

async function seedSquad(userId) {
  for (let pos = 1; pos <= 3; pos += 1) {
    await query(
      `INSERT INTO ninjas (
         user_id, name, grade, age, squad_position, training_focus,
         taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
         moral, weekly_forme, character_trait, element_affinity
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Taijutsu', 40, 35, 30, 20, 45, 30, 15, 'Passable', 'Brute', 'Katon')`,
      [userId, `${PREFIX}_n${pos}`, pos]
    );
  }
}

async function main() {
  console.assert(normalizeOpponentDeckProfile('offensive') === 'domain_ninjutsu', 'alias offensive');
  console.assert(normalizeOpponentDeckProfile('sparse') === 'sparse', 'profil sparse');

  const synthetic = buildSyntheticOpponentDeck(
    [{ id: 1, squad_position: 1, taijutsu: 40, ninjutsu: 35, genjutsu: 30, medecine: 20 }],
    'complete'
  );
  const syntheticCount = Object.values(synthetic.techniqueSlotsByNinjaId || {}).reduce(
    (sum, ids) => sum + ids.length,
    0
  );
  console.assert(syntheticCount >= 1, 'deck synthétique avec technique');

  const custom = buildCustomOpponentDeck(
    [
      { id: 1, squad_position: 1, taijutsu: 40, ninjutsu: 35, genjutsu: 30, medecine: 20 },
      { id: 2, squad_position: 2, taijutsu: 40, ninjutsu: 35, genjutsu: 30, medecine: 20 },
      { id: 3, squad_position: 3, taijutsu: 40, ninjutsu: 35, genjutsu: 30, medecine: 20 },
    ],
    {
      techniqueSlugsByNinja: [['tai-lame-chakras'], [], ['gen-mirage-simple']],
    }
  );
  console.assert(Object.keys(custom.techniqueSlotsByNinjaId).length === 2, 'deck custom 2 ninjas');
  console.assert(
    Object.values(custom.techniqueCardsById || {}).length === 2,
    'deck custom 2 cartes'
  );
  console.assert(isCustomOpponentDeckInput({ techniqueSlugsByNinja: [[]] }), 'detect custom input');

  const scoutConfig = buildScoutMatchupConfigFromReport(
    { opponentName: 'Orochimaru' },
    {
      tier: 'full',
      techniqueCount: 2,
      domainCounts: { ninjutsu: 2, genjutsu: 1 },
      slots: [
        { techniques: [{ slug: 'nin-afflux-chakra' }] },
        { techniques: [{ slug: 'gen-mirage-simple' }] },
        { techniques: [] },
      ],
      techniqueCards: [{ slug: 'nin-afflux-chakra' }, { slug: 'gen-mirage-simple' }],
    }
  );
  console.assert(scoutConfig.techniqueSlugsByNinja.length === 3, 'scout prefill 3 ninjas');
  console.assert(scoutConfig.techniqueSlugsByNinja[0].length === 1, 'scout ninja 1 technique');

  const domainWins = buildDomainPliWins(MINIMAL_COMBAT_LOG.logs, 'home');
  console.assert(domainWins?.mine?.Taijutsu >= 1, 'domain pli wins tai');
  const relais = buildRelaisStats(MINIMAL_COMBAT_LOG.logs, 'home');
  console.assert(relais?.mine?.element === 1, 'relais stats element');
  const deckCmp = buildDeckComparison(MINIMAL_COMBAT_LOG, 'home', 'fr');
  console.assert(deckCmp?.mine?.elementCount === 5, 'deck comparison home');

  const verdict = buildSimulationVerdict({
    winPct: 62,
    opponentProfile: 'sparse',
    opponentLevel: 'similar',
    locale: 'fr',
    squadContext: { deckElements: 5, avgMoral: 15 },
  });
  console.assert(verdict.tone === 'favorable', 'verdict favorable');
  console.assert(verdict.factors.length >= 2, 'verdict facteurs');
  console.assert(verdict.advice.length >= 1, 'verdict conseils');
  console.assert(!verdict.advice.some((a) => a.includes('consignes')), 'pas de conseil consignes');

  const orders = buildOrdersAdvice({ techniqueCount: 4, techniqueSlotsByNinjaId: { 1: [1, 2] } }, 'fr');
  console.assert(orders.tips.some((t) => t.includes('technique') || t.includes('carte')), 'conseil deck');

  const poolRows = await query(`SELECT p.* FROM pools p LIMIT 1`);
  if (!poolRows[0]) {
    console.error('SKIP: aucune pool en base — lancez seed/playtest d\'abord.');
    process.exit(0);
  }
  const pool = poolRows[0];

  const homeId = await createSensei(`${PREFIX}_home`);
  const awayId = await createSensei(`${PREFIX}_away`);

  for (const uid of [homeId, awayId]) {
    await query('INSERT IGNORE INTO pool_members (pool_id, user_id) VALUES (?, ?)', [pool.id, uid]);
    await query('INSERT IGNORE INTO pool_standings (pool_id, user_id) VALUES (?, ?)', [pool.id, uid]);
  }

  await seedSquad(homeId);

  const matchResult = await query(
    `INSERT INTO matches (
       pool_id, season_cycle, home_user_id, away_user_id,
       home_sensei, away_sensei, status, result,
       home_score, away_score, ending_tour, combat_log
     ) VALUES (?, 1, ?, ?, ?, ?, 'applied', 'home_win', 2, 1, 8, ?)`,
    [
      pool.id,
      homeId,
      awayId,
      `${PREFIX}_home`,
      `${PREFIX}_away`,
      JSON.stringify(MINIMAL_COMBAT_LOG),
    ]
  );
  const matchId = matchResult.insertId;

  let rejected = false;
  try {
    await buildEliteMatchReport(matchId, homeId, 'fr');
  } catch (e) {
    rejected = e.statusCode === 403;
  }
  console.assert(rejected, 'rapport refusé sans Pack Élite');

  await grantEliteSubscription(homeId, { poolId: pool.id, seasonNumber: pool.season_number });

  const report = await buildEliteMatchReport(matchId, homeId, 'fr');
  console.assert(report.matchId === matchId, 'rapport matchId');
  console.assert(report.summary.possession.mine === 60, 'plis share home');
  console.assert(report.summary.plisWon.home === 6, 'plis won home');
  console.assert(report.summary.maxPlis === 14, 'max plis');
  console.assert(report.decisiveMoments.length >= 1, 'moments décisifs');
  console.assert(report.timeline.length >= 1, 'timeline');
  console.assert(report.techniqueBreakdown.mine.Taijutsu === 18, 'breakdown tai');
  console.assert(report.domainPliWins?.mine.Taijutsu >= 1, 'domain pli wins');
  console.assert(report.deckComparison?.mine?.elementCount === 5, 'deck snapshot home');
  console.assert(report.relaisStats?.mine?.element === 1, 'relais report');

  const tools = await getEliteToolsPayload(homeId, 'fr');
  console.assert(tools.seasonStats.played >= 1, 'stats saison joués');
  console.assert(tools.orders?.label, 'label deck');
  console.assert(tools.opponentProfileOptions?.length === 4, 'options profil deck');
  console.assert(tools.matchupBuilder?.domainOptions?.length === 4, 'domaines simulateur');
  console.assert(tools.matchupBuilder?.presets?.sparse, 'preset sparse');
  console.assert(tools.levelOptions.length === 5, 'options niveau');

  const sim = await simulateEliteMatchup(homeId, {
    opponentDeck: {
      slots: [
        { configured: true, primary: 'ninjutsu', secondary: 'genjutsu' },
        { configured: true, primary: 'taijutsu', secondary: 'ninjutsu' },
        { configured: false },
      ],
      elementSlugs: ['raiton-surcharge'],
    },
    opponentLevel: 'similar',
    runs: 30,
  });
  console.assert(sim.runs === 30, 'sim runs');
  console.assert(sim.winPct != null, 'sim winPct');
  console.assert(sim.opponentProfile === 'custom', 'sim deck custom');
  console.assert(sim.verdict?.headline, 'sim verdict headline');
  console.assert(sim.verdict?.rulesAnchor === ELITE_RULES_COMPOSITION_ANCHOR, 'ancre règles');

  await grantDailySealsForUser(homeId);
  await openChakraSeal(homeId);
  let passAfterSeal = await getSeasonPassPayload(homeId, 'fr');
  const sealQuest = passAfterSeal.quests.find((q) => q.slug === 'seals_5');
  console.assert(sealQuest?.currentProgress === 1, 'quête sceaux +1 après ouverture');

  await recordEliteQuestEvent(homeId, 'daily_seal_opened', 4);
  passAfterSeal = await getSeasonPassPayload(homeId, 'fr');
  const sealQuestDone = passAfterSeal.quests.find((q) => q.slug === 'seals_5');
  console.assert(sealQuestDone?.completed, 'quête sceaux complétée à 5');

  await query('DELETE FROM matches WHERE id = ?', [matchId]);
  for (const uid of [homeId, awayId]) {
    await query('DELETE FROM elite_quest_progress WHERE user_id = ?', [uid]);
    await query('DELETE FROM elite_unlocked_rewards WHERE user_id = ?', [uid]);
    await query('DELETE FROM ninjas WHERE user_id = ?', [uid]);
    await query('DELETE FROM pool_standings WHERE user_id = ?', [uid]);
    await query('DELETE FROM pool_members WHERE user_id = ?', [uid]);
    await query('DELETE FROM sensei_elite_subscriptions WHERE user_id = ?', [uid]);
    await query('DELETE FROM sensei WHERE user_id = ?', [uid]);
    await query('DELETE FROM users WHERE id = ?', [uid]);
  }

  console.log('testEliteTools: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
