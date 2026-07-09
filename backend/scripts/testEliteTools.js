/**
 * Tests Rapport Élite + outils d'analyse (Pack Élite).
 * Usage: node scripts/testEliteTools.js
 */
import { query } from '../src/config/database.js';
import { grantEliteSubscription, getEliteMePayload } from '../src/services/eliteSubscriptionService.js';
import {
  buildEliteMatchReport,
  buildCompositionAdvice,
  compareCompositions,
} from '../src/services/eliteReportService.js';
import {
  getEliteToolsPayload,
  simulateEliteMatchup,
} from '../src/services/eliteToolsService.js';

const PREFIX = `elite_tools_${Date.now()}`;

const MINIMAL_COMBAT_LOG = {
  possession: { homePct: 55, awayPct: 45 },
  homeScorePct: 62,
  awayScorePct: 38,
  endReason: 'score',
  koNinjaIds: [],
  logs: [
    {
      tour: 1,
      equipe_attaque: 'home',
      attaquant_name: 'Ninja A',
      cible_name: 'Ninja B',
      attaquant_element: 'Katon',
      cible_element: 'Suiton',
      element_effect: 'advantage',
      technique_type: 'Taijutsu',
      degats_pv: 18,
      initiative_chance_home: 55,
    },
    {
      tour: 3,
      equipe_attaque: 'away',
      attaquant_name: 'Ninja C',
      cible_name: 'Ninja A',
      attaquant_element: 'Raiton',
      cible_element: 'Doton',
      element_effect: 'neutral',
      technique_type: 'Ninjutsu',
      degats_pv: 32,
      critique: true,
      initiative_chance_home: 48,
    },
    {
      tour: 5,
      equipe_attaque: 'home',
      attaquant_name: 'Ninja A',
      cible_name: 'Ninja C',
      attaquant_element: 'Futon',
      cible_element: 'Katon',
      element_effect: 'disadvantage',
      technique_type: 'Genjutsu',
      degats_pv: 24,
      sensei_interception: true,
      initiative_chance_home: 60,
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
         moral, weekly_forme, battle_strategy, character_trait, element_affinity
       ) VALUES (?, ?, 'Chunin', 16, ?, 'Taijutsu', 40, 35, 30, 20, 45, 30, 15, 'Passable', 'Normal', 'Discipline', 'Feu')`,
      [userId, `${PREFIX}_n${pos}`, pos]
    );
  }
}

async function main() {
  const advice = buildCompositionAdvice('assaut', 'fr');
  console.assert(advice.myComposition === 'assaut', 'conseil compo assaut');
  console.assert(compareCompositions('assaut', 'mur').myAdvantage, 'assaut > mur');

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
  console.assert(report.summary.possession.mine === 55, 'possession home');
  console.assert(report.decisiveMoments.length >= 1, 'moments décisifs');
  console.assert(report.timeline.length >= 1, 'timeline');
  console.assert(report.techniqueBreakdown.mine.Taijutsu === 18, 'breakdown tai');
  console.assert(report.elementHeatmap?.mine.dealt.Katon === 18, 'heatmap katon dealt');
  console.assert(report.elementHeatmap?.circle.mineAdvantage === 1, 'heatmap avantage');

  const activePayload = await getEliteMePayload(homeId, 'fr');
  console.assert(activePayload.subscription.isActive, 'payload actif après grant');
  console.assert(activePayload.equipped !== null, 'equipped visible avec abonnement');

  const tools = await getEliteToolsPayload(homeId, 'fr');
  console.assert(tools.seasonStats.played >= 1, 'stats saison joués');
  console.assert(tools.composition.label, 'label composition');
  console.assert(tools.trainingRoi.length >= 1, 'ROI entraînement');
  console.assert(tools.matchupMatrix.length === 4, 'matrice matchup');

  const sim = await simulateEliteMatchup(homeId, { opponentComposition: 'mur', runs: 30 });
  console.assert(sim.runs === 30, 'sim runs');
  console.assert(sim.winPct != null, 'sim winPct');
  console.assert(sim.matchup.myAdvantage, 'sim avantage assaut vs mur');

  await query('DELETE FROM matches WHERE id = ?', [matchId]);
  for (const uid of [homeId, awayId]) {
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
