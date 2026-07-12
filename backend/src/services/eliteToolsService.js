import { query } from '../config/database.js';
import { getHeritageBonuses, listHeritageScrolls, applyPercentDiscount } from './heritageService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { computeTrainingCost, computeTrainingGain } from './training.js';
import { cloneNinja, runMonteCarlo } from './simulation/cycleSimulator.js';
import { DIVISION_ROMAN } from '../models/league.js';
import {
  assertEliteToolsAccess,
  buildOrdersAdvice,
  buildSimulationVerdict,
} from './eliteReportService.js';
import { buildPreparationChallenges } from './elitePreparationChallenges.js';
import { getTacticCardsForNinjas } from './tacticCards/tacticCardService.js';
import { makeEquippedCard } from './tacticCards/tacticCardFixtures.js';
import {
  buildOpponentSquadFromPlayer,
  getOpponentLevelMultiplier,
  normalizeOpponentLevel,
  normalizeOrderStyle,
  OPPONENT_LEVEL_IDS,
} from './combat/squadPowerScaling.js';

const OPPONENT_STYLE_OPTIONS = ['offensive', 'tank', 'protect', 'mixed'];

const OPPONENT_STYLE_LABELS = {
  fr: {
    offensive: 'Offensive pure',
    tank: 'Défensive pure',
    protect: 'Protection pure',
    mixed: 'Mixte Off/Déf/Prot',
  },
  en: {
    offensive: 'Pure Offensive',
    tank: 'Pure Defensive',
    protect: 'Pure Protection',
    mixed: 'Mixed Off/Def/Prot',
  },
};

const OPPONENT_STYLE_CARD_LOADOUTS = {
  offensive: ['nin-eclair-discret', 'raiton-surcharge', 'futon-lame-retour'],
  tank: ['tai-parade-ecole', 'gen-kage-bunshin', 'doton-racines'],
  protect: ['med-pansement-rapide', 'med-soin-zone', 'med-pansement-rapide'],
  mixed: ['nin-eclair-discret', 'tai-parade-ecole', 'med-pansement-rapide'],
};

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

function summarizeSquadOrders(ninjas) {
  const counts = { Offensive: 0, Tank: 0, Protect: 0, Normal: 0 };
  for (const ninja of ninjas) {
    const key = ninja.battle_strategy || 'Normal';
    if (counts[key] != null) counts[key] += 1;
    else counts.Normal += 1;
  }
  return counts;
}

function summarizeSquadMoral(ninjas) {
  if (!ninjas.length) return null;
  const sum = ninjas.reduce((acc, n) => acc + Number(n.moral ?? 15), 0);
  return sum / ninjas.length;
}

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

function cardRowsToMap(cardRows) {
  const map = {};
  for (const row of cardRows) {
    map[row.ninja_id] = row;
  }
  return map;
}

function buildOpponentCardMap(oppSquad, style) {
  const slugs = OPPONENT_STYLE_CARD_LOADOUTS[style] || OPPONENT_STYLE_CARD_LOADOUTS.mixed;
  const map = {};
  oppSquad.forEach((ninja, index) => {
    const slug = slugs[index];
    if (slug) {
      map[ninja.id] = makeEquippedCard(slug, { userTacticCardId: 9000 + ninja.id });
    }
  });
  return map;
}

async function loadActiveSquad(userId) {
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  return { ninjas, orderCounts: summarizeSquadOrders(ninjas) };
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
    .filter((n) => n.preparation_type)
    .map((ninja) => {
      const grossCost = computeTrainingCost(ninja);
      const netCost = applyPercentDiscount(grossCost, heritage.trainingDiscountPct);
      const gainPreview = computeTrainingGain(ninja);
      return {
        ninjaId: ninja.id,
        ninjaName: ninja.name,
        focus: ninja.preparation_type,
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

  const [{ ninjas, orderCounts }, cardRows, heritageBonuses, heritageScrolls, seasonStats] =
    await Promise.all([
      loadActiveSquad(userId),
      getTacticCardsForNinjas(userId).catch(() => []),
      getHeritageBonuses(userId),
      listHeritageScrolls(userId),
      getSeasonMatchStats(userId, pool),
    ]);

  const ordersAdvice = buildOrdersAdvice(orderCounts, lang);
  const trainingRoi = buildTrainingRoi(ninjas, heritageBonuses);
  const preparationChallenges = buildPreparationChallenges({
    ninjas,
    cardRows,
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

  const opponentStyleOptions = OPPONENT_STYLE_OPTIONS.map((value) => ({
    value,
    label: OPPONENT_STYLE_LABELS[lang][value],
  }));

  return {
    seasonStats,
    orders: ordersAdvice,
    composition: ordersAdvice,
    heritage: heritageSummary,
    trainingRoi,
    preparationChallenges,
    opponentStyleOptions,
    compositionOptions: opponentStyleOptions,
    levelOptions: OPPONENT_LEVEL_IDS.map((value) => ({
      value,
      label: OPPONENT_LEVEL_LABELS[lang][value],
      multiplier: getOpponentLevelMultiplier(value),
    })),
  };
}

export async function simulateEliteMatchup(
  userId,
  { opponentComposition, opponentStyle, opponentLevel, runs = 100, locale = 'fr' } = {}
) {
  await assertEliteToolsAccess(userId);

  const lang = locale === 'en' ? 'en' : 'fr';
  const styleInput = opponentStyle ?? opponentComposition;
  const opponentStyleId = OPPONENT_STYLE_OPTIONS.includes(styleInput)
    ? styleInput
    : normalizeOrderStyle(styleInput);
  const level = normalizeOpponentLevel(opponentLevel);

  const { ninjas, orderCounts } = await loadActiveSquad(userId);
  if (ninjas.length < 3) {
    const error = new Error('Escouade active incomplète pour la simulation.');
    error.statusCode = 400;
    throw error;
  }

  const cardRows = await getTacticCardsForNinjas(userId).catch(() => []);
  const mySquad = ninjas.map(dbNinjaToSim);
  const oppSquad = buildOpponentSquadFromPlayer(ninjas, opponentStyleId, level).map(dbNinjaToSim);
  const runCount = Math.min(200, Math.max(20, Number(runs) || 100));

  const result = runMonteCarlo({
    slotANinjas: mySquad,
    slotBNinjas: oppSquad,
    runs: runCount,
    favoriteSide: 'slotA',
    slotATacticCards: cardRowsToMap(cardRows),
    slotBTacticCards: buildOpponentCardMap(oppSquad, opponentStyleId),
  });

  const winPct = result.slotAWinPct;
  const levelLabel = OPPONENT_LEVEL_LABELS[lang][level];

  return {
    myComposition: 'orders',
    opponentComposition: opponentStyleId,
    opponentStyle: opponentStyleId,
    opponentLevel: level,
    opponentLevelLabel: levelLabel,
    opponentLevelMultiplier: getOpponentLevelMultiplier(level),
    myCompositionLabel: buildOrdersAdvice(orderCounts, lang).label,
    opponentCompositionLabel: OPPONENT_STYLE_LABELS[lang][opponentStyleId],
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
      opponentStyle: opponentStyleId,
      opponentLevel: level,
      locale: lang,
      squadContext: {
        orderCounts,
        avgMoral: summarizeSquadMoral(ninjas),
        cardsEquipped: cardRows.length,
      },
    }),
  };
}

export async function getEliteToolsPayloadForUser(userId) {
  const locale = await getUserLanguage(userId);
  return getEliteToolsPayload(userId, locale);
}
