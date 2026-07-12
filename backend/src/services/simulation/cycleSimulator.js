/**
 * Simulation multi-cycles en mémoire (sans BDD).
 * Mesure win%/nul%, upsets, KO, croissance stats, impact tactiques.
 */

import { simulateCombat } from '../combat/combatEngine.js';
import { buildCombatTeam } from '../combat/matchLoader.js';
import { FORME_DOWNGRADE } from '../combat/constants.js';
import { computeTrainingSession, parseStatResiduals } from '../training.js';
import { clampStatToGradeCap } from '../gradeProgression.js';
import { clampStat } from '../ninjaStats.js';
import { collectEquipmentSummary } from '../combat/equipment.js';
import {
  LOADOUT_MISPLACED_SMOKE,
  LOADOUT_OPTIMIZED_UNDERDOG,
  LOADOUT_SMOKE_TANK,
  UTILITY_LOADOUTS,
} from './utilityLoadouts.js';

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];
const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
const TRAITS = ['Discipline', 'Temeraire', 'Altruiste', 'Egoiste', 'Faineant'];
const STRATEGIES = ['Normal', 'Offensive', 'Tank', 'Protect'];

function pick(arr, i = 0) {
  return arr[i % arr.length];
}

export function cloneNinja(ninja) {
  return {
    ...ninja,
    stat_residuals: parseStatResiduals(ninja),
    training_residual: ninja.training_residual ?? 0,
  };
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

function teamDataFromNinjas(
  userId,
  ninjas,
  sensei = { name: 'Sensei', chakra_pool: 100, training_focus: 'Ninjutsu' },
  equipmentByNinja = {},
  tacticCardByNinja = {}
) {
  return {
    userId,
    sensei,
    ninjas: ninjas.map(cloneNinja),
    equipmentByNinja,
    tacticCardByNinja,
  };
}

/** Le moteur de combat utilise encore home/away en interne — slot A = home, slot B = away. */
const COMBAT_SLOT_A = 'home';
const COMBAT_SLOT_B = 'away';

function combatWinnerToSlot(winner) {
  if (winner === 'draw') return 'draw';
  return winner === COMBAT_SLOT_A ? 'slotA' : 'slotB';
}

function runSingleMatch(
  slotANinjas,
  slotBNinjas,
  slotASensei,
  slotBSensei,
  slotAEquipment = {},
  slotBEquipment = {},
  slotATacticCards = {},
  slotBTacticCards = {}
) {
  const slotA = buildCombatTeam(
    teamDataFromNinjas(1, slotANinjas, slotASensei, slotAEquipment, slotATacticCards),
    COMBAT_SLOT_A
  );
  const slotB = buildCombatTeam(
    teamDataFromNinjas(2, slotBNinjas, slotBSensei, slotBEquipment, slotBTacticCards),
    COMBAT_SLOT_B
  );
  return simulateCombat(slotA, slotB);
}

function initOutcomeCounter() {
  return { slotA: 0, slotB: 0, draw: 0, ko: 0, totalTours: 0, upsets: 0, matches: 0 };
}

function recordOutcome(counter, result, favoriteSide = 'slotA') {
  counter.matches += 1;
  counter.totalTours += result.endingTour;
  if (result.endReason === 'ko') counter.ko += 1;

  const winnerSlot = combatWinnerToSlot(result.winner);
  if (winnerSlot === 'draw') counter.draw += 1;
  else if (winnerSlot === 'slotA') counter.slotA += 1;
  else counter.slotB += 1;

  if (winnerSlot !== 'draw') {
    const underdogWon =
      (favoriteSide === 'slotA' && winnerSlot === 'slotB') ||
      (favoriteSide === 'slotB' && winnerSlot === 'slotA');
    if (underdogWon) counter.upsets += 1;
  }

  return result;
}

function pct(n, total) {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

function summarize(counter, favoriteSide = 'slotA') {
  const m = counter.matches;
  const favWins = favoriteSide === 'slotA' ? counter.slotA : counter.slotB;
  const favLoss = favoriteSide === 'slotA' ? counter.slotB : counter.slotA;
  return {
    matches: m,
    winPctFavorite: pct(favWins, m),
    drawPct: pct(counter.draw, m),
    lossPctFavorite: pct(favLoss, m),
    upsetPct: pct(counter.upsets, m),
    koPct: pct(counter.ko, m),
    avgTours: m ? Math.round((counter.totalTours / m) * 10) / 10 : 0,
    slotAWinPct: pct(counter.slotA, m),
    slotBWinPct: pct(counter.slotB, m),
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

export function applyTrainingToSquad(ninjas, { globalTrainingType = 'Chakra' } = {}) {
  const logs = [];
  for (const ninja of ninjas) {
    const prepType = ninja.preparation_type ?? ninja.training_focus;
    const sessions = [];
    if (globalTrainingType) {
      sessions.push(computeTrainingSession(ninja, globalTrainingType, 'global', { rngMultiplier: 1 }));
    }
    if (prepType && ninja.squad_position) {
      sessions.push(computeTrainingSession(ninja, prepType, 'preparation', { rngMultiplier: 1 }));
    }

    for (const session of sessions) {
      if (session.skipped) continue;
      const residuals = parseStatResiduals(ninja);
      for (const { column, gain } of session.gains) {
        const residual = (Number(residuals[column]) || 0) + gain;
        const wholePoints = Math.floor(residual);
        residuals[column] = residual - wholePoints;
        if (wholePoints > 0) {
          ninja[column] = clampStatToGradeCap(ninja, column, ninja[column] + wholePoints);
          logs.push({ ninja: ninja.name, stat: column, delta: wholePoints });
        }
      }
      ninja.stat_residuals = residuals;
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
export function runMonteCarlo({
  slotANinjas,
  slotBNinjas,
  runs = 500,
  favoriteSide = 'slotA',
  slotAEquipment = {},
  slotBEquipment = {},
  slotATacticCards = {},
  slotBTacticCards = {},
}) {
  const counter = initOutcomeCounter();
  const slotASensei = { name: 'Sensei A', chakra_pool: 100, training_focus: 'Ninjutsu' };
  const slotBSensei = { name: 'Sensei B', chakra_pool: 100, training_focus: 'Taijutsu' };
  let consumablesTriggered = 0;
  let cardProcs = 0;
  let matchesWithCardProc = 0;
  let errors = 0;

  for (let i = 0; i < runs; i += 1) {
    try {
      const result = runSingleMatch(
        slotANinjas.map(cloneNinja),
        slotBNinjas.map(cloneNinja),
        slotASensei,
        slotBSensei,
        slotAEquipment,
        slotBEquipment,
        slotATacticCards,
        slotBTacticCards
      );
      recordOutcome(counter, result, favoriteSide);
      const summary = collectEquipmentSummary([
        ...result.homeTeam.fighters,
        ...result.awayTeam.fighters,
      ]);
      consumablesTriggered += summary.reduce((s, row) => s + row.consumedSlugs.length, 0);
      const procs = result.logs.filter((l) => l.type === 'tactic_card').length;
      cardProcs += procs;
      if (procs > 0) matchesWithCardProc += 1;
    } catch (err) {
      errors += 1;
      if (errors === 1) console.error('runMonteCarlo error:', err);
    }
  }

  const effectiveRuns = runs - errors;
  return {
    ...summarize(counter, favoriteSide),
    consumablesPerMatch: effectiveRuns
      ? Math.round((consumablesTriggered / effectiveRuns) * 100) / 100
      : 0,
    cardProcsPerMatch: effectiveRuns ? Math.round((cardProcs / effectiveRuns) * 1000) / 1000 : 0,
    matchProcPct: pct(matchesWithCardProc, effectiveRuns),
    errors,
  };
}

/**
 * Plusieurs cycles : entraînement + 1 match/cycle, rosters évoluent.
 */
export function runMultiCycle({
  slotANinjas: initialSlotA,
  slotBNinjas: initialSlotB,
  cycles = 10,
  favoriteSide = 'slotA',
  slotASensei = { name: 'Sensei A', chakra_pool: 100, training_focus: 'Ninjutsu' },
  slotBSensei = { name: 'Sensei B', chakra_pool: 100, training_focus: 'Genjutsu' },
}) {
  const slotA = initialSlotA.map(cloneNinja);
  const slotB = initialSlotB.map(cloneNinja);
  const counter = initOutcomeCounter();
  const timeline = [];

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const result = runSingleMatch(slotA, slotB, slotASensei, slotBSensei);
    recordOutcome(counter, result, favoriteSide);

    const koSlotA = result.koNinjaIds.filter((k) => k.side === COMBAT_SLOT_A);
    const koSlotB = result.koNinjaIds.filter((k) => k.side === COMBAT_SLOT_B);
    applyPostMatchToSquad(slotA, koSlotA);
    applyPostMatchToSquad(slotB, koSlotB);

    const typeA = trainingTypeFromSensei(slotASensei);
    const typeB = trainingTypeFromSensei(slotBSensei);
    for (const n of slotA) {
      n.preparation_type = typeA;
      n.squad_position = n.squad_position ?? 1;
    }
    for (const n of slotB) {
      n.preparation_type = typeB;
      n.squad_position = n.squad_position ?? 1;
    }
    applyTrainingToSquad(slotA, { globalTrainingType: typeA });
    applyTrainingToSquad(slotB, { globalTrainingType: typeB });

    timeline.push({
      cycle,
      winner: combatWinnerToSlot(result.winner),
      endReason: result.endReason,
      tours: result.endingTour,
      slotACombatSum: slotA.reduce((s, n) => s + sumCombat(n), 0),
      slotBCombatSum: slotB.reduce((s, n) => s + sumCombat(n), 0),
    });
  }

  return {
    summary: summarize(counter, favoriteSide),
    finalSlotA: squadSnapshot(slotA),
    finalSlotB: squadSnapshot(slotB),
    timeline,
  };
}

const LEGACY_FOCUS_TO_TYPE = {
  Taijutsu: 'Physique',
  Ninjutsu: 'Ninjutsu',
  Genjutsu: 'Genjutsu',
  Medecine: 'Medical',
  Vitesse: 'Physique',
  Intelligence: 'Chakra',
};

function trainingTypeFromSensei(sensei) {
  const raw = sensei?.global_training_type ?? sensei?.training_focus ?? 'Ninjutsu';
  return LEGACY_FOCUS_TO_TYPE[raw] ?? raw;
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

const COMPOSITION_NAMES = {
  assaut: 'Assaut',
  mur: 'Mur',
  flux: 'Flux',
  equilibre: 'Équilibre',
};

function squadForComposition(comp, prefix, idOffset, scale = 1) {
  if (comp === 'equilibre') return createEquilibreSquad(prefix, idOffset, scale);
  return createPureCompositionSquad(prefix, comp, idOffset, scale);
}

const NEUTRAL_SENSEI = {
  name: 'Sensei',
  chakra_pool: 100,
  training_focus: 'Ninjutsu',
};

/**
 * Un matchup symétrique : chaque compo passe une fois en « slot A » et une fois en « slot B ».
 * Pas de bonus domicile dans le moteur — on moyenne pour annuler le bruit RNG.
 */
export function runSymmetricCompositionMatchup(compA, compB, runs = 600) {
  const half = Math.floor(runs / 2);

  if (compA === compB) {
    let slotAWins = 0;
    let slotBWins = 0;
    let draws = 0;
    const squad = squadForComposition(compA, 'T', 0, 1);

    const runMirror = (count) => {
      for (let i = 0; i < count; i += 1) {
        const result = runSingleMatch(
          squad.map(cloneNinja),
          squad.map((n) => cloneNinja({ ...n, id: n.id + 100 })),
          NEUTRAL_SENSEI,
          NEUTRAL_SENSEI
        );
        if (result.winner === 'draw') draws += 1;
        else if (result.winner === COMBAT_SLOT_A) slotAWins += 1;
        else slotBWins += 1;
      }
    };

    runMirror(half);
    const swapped = squad.map((n) => cloneNinja({ ...n, id: n.id + 200 }));
    for (let i = 0; i < runs - half; i += 1) {
      const result = runSingleMatch(
        swapped.map((n) => cloneNinja({ ...n, id: n.id + 100 })),
        swapped.map(cloneNinja),
        NEUTRAL_SENSEI,
        NEUTRAL_SENSEI
      );
      if (result.winner === 'draw') draws += 1;
      else if (result.winner === COMBAT_SLOT_A) slotBWins += 1;
      else slotAWins += 1;
    }

    return {
      matches: runs,
      mirror: true,
      compA,
      compB,
      compAName: COMPOSITION_NAMES[compA],
      compBName: COMPOSITION_NAMES[compB],
      slotAWinPct: pct(slotAWins, runs),
      slotBWinPct: pct(slotBWins, runs),
      drawPct: pct(draws, runs),
    };
  }

  const wins = { [compA]: 0, [compB]: 0, draw: 0 };

  const runBatch = (firstComp, secondComp, count) => {
    const first = squadForComposition(firstComp, 'T1', 0, 1);
    const second = squadForComposition(secondComp, 'T2', 10, 1);
    for (let i = 0; i < count; i += 1) {
      const result = runSingleMatch(
        first.map(cloneNinja),
        second.map(cloneNinja),
        NEUTRAL_SENSEI,
        NEUTRAL_SENSEI
      );
      if (result.winner === 'draw') wins.draw += 1;
      else if (result.winner === COMBAT_SLOT_A) wins[firstComp] += 1;
      else wins[secondComp] += 1;
    }
  };

  runBatch(compA, compB, half);
  runBatch(compB, compA, runs - half);

  const total = runs;
  return {
    matches: total,
    [`${compA}WinPct`]: pct(wins[compA], total),
    [`${compB}WinPct`]: pct(wins[compB], total),
    compA,
    compB,
    compAName: COMPOSITION_NAMES[compA],
    compBName: COMPOSITION_NAMES[compB],
    drawPct: pct(wins.draw, total),
    wins,
  };
}

/**
 * Matrice du cercle de compositions — résultats par compo, pas slot A/B.
 */
export function runCompositionMatrix({ runs = 600 } = {}) {
  const matchups = [
    { a: 'assaut', b: 'mur', favored: 'assaut', kind: 'circle' },
    { a: 'mur', b: 'flux', favored: 'mur', kind: 'circle' },
    { a: 'flux', b: 'assaut', favored: 'flux', kind: 'circle' },
    { a: 'assaut', b: 'assaut', favored: null, kind: 'mirror' },
    { a: 'mur', b: 'equilibre', favored: null, kind: 'neutral' },
    { a: 'assaut', b: 'equilibre', favored: null, kind: 'neutral' },
    { a: 'flux', b: 'equilibre', favored: null, kind: 'neutral' },
  ];

  const results = {};

  for (const m of matchups) {
    const row = runSymmetricCompositionMatchup(m.a, m.b, runs);
    const label = `${COMPOSITION_NAMES[m.a]} vs ${COMPOSITION_NAMES[m.b]}`;
    const favoredWin =
      m.favored === m.a ? row[`${m.a}WinPct`] : m.favored === m.b ? row[`${m.b}WinPct`] : null;

    results[label] = {
      ...row,
      label,
      favored: m.favored,
      kind: m.kind,
      onTarget:
        m.kind === 'circle'
          ? favoredWin >= 54 && favoredWin <= 70
          : m.kind === 'mirror'
            ? row.slotAWinPct >= 38 && row.slotAWinPct <= 62
            : m.kind === 'neutral'
              ? row[`${m.a}WinPct`] >= 30 && row[`${m.b}WinPct`] >= 15
              : false,
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
  const slotABase = createBalancedSquad('EscA', 0, 1);
  const slotBBase = createBalancedSquad('EscB', 10, 1);
  const slotBBuffed = createBalancedSquad('Bot', 20, 1.4);
  const demoBuffed = createBalancedSquad('Demo', 30, 1.4);

  const equal = runMonteCarlo({ slotANinjas: slotABase, slotBNinjas: slotBBase, runs, favoriteSide: 'slotA' });

  const demoFavoredVsBot = runMonteCarlo({
    slotANinjas: demoBuffed,
    slotBNinjas: slotBBase,
    runs,
    favoriteSide: 'slotA',
  });

  const demoVsBot = runMonteCarlo({
    slotANinjas: slotABase,
    slotBNinjas: slotBBuffed,
    runs,
    favoriteSide: 'slotB',
  });

  const slotATactical = slotABase.map(cloneNinja);
  const slotBTactical = slotBBuffed.map(cloneNinja);
  slotATactical[0].battle_strategy = 'Offensive';
  slotATactical[1].battle_strategy = 'Tank';
  slotATactical[2].battle_strategy = 'Protect';
  const tacticsImpact = runMonteCarlo({
    slotANinjas: slotATactical,
    slotBNinjas: slotBTactical,
    runs,
    favoriteSide: 'slotB',
  });

  const slotAAgg = slotABase.map(cloneNinja);
  const slotBAgg = slotBBuffed.map(cloneNinja);
  applyTactics(slotAAgg, 'aggressive');
  applyTactics(slotBAgg, 'normal');
  const badTactics = runMonteCarlo({
    slotANinjas: slotAAgg,
    slotBNinjas: slotBAgg,
    runs,
    favoriteSide: 'slotB',
  });

  const multiCycle = runMultiCycle({
    slotANinjas: slotABase,
    slotBNinjas: slotBBase,
    cycles,
    favoriteSide: 'slotA',
  });

  const multiCycleGrowth = runMultiCycle({
    slotANinjas: slotABase.map(cloneNinja),
    slotBNinjas: slotBBuffed.map(cloneNinja),
    cycles,
    favoriteSide: 'slotB',
  });

  const compositionMatrix = runCompositionMatrix({ runs: Math.max(400, Math.floor(runs * 0.75)) });
  const utilityBenchmark = runUtilityBenchmark({ runs });

  return {
    meta: { runs, cycles, generatedAt: new Date().toISOString() },
    utilityBenchmark,
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

/**
 * Benchmark objets utilitaires — loadouts documentés dans utilityLoadouts.js
 */
export function runUtilityBenchmark({ runs = 400 } = {}) {
  const botSquad = createBalancedSquad('Bot', 20, 1.4).map(cloneNinja);
  const underdogTactical = createBalancedSquad('Under', 0, 1).map(cloneNinja);
  underdogTactical[0].battle_strategy = 'Offensive';
  underdogTactical[1].battle_strategy = 'Tank';
  underdogTactical[2].battle_strategy = 'Protect';

  const baseline = runMonteCarlo({
    slotANinjas: underdogTactical,
    slotBNinjas: botSquad,
    runs,
    favoriteSide: 'slotB',
  });

  const withSmokeTank = runMonteCarlo({
    slotANinjas: underdogTactical,
    slotBNinjas: botSquad,
    runs,
    favoriteSide: 'slotB',
    slotAEquipment: LOADOUT_SMOKE_TANK.attach(underdogTactical),
  });

  const withOptimized = runMonteCarlo({
    slotANinjas: underdogTactical,
    slotBNinjas: botSquad,
    runs,
    favoriteSide: 'slotB',
    slotAEquipment: LOADOUT_OPTIMIZED_UNDERDOG.attach(underdogTactical),
  });

  const withMisplaced = runMonteCarlo({
    slotANinjas: underdogTactical,
    slotBNinjas: botSquad,
    runs,
    favoriteSide: 'slotB',
    slotAEquipment: LOADOUT_MISPLACED_SMOKE.attach(underdogTactical),
  });

  const deltaWinA = (withItems, base) =>
    Math.round((withItems.slotAWinPct - base.slotAWinPct) * 10) / 10;

  return {
    loadouts: UTILITY_LOADOUTS.map((l) => ({
      id: l.id,
      label: l.label,
      description: l.description,
    })),
    scenarios: {
      underdogBaseline: {
        label: 'Underdog Off/Tank/Protect vs Bot +40 % (sans objet)',
        ...baseline,
      },
      smokeTankCoherent: {
        label: 'Underdog + fumigène Tank (plan cohérent)',
        ...withSmokeTank,
        winDeltaPts: deltaWinA(withSmokeTank, baseline),
      },
      optimizedDouble: {
        label: 'Underdog + fumigène Tank + herbes support',
        ...withOptimized,
        winDeltaPts: deltaWinA(withOptimized, baseline),
      },
      smokeMisplaced: {
        label: 'Underdog + fumigène sur Offensive (hors plan)',
        ...withMisplaced,
        winDeltaPts: deltaWinA(withMisplaced, baseline),
      },
    },
    targets: {
      misplacedMaxPts: 2,
      coherentMinPts: 4,
      coherentMaxPts: 8,
      doubleMaxPts: 12,
    },
  };
}

export { summarize, TACTIC_PRESETS };
