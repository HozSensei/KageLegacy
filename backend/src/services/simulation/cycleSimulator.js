/**
 * Simulation multi-cycles en mémoire (sans BDD).
 * Mesure win%/nul%, upsets, KO, croissance stats, impact tactiques.
 */

import { simulateCombat } from '../combat/combatEngine.js';
import { buildCombatTeam } from '../combat/matchLoader.js';
import { FORME_DOWNGRADE } from '../combat/constants.js';
import { computeTrainingGain } from '../training.js';
import { clampStatToGradeCap, isStatAtGradeCap } from '../gradeProgression.js';
import { clampStat } from '../ninjaStats.js';

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];
const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
const TRAITS = ['Discipline', 'Temeraire', 'Altruiste', 'Egoiste', 'Faineant'];
const STRATEGIES = ['Normal', 'Offensive', 'Tank', 'Protect'];

function pick(arr, i = 0) {
  return arr[i % arr.length];
}

export function cloneNinja(ninja) {
  return { ...ninja, training_residual: ninja.training_residual ?? 0 };
}

export function createNinja({
  id,
  name,
  grade = 'Genin',
  battle_strategy = 'Normal',
  weekly_forme = 'Passable',
  moral = 15,
  age = 15,
  stats = {},
}) {
  const base = {
    taijutsu: 7,
    ninjutsu: 7,
    genjutsu: 6,
    medecine: 5,
    vitesse: 7,
    intelligence: 7,
  };
  const merged = { ...base, ...stats };
  return {
    id,
    name,
    grade,
    age,
    battle_strategy,
    weekly_forme,
    moral,
    character_trait: 'Discipline',
    element_affinity: pick(ELEMENTS, id),
    training_residual: 0,
    chunin_exam_requested: false,
    ...merged,
  };
}

/** Silhouettes type escouade (tai / nin / support). */
export function createBalancedSquad(prefix, idOffset = 0, statScale = 1) {
  const scale = (v) => clampStat(Math.round(v * statScale));
  return [
    createNinja({
      id: idOffset + 1,
      name: `${prefix} Tai`,
      battle_strategy: 'Offensive',
      stats: {
        taijutsu: scale(9),
        ninjutsu: scale(6),
        genjutsu: scale(5),
        medecine: scale(5),
        vitesse: scale(8),
        intelligence: scale(7),
      },
    }),
    createNinja({
      id: idOffset + 2,
      name: `${prefix} Nin`,
      grade: 'Chunin',
      battle_strategy: 'Normal',
      stats: {
        taijutsu: scale(6),
        ninjutsu: scale(10),
        genjutsu: scale(7),
        medecine: scale(5),
        vitesse: scale(7),
        intelligence: scale(8),
      },
    }),
    createNinja({
      id: idOffset + 3,
      name: `${prefix} Sup`,
      battle_strategy: 'Protect',
      stats: {
        taijutsu: scale(6),
        ninjutsu: scale(6),
        genjutsu: scale(8),
        medecine: scale(8),
        vitesse: scale(6),
        intelligence: scale(9),
      },
    }),
  ];
}

function teamDataFromNinjas(userId, ninjas, sensei = { name: 'Sensei', chakra_pool: 100, specialty: 'Ninjutsu' }) {
  return {
    userId,
    sensei,
    ninjas: ninjas.map(cloneNinja),
    equipmentByNinja: {},
  };
}

function runSingleMatch(homeNinjas, awayNinjas, homeSensei, awaySensei) {
  const home = buildCombatTeam(teamDataFromNinjas(1, homeNinjas, homeSensei), 'home');
  const away = buildCombatTeam(teamDataFromNinjas(2, awayNinjas, awaySensei), 'away');
  return simulateCombat(home, away);
}

function initOutcomeCounter() {
  return { home: 0, away: 0, draw: 0, ko: 0, totalTours: 0, upsets: 0, matches: 0 };
}

function recordOutcome(counter, result, favoriteSide = 'home') {
  counter.matches += 1;
  counter.totalTours += result.endingTour;
  if (result.endReason === 'ko') counter.ko += 1;

  if (result.winner === 'draw') counter.draw += 1;
  else if (result.winner === 'home') counter.home += 1;
  else counter.away += 1;

  if (result.winner !== 'draw') {
    const underdogWon =
      (favoriteSide === 'home' && result.winner === 'away') ||
      (favoriteSide === 'away' && result.winner === 'home');
    if (underdogWon) counter.upsets += 1;
  }

  return result;
}

