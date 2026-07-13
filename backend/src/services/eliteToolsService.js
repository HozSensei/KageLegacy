import { query } from '../config/database.js';
import { plisMetrics } from './combat/pli/combatLogMetrics.js';
import { getHeritageBonuses, listHeritageScrolls, applyPercentDiscount } from './heritageService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { computeTrainingCost, previewTrainingSession } from './training.js';
import { cloneNinja, runMonteCarlo } from './simulation/cycleSimulator.js';
import { DIVISION_ROMAN } from '../models/league.js';
import {
  assertEliteToolsAccess,
  buildOrdersAdvice,
  buildSimulationVerdict,
} from './eliteReportService.js';
import { buildPreparationChallenges } from './elitePreparationChallenges.js';
import { getOperationDeck, deckConfigForCombat } from './operationDeckService.js';
import {
  buildOpponentSquadFromPlayer,
  getOpponentLevelMultiplier,
  normalizeOpponentLevel,
  OPPONENT_LEVEL_IDS,
} from './combat/squadPowerScaling.js';
import {
  OPPONENT_DECK_PROFILE_IDS,
  OPPONENT_DECK_PROFILE_LABELS,
  buildSyntheticOpponentDeck,
  normalizeOpponentDeckProfile,
} from './eliteDeckSimulation.js';

const OPPONENT_LEVEL_LABELS = {
  fr: {
    weaker: 'Plus faible',
    slightly_weaker: 'Légèrement plus faible',
    similar: 'Similaire',
    slightly_stronger: 'Légèrement plus fort',
    stronger: 'Plus fort',
  },
  en: {
    weaker: 'Weaker',
    slightly_weaker: 'Slightly weaker',
    similar: 'Similar',
    slightly_stronger: 'Slightly stronger',
    stronger: 'Stronger',
  },
};

