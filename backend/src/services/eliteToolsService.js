import { query } from '../config/database.js';
import { detectSquadComposition, compositionLabel } from './combat/compositionMeta.js';
import { buildCombatTeam } from './combat/matchLoader.js';
import { getHeritageBonuses, listHeritageScrolls, applyPercentDiscount } from './heritageService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { computeTrainingCost, computeTrainingGain } from './training.js';
import {
  cloneNinja,
  createPureCompositionSquad,
  runMonteCarlo,
} from './simulation/cycleSimulator.js';
import { DIVISION_ROMAN } from '../models/league.js';
import {
  assertEliteToolsAccess,
  buildCompositionAdvice,
  buildSimulationVerdict,
  compareCompositions,
} from './eliteReportService.js';

const COMPOSITION_OPTIONS = ['assaut', 'mur', 'flux', 'equilibre'];

function dbNinjaToSim(ninja) {
  return cloneNinja({
    id: ninja.id,
    name: ninja.name,
    grade: ninja.grade,
    age: ninja.age,
    battle_strategy: ninja.battle_strategy || 'Normal',
    weekly_forme: ninja.weekly_forme || 'Passable',
    moral: ninja.moral ?? 15,
    character_trait: ninja.character_trait || 'Discipline',
    element_affinity: ninja.element_affinity,
    taijutsu: ninja.taijutsu,
    ninjutsu: ninja.ninjutsu,
    genjutsu: ninja.genjutsu,
    medecine: ninja.medecine,
    vitesse: ninja.vitesse,
    intelligence: ninja.intelligence,
    training_residual: 0,
  });
}

async function loadActiveSquadComposition(userId) {
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  if (!ninjas.length) return { ninjas: [], composition: 'equilibre' };

  const team = buildCombatTeam({ userId, ninjas, sensei: null, equipmentByNinja: {} }, 'home');
  const composition = detectSquadComposition(team.fighters);
  return { ninjas, composition };
}

async function getSeasonMatchStats(userId, pool) {
  const rows = await query(
    `SELECT m.id, m.season_cycle, m.result, m.home_user_id, m.away_user_id,
            m.home_score, m.away_score, m.ending_tour,
            m.combat_log
     FROM matches m
     WHERE m.pool_id = ? AND m.status = 'applied'
       AND (m.home_user_id = ? OR m.away_user_id = ?)
     ORDER BY m.season_cycle ASC`,
    [pool.id, userId, userId]
  );

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let possessionSum = 0;
  let possessionCount = 0;

  const history = rows.map((row) => {
    const isHome = row.home_user_id === userId;
    let outcome = 'loss';
    if (row.result === 'draw') {
      outcome = 'draw';
      draws += 1;
    } else if (
      (row.result === 'home_win' && isHome) ||
      (row.result === 'away_win' && !isHome)
    ) {
      outcome = 'win';
      wins += 1;
    } else {
      losses += 1;
    }

    let myPossession = null;
    if (row.combat_log) {
      const log = typeof row.combat_log === 'string' ? JSON.parse(row.combat_log) : row.combat_log;
      const pos = log.possession;
      if (pos) {
        myPossession = isHome ? pos.homePct : pos.awayPct;
        if (myPossession != null) {
          possessionSum += myPossession;
          possessionCount += 1;
        }
      }
    }

    return {
      matchId: row.id,
      cycle: row.season_cycle,
      outcome,
      score: isHome ? `${row.home_score}:${row.away_score}` : `${row.away_score}:${row.home_score}`,
      endingTour: row.ending_tour,
      possession: myPossession,
    };
  });

  return {
    division: DIVISION_ROMAN[pool.division_level] || String(pool.division_level),
    season: pool.season_number,
    played: rows.length,
    wins,
    draws,
    losses,
    avgPossession: possessionCount ? Math.round(possessionSum / possessionCount) : null,
    history,
  };
}