function pct(n, total) {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

function summarize(counter, favoriteSide = 'home') {
  const m = counter.matches;
  const favWins = favoriteSide === 'home' ? counter.home : counter.away;
  const favLoss = favoriteSide === 'home' ? counter.away : counter.home;
  return {
    matches: m,
    winPctFavorite: pct(favWins, m),
    drawPct: pct(counter.draw, m),
    lossPctFavorite: pct(favLoss, m),
    upsetPct: pct(counter.upsets, m),
    koPct: pct(counter.ko, m),
    avgTours: m ? Math.round((counter.totalTours / m) * 10) / 10 : 0,
    homeWinPct: pct(counter.home, m),
    awayWinPct: pct(counter.away, m),
  };
}

export function applyPostMatchToSquad(ninjas, koNinjaIds) {
  const koSet = new Set(koNinjaIds.map((k) => k.id));
  for (const ninja of ninjas) {
    if (koSet.has(ninja.id)) {
      ninja.weekly_forme = FORME_DOWNGRADE[ninja.weekly_forme] || ninja.weekly_forme;
    }
  }
}

export function applyTrainingToSquad(ninjas, sensei) {
  const logs = [];
  for (const ninja of ninjas) {
    const result = computeTrainingGain(ninja, sensei);
    if (result.skipped) continue;

    const column = result.column;
    if (isStatAtGradeCap(ninja, column)) continue;

    const residual = Number(ninja.training_residual || 0) + result.gain;
    const wholePoints = Math.floor(residual);
    ninja.training_residual = residual - wholePoints;

    if (wholePoints > 0) {
      ninja[column] = clampStatToGradeCap(ninja, column, ninja[column] + wholePoints);
      logs.push({ ninja: ninja.name, stat: column, delta: wholePoints });
    }
  }
  return logs;
}

function sumCombat(ninja) {
  return ninja.taijutsu + ninja.ninjutsu + ninja.genjutsu + ninja.medecine;
}

function squadSnapshot(ninjas) {
  return ninjas.map((n) => ({
    name: n.name,
    grade: n.grade,
    forme: n.weekly_forme,
    combat: sumCombat(n),
    tai: n.taijutsu,
    nin: n.ninjutsu,
    gen: n.genjutsu,
  }));
}

/**
 * Monte Carlo : mêmes rosters, N matchs.
 */
export function runMonteCarlo({ homeNinjas, awayNinjas, runs = 500, favoriteSide = 'home' }) {
  const counter = initOutcomeCounter();
  const homeSensei = { name: 'Home', chakra_pool: 100, specialty: 'Ninjutsu', training_focus: 'Ninjutsu' };
  const awaySensei = { name: 'Away', chakra_pool: 100, specialty: 'Taijutsu', training_focus: 'Taijutsu' };

  for (let i = 0; i < runs; i += 1) {
    const result = runSingleMatch(
      homeNinjas.map(cloneNinja),
      awayNinjas.map(cloneNinja),
      homeSensei,
      awaySensei
    );
    recordOutcome(counter, result, favoriteSide);
  }

  return summarize(counter, favoriteSide);
}

/**
 * Plusieurs cycles : entraînement + 1 match/cycle, rosters évoluent.
 */
export function runMultiCycle({
  homeNinjas: initialHome,
  awayNinjas: initialAway,
  cycles = 10,
  favoriteSide = 'home',
  homeSensei = { name: 'Home', chakra_pool: 100, specialty: 'Ninjutsu', training_focus: 'Ninjutsu' },
  awaySensei = { name: 'Away', chakra_pool: 100, specialty: 'Genjutsu', training_focus: 'Genjutsu' },
}) {
  const home = initialHome.map(cloneNinja);
  const away = initialAway.map(cloneNinja);
  const counter = initOutcomeCounter();
  const timeline = [];

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const result = runSingleMatch(home, away, homeSensei, awaySensei);
    recordOutcome(counter, result, favoriteSide);

    const koHome = result.koNinjaIds.filter((k) => k.side === 'home');
    const koAway = result.koNinjaIds.filter((k) => k.side === 'away');
    applyPostMatchToSquad(home, koHome);
    applyPostMatchToSquad(away, koAway);

    applyTrainingToSquad(home, homeSensei);
    applyTrainingToSquad(away, awaySensei);

    timeline.push({
      cycle,
      winner: result.winner,
      endReason: result.endReason,
      tours: result.endingTour,
      homeCombatSum: home.reduce((s, n) => s + sumCombat(n), 0),
      awayCombatSum: away.reduce((s, n) => s + sumCombat(n), 0),
    });
  }

  return {
    summary: summarize(counter, favoriteSide),
    finalHome: squadSnapshot(home),
    finalAway: squadSnapshot(away),
    timeline,
  };
}