function dbNinjaToSim(ninja) {
  return cloneNinja({
    id: ninja.id,
    name: ninja.name,
    grade: ninja.grade,
    age: ninja.age,
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

async function loadActiveSquad(userId) {
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  return { ninjas };
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
  let plisSum = 0;
  let plisCount = 0;

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

    let myPlisShare = null;
    if (row.combat_log) {
      const log = typeof row.combat_log === 'string' ? JSON.parse(row.combat_log) : row.combat_log;
      const plis = plisMetrics(log);
      myPlisShare = isHome ? plis.homePct : plis.awayPct;
      if (myPlisShare != null) {
        plisSum += myPlisShare;
        plisCount += 1;
      }
    }

    return {
      matchId: row.id,
      cycle: row.season_cycle,
      outcome,
      score: isHome ? `${row.home_score}:${row.away_score}` : `${row.away_score}:${row.home_score}`,
      endingTour: row.ending_tour,
      plisShare: myPlisShare,
    };
  });

  return {
    division: DIVISION_ROMAN[pool.division_level] || String(pool.division_level),
    season: pool.season_number,
    played: rows.length,
    wins,
    draws,
    losses,
    avgPlisShare: plisCount ? Math.round(plisSum / plisCount) : null,
    history,
  };
}

function buildTrainingRoi(ninjas, heritage) {
  return ninjas
    .filter((n) => n.preparation_type)
    .map((ninja) => {
      const grossCost = computeTrainingCost(ninja);
      const netCost = applyPercentDiscount(grossCost, heritage.trainingDiscountPct);
      const preview = previewTrainingSession(ninja, ninja.preparation_type, 'preparation');
      const expectedGain = preview?.statPreviews?.reduce((sum, stat) => sum + (stat.avgGain || 0), 0) ?? 0;
      const atCap = preview?.allCapped ?? true;
      return {
        ninjaId: ninja.id,
        ninjaName: ninja.name,
        focus: ninja.preparation_type,
        age: ninja.age,
        grossCost,
        netCost,
        expectedGain,
        stat: preview?.trainingType ?? null,
        atCap,
      };
    });
}

export async function getEliteToolsPayload(userId, locale = 'fr') {
  const { pool } = await assertEliteToolsAccess(userId);
  const lang = locale === 'en' ? 'en' : 'fr';

  const [{ ninjas }, operationDeck, heritageBonuses, heritageScrolls, seasonStats] =
    await Promise.all([
      loadActiveSquad(userId),
      getOperationDeck(userId).catch(() => null),
      getHeritageBonuses(userId),
      listHeritageScrolls(userId),
      getSeasonMatchStats(userId, pool),
    ]);

  const ordersAdvice = buildOrdersAdvice({ deck: operationDeck }, lang);
  const trainingRoi = buildTrainingRoi(ninjas, heritageBonuses);
  const preparationChallenges = buildPreparationChallenges({
    ninjas,
    operationDeck,
    locale: lang,
  });

  const heritageSummary = {
    trainingDiscountPct: heritageBonuses.trainingDiscountPct,
    dispensaryDiscountPct: heritageBonuses.dispensaryDiscountPct,
    matchShopDiscountPct: heritageBonuses.matchShopDiscountPct,
    bureauShopDiscountPct: heritageBonuses.bureauShopDiscountPct,
    scrollCount: heritageScrolls.length,
    scrolls: heritageScrolls.slice(0, 6),
  };

  const profileLabels = OPPONENT_DECK_PROFILE_LABELS[lang] || OPPONENT_DECK_PROFILE_LABELS.fr;
  const opponentProfileOptions = OPPONENT_DECK_PROFILE_IDS.map((value) => ({
    value,
    label: profileLabels[value],
  }));

  return {
    seasonStats,
    orders: ordersAdvice,
    composition: ordersAdvice,
    heritage: heritageSummary,
    trainingRoi,
    preparationChallenges,
    opponentProfileOptions,
    opponentStyleOptions: opponentProfileOptions,
    compositionOptions: opponentProfileOptions,
    levelOptions: OPPONENT_LEVEL_IDS.map((value) => ({
      value,
      label: OPPONENT_LEVEL_LABELS[lang][value],
      multiplier: getOpponentLevelMultiplier(value),
    })),
  };
}

export async function simulateEliteMatchup(
  userId,
  { opponentComposition, opponentProfile, opponentStyle, opponentLevel, runs = 100, locale = 'fr' } = {}
) {
  await assertEliteToolsAccess(userId);

  const lang = locale === 'en' ? 'en' : 'fr';
  const profileInput = opponentProfile ?? opponentStyle ?? opponentComposition;
  const opponentProfileId = normalizeOpponentDeckProfile(profileInput);
  const level = normalizeOpponentLevel(opponentLevel);

  const [{ ninjas }, operationDeck] = await Promise.all([
    loadActiveSquad(userId),
    getOperationDeck(userId).catch(() => null),
  ]);
  if (ninjas.length < 3) {
    const error = new Error('Escouade active incomplète pour la simulation.');
    error.statusCode = 400;
    throw error;
  }

  const mySquad = ninjas.map(dbNinjaToSim);
  const oppSquad = buildOpponentSquadFromPlayer(ninjas, opponentProfileId, level).map(dbNinjaToSim);
  const runCount = Math.min(200, Math.max(20, Number(runs) || 100));

  const homeDeck = operationDeck ? deckConfigForCombat(operationDeck) : { techniquesByNinjaId: {}, elementCards: [] };
  const awayDeck = buildSyntheticOpponentDeck(oppSquad, opponentProfileId);

  const result = runMonteCarlo({
    slotANinjas: mySquad,
    slotBNinjas: oppSquad,
    runs: runCount,
    favoriteSide: 'slotA',
    homeDeck,
    awayDeck,
  });

  const winPct = result.slotAWinPct;
  const levelLabel = OPPONENT_LEVEL_LABELS[lang][level];
  const ordersAdvice = buildOrdersAdvice({ deck: operationDeck }, lang);
  const profileLabels = OPPONENT_DECK_PROFILE_LABELS[lang] || OPPONENT_DECK_PROFILE_LABELS.fr;

  return {
    myComposition: 'deck',
    opponentComposition: opponentProfileId,
    opponentProfile: opponentProfileId,
    opponentStyle: opponentProfileId,
    opponentLevel: level,
    opponentLevelLabel: levelLabel,
    opponentLevelMultiplier: getOpponentLevelMultiplier(level),
    myCompositionLabel: ordersAdvice.label,
    opponentCompositionLabel: profileLabels[opponentProfileId],
    runs: runCount,
    winPct,
    drawPct: result.drawPct,
    lossPct: result.slotBWinPct,
    koPct: result.koPct,
    avgTours: result.avgTours,
    upsetPct: result.upsetPct,
    cardProcsPerMatch: result.cardProcsPerMatch,
    matchProcPct: result.matchProcPct,
    verdict: buildSimulationVerdict({
      winPct,
      opponentProfile: opponentProfileId,
      opponentLevel: level,
      locale: lang,
      squadContext: {
        deckElements: operationDeck?.elementCardIds?.length ?? 0,
        avgMoral: summarizeSquadMoral(ninjas),
      },
    }),
  };
}

function summarizeSquadMoral(ninjas) {
  if (!ninjas.length) return null;
  const sum = ninjas.reduce((acc, n) => acc + Number(n.moral ?? 15), 0);
  return sum / ninjas.length;
}

export async function getEliteToolsPayloadForUser(userId) {
  const locale = await getUserLanguage(userId);
  return getEliteToolsPayload(userId, locale);
}
