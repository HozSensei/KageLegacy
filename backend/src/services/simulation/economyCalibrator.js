/**
 * Calibrage analytique des primes match — priorité milestone-9 #32.
 * Modèle en mémoire (pas de BDD) : sinks fixes + revenus probabilistes.
 */

export const DEFAULT_SALARIES_PER_CYCLE = 1880;
export const DEFAULT_TRAINING_PER_NINJA = 478;
export const DEFAULT_SHOP_ITEM_PRICE = 400;
export const DEFAULT_START_RYOS = 15400;
export const OVERDRAFT_FLOOR = -5000;

/** Profils joueur pour le calibrage */
export const ECONOMY_PROFILES = {
  casual: {
    label: 'Joueur casual',
    description: '1 match ligue · 1 mission routine · 1 achat léger',
    salaries: DEFAULT_SALARIES_PER_CYCLE,
    trainingNinjas: 0,
    shopItems: 1,
    shopItemPrice: 350,
    missionsRyos: 400,
    matchOutcomes: { win: 0.45, draw: 0.32, loss: 0.23 },
    examCostEvery: 0,
    dispensaryEvery: 0,
  },
  moderate: {
    label: 'Joueur modéré',
    description: '1 match · 2 missions (routine + infiltration) · 1 achat · 1 ninja entraîné',
    salaries: DEFAULT_SALARIES_PER_CYCLE,
    trainingNinjas: 1,
    shopItems: 1,
    shopItemPrice: DEFAULT_SHOP_ITEM_PRICE,
    missionsRyos: 1100,
    matchOutcomes: { win: 0.5, draw: 0.3, loss: 0.2 },
    examCostEvery: 0,
    dispensaryEvery: 0,
  },
  engaged: {
    label: 'Joueur engagé',
    description: '1 match · 3 missions · 2 achats · 2 ninjas entraînés · examen / 8 cycles',
    salaries: DEFAULT_SALARIES_PER_CYCLE,
    trainingNinjas: 2,
    shopItems: 2,
    shopItemPrice: 450,
    missionsRyos: 2100,
    matchOutcomes: { win: 0.55, draw: 0.28, loss: 0.17 },
    examCostEvery: 8,
    examCost: 630,
    dispensaryEvery: 12,
    dispensaryCost: 500,
  },
};

function cycleSpend(profile) {
  let spend =
    profile.salaries +
    profile.trainingNinjas * DEFAULT_TRAINING_PER_NINJA +
    profile.shopItems * profile.shopItemPrice;
  if (profile.examCostEvery && profile.examCost) {
    spend += profile.examCost / profile.examCostEvery;
  }
  if (profile.dispensaryEvery && profile.dispensaryCost) {
    spend += profile.dispensaryCost / profile.dispensaryEvery;
  }
  return spend;
}

function expectedMatchRyos(profile, winRyos, drawRyos) {
  const { win, draw } = profile.matchOutcomes;
  return win * winRyos + draw * drawRyos;
}

function simulateProfile({
  profile,
  cycles,
  startRyos,
  winRyos,
  drawRyos,
}) {
  const spend = cycleSpend(profile);
  let ryos = startRyos;
  let minRyos = startRyos;
  let debtCycles = 0;

  for (let c = 0; c < cycles; c += 1) {
    const income = expectedMatchRyos(profile, winRyos, drawRyos) + (profile.missionsRyos || 0);
    ryos += income - spend;
    minRyos = Math.min(minRyos, ryos);
    if (ryos < 0) debtCycles += 1;
  }

  return {
    profileId: profile.id,
    ryosEnd: Math.round(ryos),
    minRyos: Math.round(minRyos),
    debtCycles,
    netPerCycle: Math.round(expectedMatchRyos(profile, winRyos, drawRyos) + (profile.missionsRyos || 0) - spend),
  };
}

/**
 * Balaye les combinaisons win/draw et retourne la recommandation.
 * Choisit la combinaison la plus basse qui maintient le profil modéré au-dessus du seuil,
 * sinon celle qui maximise la trésorerie minimale du profil modéré.
 */
export function calibrateMatchPrizes({
  profiles = ECONOMY_PROFILES,
  cycles = 20,
  startRyos = DEFAULT_START_RYOS,
  winCandidates = [1200, 1400, 1500, 1600, 1800, 2000, 2200, 2500],
  drawCandidates = [400, 500, 600, 700, 800],
  minRyosTarget = 3000,
} = {}) {
  const profileEntries = Object.entries(profiles).map(([id, p]) => ({ id, ...p }));

  const grid = [];

  for (const winRyos of winCandidates) {
    for (const drawRyos of drawCandidates) {
      if (drawRyos > winRyos * 0.55) continue;

      const results = profileEntries.map((profile) =>
        simulateProfile({ profile, cycles, startRyos, winRyos, drawRyos })
      );

      const byId = Object.fromEntries(results.map((r) => [r.profileId, r]));
      const moderate = byId.moderate;
      const engaged = byId.engaged;
      const casual = byId.casual;

      const meetsModerate = moderate.minRyos >= minRyosTarget;
      const meetsEngagedFloor = engaged.minRyos >= 0;
      const meetsCasual = casual.minRyos >= 5000;

      grid.push({
        winRyos,
        drawRyos,
        meetsModerate,
        meetsEngagedFloor,
        meetsCasual,
        moderateMin: moderate.minRyos,
        engagedMin: engaged.minRyos,
        casualMin: casual.minRyos,
        results: byId,
      });
    }
  }

  const viable = grid.filter((r) => r.meetsModerate && r.meetsEngagedFloor);
  let best;

  if (viable.length) {
    viable.sort((a, b) => a.winRyos - b.winRyos || a.drawRyos - b.drawRyos);
    best = viable[0];
  } else {
    grid.sort((a, b) => b.moderateMin - a.moderateMin || a.winRyos - b.winRyos);
    best = grid[0];
  }

  const current = grid.find(
    (r) =>
      r.winRyos === winCandidates.find((w) => w === 1500) &&
      r.drawRyos === drawCandidates.find((d) => d === 500)
  ) || grid.find((r) => r.winRyos === 1500 && r.drawRyos === 500);

  return {
    cycles,
    startRyos,
    minRyosTarget,
    recommended: { winRyos: best.winRyos, drawRyos: best.drawRyos },
    currentConstants: current
      ? { winRyos: current.winRyos, drawRyos: current.drawRyos, results: current.results }
      : null,
    viableCount: viable.length,
    grid: [...grid].sort((a, b) => b.moderateMin - a.moderateMin).slice(0, 8),
    profiles: profileEntries,
  };
}

export { simulateProfile, cycleSpend, expectedMatchRyos };