const COMPOSITION_STRATEGY = {
  assaut: 'Offensive',
  mur: 'Tank',
  flux: 'Protect',
};

/** Escouade pure (2+ même consigne) pour le cercle Assaut/Flux/Mur. */
export function createPureCompositionSquad(prefix, composition, idOffset = 0, statScale = 1) {
  const strategy = COMPOSITION_STRATEGY[composition] || 'Normal';
  return createBalancedSquad(prefix, idOffset, statScale).map((n) => ({
    ...cloneNinja(n),
    battle_strategy: strategy,
  }));
}

/** Escouade équilibrée Off/Tank/Protect — hors cercle, ~neutre. */
export function createEquilibreSquad(prefix, idOffset = 0, statScale = 1) {
  const squad = createBalancedSquad(prefix, idOffset, statScale).map(cloneNinja);
  squad[0].battle_strategy = 'Offensive';
  squad[1].battle_strategy = 'Tank';
  squad[2].battle_strategy = 'Protect';
  return squad;
}

/**
 * Matrice du cercle de compositions (mêmes stats, comps pures).
 * Cible : ~60 % win pour le côté avec avantage matchup (+20 pts).
 */
export function runCompositionMatrix({ runs = 600 } = {}) {
  const matchups = [
    { home: 'assaut', away: 'mur', expect: 'home', label: 'Assaut → Mur' },
    { home: 'mur', away: 'flux', expect: 'home', label: 'Mur → Flux' },
    { home: 'flux', away: 'assaut', expect: 'home', label: 'Flux → Assaut' },
    { home: 'mur', away: 'assaut', expect: 'away', label: 'Mur vs Assaut (désavantage)' },
    { home: 'assaut', away: 'flux', expect: 'away', label: 'Assaut vs Flux (désavantage)' },
    { home: 'flux', away: 'mur', expect: 'away', label: 'Flux vs Mur (désavantage)' },
    { home: 'assaut', away: 'assaut', expect: 'even', label: 'Miroir Assaut' },
    { home: 'mur', away: 'equilibre', expect: 'even', label: 'Mur vs Équilibre' },
    { home: 'equilibre', away: 'mur', expect: 'even', label: 'Équilibre vs Mur' },
    { home: 'assaut', away: 'equilibre', expect: 'even', label: 'Assaut vs Équilibre' },
    { home: 'equilibre', away: 'assaut', expect: 'even', label: 'Équilibre vs Assaut' },
    { home: 'flux', away: 'equilibre', expect: 'even', label: 'Flux vs Équilibre' },
    { home: 'equilibre', away: 'flux', expect: 'even', label: 'Équilibre vs Flux' },
  ];

  const results = {};

  for (const m of matchups) {
    const homeNinjas =
      m.home === 'equilibre'
        ? createEquilibreSquad('H', 0, 1)
        : createPureCompositionSquad('H', m.home, 0, 1);
    const awayNinjas =
      m.away === 'equilibre'
        ? createEquilibreSquad('A', 10, 1)
        : createPureCompositionSquad('A', m.away, 10, 1);

    const counter = initOutcomeCounter();
    for (let i = 0; i < runs; i += 1) {
      const result = runSingleMatch(
        homeNinjas.map(cloneNinja),
        awayNinjas.map(cloneNinja),
        { name: 'H', chakra_pool: 100, specialty: 'Ninjutsu', training_focus: 'Ninjutsu' },
        { name: 'A', chakra_pool: 100, specialty: 'Taijutsu', training_focus: 'Taijutsu' }
      );
      recordOutcome(counter, result, 'home');
    }

    const s = summarize(counter, 'home');
    results[m.label] = {
      ...s,
      expect: m.expect,
      onTarget:
        m.expect === 'even'
          ? s.homeWinPct >= 42 && s.homeWinPct <= 58
          : m.expect === 'home'
            ? s.homeWinPct >= 54 && s.homeWinPct <= 70
            : s.awayWinPct >= 54 && s.awayWinPct <= 70,
      fluxStyle:
        m.home === 'flux' || m.away === 'flux'
          ? { assautWinCap: Math.min(s.homeWinPct, s.awayWinPct) <= 12 }
          : null,
    };
  }

  return results;
}

