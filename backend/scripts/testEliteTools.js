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
import { getStrategiesForComposition } from '../src/services/combat/squadPowerScaling.js';
import { openChakraSeal, grantDailySealsForUser } from '../src/services/dailySealService.js';
import { getSeasonPassPayload, recordEliteQuestEvent } from '../src/services/eliteSeasonPassService.js';

const PREFIX = `elite_tools_${Date.now()}`;

const MINIMAL_COMBAT_LOG = {
  plisWon: { home: 6, away: 4 },
  homeScorePct: 62,
  awayScorePct: 38,
  endReason: 'score',
  koNinjaIds: [],
  logs: [
    {
      tour: 1,
      type: 'pli',
      carte_home: 'Taijutsu',
      carte_away: 'Genjutsu',
      technique_type_home: 'Taijutsu',
      technique_type_away: 'Genjutsu',
      attaquant_element: 'Katon',
      cible_element: 'Suiton',
      element_effect: 'advantage',
      pli_winner: 'home',
      degats_pv: 18,
      degats_pv_away: 0,
    },
    {
      tour: 3,
      type: 'pli',
      carte_home: 'Ninjutsu',
      carte_away: 'Taijutsu',
      technique_type_home: 'Ninjutsu',
      technique_type_away: 'Taijutsu',
      attaquant_element: 'Raiton',
      cible_element: 'Doton',
      element_effect: 'neutral',
      pli_winner: 'away',
      degats_pv: 0,
      degats_pv_away: 32,
      critique: true,
    },
    {
      tour: 5,
      type: 'pli',
      carte_home: 'Genjutsu',
      carte_away: 'Taijutsu',
      technique_type_home: 'Genjutsu',
      technique_type_away: 'Taijutsu',
      attaquant_element: 'Futon',
      cible_element: 'Katon',
      element_effect: 'disadvantage',
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
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Taijutsu', 40, 35, 30, 20, 45, 30, 15, 'Passable', 'Discipline', 'Katon')`,
      [userId, `${PREFIX}_n${pos}`, pos]
    );
  }
}

async function main() {
  console.assert(
    getStrategiesForComposition('offensive').every((s) => s === 'Offensive'),
    'style offensive pur'
  );
  console.assert(getStrategiesForComposition('tank')[0] === 'Tank', 'style défensif pur');

  const verdict = buildSimulationVerdict({
    winPct: 62,
    opponentStyle: 'tank',
    opponentLevel: 'similar',
    locale: 'fr',
    squadContext: {
      orderCounts: { Offensive: 2, Tank: 1, Protect: 0, Normal: 0 },
      avgMoral: 15,
    },
  });
  console.assert(verdict.tone === 'favorable', 'verdict favorable');
  console.assert(verdict.factors.length >= 2, 'verdict facteurs');
  console.assert(verdict.advice.length >= 1, 'verdict conseils');

  const hardVerdict = buildSimulationVerdict({
    winPct: 35,
    opponentStyle: 'offensive',
    opponentLevel: 'similar',
    locale: 'fr',
    squadContext: {
      orderCounts: { Offensive: 1, Tank: 1, Protect: 1, Normal: 0 },
      avgMoral: 14,
    },
  });
  console.assert(hardVerdict.tone === 'unfavorable', 'matchup difficile');
  console.assert(hardVerdict.rulesAnchor === ELITE_RULES_COMPOSITION_ANCHOR, 'ancre règles');

  const orders = buildOrdersAdvice({ Offensive: 0, Tank: 0, Protect: 0, Normal: 3 }, 'fr');
  console.assert(orders.tips.some((t) => t.includes('cartes') || t.includes('cards') || t.includes('Normal')), 'conseil consignes');

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

  const freePayload = await getEliteMePayload(homeId, 'fr');
  console.assert(!freePayload.subscription.isActive, 'payload inactif avant grant');
  console.assert(freePayload.equipped === null, 'equipped masqué sans abonnement');

  await grantEliteSubscription(homeId, { poolId: pool.id, seasonNumber: pool.season_number });

  const report = await buildEliteMatchReport(matchId, homeId, 'fr');
  console.assert(report.matchId === matchId, 'rapport matchId');
  console.assert(report.summary.possession.mine === 60, 'plis share home');
  console.assert(report.summary.plisWon.home === 6, 'plis won home');
  console.assert(report.decisiveMoments.length >= 1, 'moments décisifs');
  console.assert(report.timeline.length >= 1, 'timeline');
  console.assert(report.techniqueBreakdown.mine.Taijutsu === 18, 'breakdown tai');
  console.assert(report.elementHeatmap?.mine.dealt.Katon === 18, 'heatmap katon dealt');
  console.assert(report.elementHeatmap?.circle.mineAdvantage === 1, 'heatmap avantage élémentaire');

  const activePayload = await getEliteMePayload(homeId, 'fr');
  console.assert(activePayload.subscription.isActive, 'payload actif après grant');
  console.assert(activePayload.equipped !== null, 'equipped visible avec abonnement');

  const tools = await getEliteToolsPayload(homeId, 'fr');
  console.assert(tools.seasonStats.played >= 1, 'stats saison joués');
  console.assert(tools.orders?.label || tools.composition.label, 'label consignes');
  console.assert(tools.trainingRoi.length >= 1, 'ROI entraînement');
  console.assert(tools.preparationChallenges?.challenges?.length >= 1, 'défis préparation');
  console.assert(
    (tools.opponentStyleOptions ?? tools.compositionOptions).length === 4,
    'options style adverse'
  );
  console.assert(tools.levelOptions.length === 5, 'options niveau');

  const sim = await simulateEliteMatchup(homeId, {
    opponentComposition: 'tank',
    opponentLevel: 'similar',
    runs: 30,
  });
  console.assert(sim.runs === 30, 'sim runs');
  console.assert(sim.winPct != null, 'sim winPct');
  console.assert(sim.opponentStyle === 'tank', 'sim style tank');
  console.assert(sim.verdict?.headline, 'sim verdict headline');
  console.assert(sim.myCompositionLabel, 'sim label consignes');
  console.assert(sim.verdict?.advice?.length >= 1, 'sim conseils');
  console.assert(sim.matchProcPct != null, 'sim proc cartes');

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