function buildTrainingRoi(ninjas, heritage) {
  return ninjas
    .filter((n) => n.training_focus)
    .map((ninja) => {
      const grossCost = computeTrainingCost(ninja);
      const netCost = applyPercentDiscount(grossCost, heritage.trainingDiscountPct);
      const gainPreview = computeTrainingGain(ninja);
      return {
        ninjaId: ninja.id,
        ninjaName: ninja.name,
        focus: ninja.training_focus,
        age: ninja.age,
        grossCost,
        netCost,
        expectedGain: gainPreview.skipped ? 0 : gainPreview.gain,
        stat: gainPreview.column ?? null,
        atCap: gainPreview.skipped,
      };
    });
}

export async function getEliteToolsPayload(userId, locale = 'fr') {
  const { pool } = await assertEliteToolsAccess(userId);
  const lang = locale === 'en' ? 'en' : 'fr';

  const [{ ninjas, composition }, heritageBonuses, heritageScrolls, seasonStats] =
    await Promise.all([
      loadActiveSquadComposition(userId),
      getHeritageBonuses(userId),
      listHeritageScrolls(userId),
      getSeasonMatchStats(userId, pool),
    ]);

  const compositionAdvice = buildCompositionAdvice(composition, lang);
  const trainingRoi = buildTrainingRoi(ninjas, heritageBonuses);

  const heritageSummary = {
    trainingDiscountPct: heritageBonuses.trainingDiscountPct,
    dispensaryDiscountPct: heritageBonuses.dispensaryDiscountPct,
    matchShopDiscountPct: heritageBonuses.matchShopDiscountPct,
    bureauShopDiscountPct: heritageBonuses.bureauShopDiscountPct,
    scrollCount: heritageScrolls.length,
    scrolls: heritageScrolls.slice(0, 6),
  };

  const matchupMatrix = COMPOSITION_OPTIONS.map((opponentComp) => ({
    opponent: opponentComp,
    label: compositionLabel(opponentComp, lang),
    ...compareCompositions(composition, opponentComp),
  }));

  return {
    seasonStats,
    composition: compositionAdvice,
    heritage: heritageSummary,
    trainingRoi,
    matchupMatrix,
    compositionOptions: COMPOSITION_OPTIONS.map((value) => ({
      value,
      label: compositionLabel(value, lang),
    })),
  };
}

export async function simulateEliteMatchup(
  userId,
  { opponentComposition, runs = 100, locale = 'fr' } = {}
) {
  await assertEliteToolsAccess(userId);

  const lang = locale === 'en' ? 'en' : 'fr';
  const opponent = COMPOSITION_OPTIONS.includes(opponentComposition)
    ? opponentComposition
    : 'assaut';

  const { ninjas, composition } = await loadActiveSquadComposition(userId);
  if (ninjas.length < 3) {
    const error = new Error('Escouade active incomplète pour la simulation.');
    error.statusCode = 400;
    throw error;
  }

  const mySquad = ninjas.map(dbNinjaToSim);
  const oppSquad = createPureCompositionSquad('Opp', opponent, 100, 1);
  const runCount = Math.min(200, Math.max(20, Number(runs) || 100));

  const result = runMonteCarlo({
    slotANinjas: mySquad,
    slotBNinjas: oppSquad,
    runs: runCount,
    favoriteSide: 'slotA',
  });

  const matchup = compareCompositions(composition, opponent);
  const winPct = result.slotAWinPct;

  return {
    myComposition: composition,
    opponentComposition: opponent,
    myCompositionLabel: compositionLabel(composition, lang),
    opponentCompositionLabel: compositionLabel(opponent, lang),
    runs: runCount,
    winPct,
    drawPct: result.drawPct,
    lossPct: result.slotBWinPct,
    koPct: result.koPct,
    avgTours: result.avgTours,
    upsetPct: result.upsetPct,
    matchup,
    verdict: buildSimulationVerdict({
      winPct,
      matchup,
      myComposition: composition,
      opponentComposition: opponent,
      locale: lang,
    }),
  };
}

export async function getEliteToolsPayloadForUser(userId) {
  const locale = await getUserLanguage(userId);
  return getEliteToolsPayload(userId, locale);
}