const TACTIC_PRESETS = {
  normal: ['Normal', 'Normal', 'Normal'],
  balanced: ['Offensive', 'Tank', 'Protect'],
  aggressive: ['Offensive', 'Offensive', 'Offensive'],
};

export function applyTactics(ninjas, preset) {
  const strategies = TACTIC_PRESETS[preset] || TACTIC_PRESETS.normal;
  ninjas.forEach((n, i) => {
    n.battle_strategy = strategies[i] || 'Normal';
  });
}

/**
 * Benchmark complet — plusieurs scénarios.
 */
export function runFullBenchmark({ runs = 400, cycles = 12 } = {}) {
  const homeBase = createBalancedSquad('Home', 0, 1);
  const awayBase = createBalancedSquad('Away', 10, 1);
  const awayBuffed = createBalancedSquad('Bot', 20, 1.4);
  const homeBuffed = createBalancedSquad('Demo', 30, 1.4);

  const equal = runMonteCarlo({ homeNinjas: homeBase, awayNinjas: awayBase, runs, favoriteSide: 'home' });

  const demoFavoredVsBot = runMonteCarlo({
    homeNinjas: homeBuffed,
    awayNinjas: awayBase,
    runs,
    favoriteSide: 'home',
  });

  const demoVsBot = runMonteCarlo({
    homeNinjas: homeBase,
    awayNinjas: awayBuffed,
    runs,
    favoriteSide: 'away',
  });

  const homeTactical = homeBase.map(cloneNinja);
  const awayTactical = awayBuffed.map(cloneNinja);
  homeTactical[0].battle_strategy = 'Offensive';
  homeTactical[1].battle_strategy = 'Tank';
  homeTactical[2].battle_strategy = 'Protect';
  const tacticsImpact = runMonteCarlo({
    homeNinjas: homeTactical,
    awayNinjas: awayTactical,
    runs,
    favoriteSide: 'away',
  });

  const homeAgg = homeBase.map(cloneNinja);
  const awayAgg = awayBuffed.map(cloneNinja);
  applyTactics(homeAgg, 'aggressive');
  applyTactics(awayAgg, 'normal');
  const badTactics = runMonteCarlo({
    homeNinjas: homeAgg,
    awayNinjas: awayAgg,
    runs,
    favoriteSide: 'away',
  });

  const multiCycle = runMultiCycle({
    homeNinjas: homeBase,
    awayNinjas: awayBase,
    cycles,
    favoriteSide: 'home',
  });

  const multiCycleGrowth = runMultiCycle({
    homeNinjas: homeBase.map(cloneNinja),
    awayNinjas: awayBuffed.map(cloneNinja),
    cycles,
    favoriteSide: 'away',
  });

  const compositionMatrix = runCompositionMatrix({ runs: Math.max(400, Math.floor(runs * 0.75)) });

  return {
    meta: { runs, cycles, generatedAt: new Date().toISOString() },
    scenarios: {
      equalTeams: { label: 'Équipes symétriques', ...equal },
      demoPlus40VsStandard: {
        label: 'Démo +40 % stats vs escouade standard (favori = démo)',
        ...demoFavoredVsBot,
      },
      standardVsBotPlus40: {
        label: 'Standard vs Bot +40 % (favori = bot)',
        ...demoVsBot,
      },
      underdogTacticsVsBot: {
        label: 'Underdog équilibre (Off/Tank/Protect) vs Bot +40 % Normal',
        ...tacticsImpact,
      },
      underdogBadTactics: {
        label: 'Underdog triple Offensive vs Bot +40 %',
        ...badTactics,
      },
    },
    multiCycle: {
      equalTeams: multiCycle,
      botFavored: multiCycleGrowth,
    },
    compositionMatrix,
  };
}

export { summarize, TACTIC_PRESETS };
