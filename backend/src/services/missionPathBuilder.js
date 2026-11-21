/**
 * Construction pure de parcours mission (sans DB / HTTP).
 * Utilisé par missionRunService et le harness de clearance.
 */
import {
  getRankPathConfig,
  MYSTERY_OUTCOME_WEIGHTS,
  HARD_MODE_DIFFICULTY_MULT,
} from '../config/missionPathConfig.js';

function pickWeighted(weights, rng = Math.random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + Number(w), 0);
  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= Number(weight);
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1]?.[0];
}

function shuffleCopy(list, rng = Math.random) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickMysteryCount(range, rng = Math.random) {
  const [min, max] = range;
  if (min === max) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickEncountersForRank(rank, rng = Math.random) {
  const cfg = getRankPathConfig(rank);
  if (!cfg) {
    return [{ templateId: 'ronin_bandit', difficulty: 1 }];
  }

  const count = cfg.fightCount;
  const difficulties = cfg.difficulties;
  const regularPool = shuffleCopy(cfg.pool, rng);
  const fights = [];

  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const useBoss = Boolean(cfg.bossLast && isLast && cfg.bossPool?.length);
    const pool = useBoss ? cfg.bossPool : regularPool;
    const templateId = pool[i % pool.length] || pool[0] || 'ronin_bandit';
    fights.push({
      templateId,
      difficulty: difficulties[i] ?? difficulties[difficulties.length - 1] ?? 1,
      boss: useBoss,
    });
  }

  return fights;
}

export function buildMysteryOutcome(rank, rng = Math.random) {
  const kind = pickWeighted(MYSTERY_OUTCOME_WEIGHTS, rng);
  if (kind !== 'combat') {
    return { kind };
  }

  const cfg = getRankPathConfig(rank);
  const pool = cfg?.pool?.length ? cfg.pool : ['ronin_bandit'];
  const templateId = pool[Math.floor(rng() * pool.length)] || pool[0];
  const midDiff =
    cfg?.difficulties?.[Math.floor((cfg.difficulties.length - 1) / 2)] ??
    cfg?.difficulties?.[0] ??
    1.3;

  return {
    kind: 'combat',
    templateId,
    difficulty: midDiff,
    boss: false,
  };
}

export function isRecoveryOutcome(outcome) {
  const kind = outcome?.kind;
  return kind === 'heal' || kind === 'merchant';
}

/**
 * Garantit au moins un nœud « ? » de récupération (soin ou colporteur) par run.
 */
export function ensureRecoveryMystery(nodes, rng = Math.random) {
  const mysteries = nodes.filter(n => n?.type === 'mystery');
  if (!mysteries.length) return nodes;
  if (mysteries.some(m => isRecoveryOutcome(m.outcome))) return nodes;

  const idx = nodes.findIndex(n => n?.type === 'mystery');
  if (idx < 0) return nodes;
  const kind = rng() < 0.5 ? 'heal' : 'merchant';
  const next = [...nodes];
  next[idx] = {
    ...next[idx],
    outcome: { kind },
  };
  return next;
}

/**
 * Applique le multiplicateur mode difficile sur les difficultés de combat du path.
 */
export function applyHardModeToNodes(nodes, mult = HARD_MODE_DIFFICULTY_MULT) {
  const scale = Number(mult) || HARD_MODE_DIFFICULTY_MULT;
  return (Array.isArray(nodes) ? nodes : []).map(node => {
    if (node?.type === 'combat') {
      return {
        ...node,
        difficulty: Number(((Number(node.difficulty) || 1) * scale).toFixed(3)),
      };
    }
    if (node?.type === 'mystery' && node.outcome?.kind === 'combat') {
      return {
        ...node,
        outcome: {
          ...node.outcome,
          difficulty: Number(((Number(node.outcome.difficulty) || 1) * scale).toFixed(3)),
        },
      };
    }
    return node;
  });
}

/**
 * Choisit les gaps qui reçoivent un « ? ».
 * Gap 0 (après le 1er combat) est toujours inclus pour la survie du run.
 * Si boss en finale et 2 mystères, le dernier gap est prioritaire.
 */
function pickMysteryGapIndexes(gaps, mysteryCount, { bossLast = false, rng = Math.random } = {}) {
  if (gaps <= 0 || mysteryCount <= 0) return [];
  const chosen = new Set([0]);
  if (mysteryCount >= 2 && gaps >= 2) {
    if (bossLast) {
      chosen.add(gaps - 1);
    }
    while (chosen.size < Math.min(mysteryCount, gaps)) {
      const candidate = Math.floor(rng() * gaps);
      chosen.add(candidate);
    }
  }
  return [...chosen].sort((a, b) => a - b);
}

/**
 * Construit un parcours aléatoire pour un rang : combats + 1–2 nœuds « ? ».
 * Le premier intervalle a toujours un « ? » de récupération (soin / colporteur).
 */
export function buildRandomRunPath(rank, { rng = Math.random, hardMode = false } = {}) {
  const cfg = getRankPathConfig(rank);
  const fights = pickEncountersForRank(rank, rng);
  const gaps = Math.max(0, fights.length - 1);
  const mysteryWanted = cfg ? pickMysteryCount(cfg.mysteryCount, rng) : 1;
  const mysteryCount = Math.min(gaps, mysteryWanted);
  const mysteryGaps = new Set(
    pickMysteryGapIndexes(gaps, mysteryCount, {
      bossLast: Boolean(cfg?.bossLast),
      rng,
    }),
  );

  const nodes = [];
  let mysterySlot = 0;

  for (let i = 0; i < fights.length; i += 1) {
    const fight = fights[i];
    nodes.push({
      id: `combat-${i}`,
      type: 'combat',
      status: i === 0 ? 'available' : 'locked',
      templateId: fight.templateId,
      difficulty: fight.difficulty || 1,
      boss: Boolean(fight.boss),
    });

    if (i < fights.length - 1 && mysteryGaps.has(i)) {
      // Premier intervalle : soin garanti (après 1 fight la ferraille ne suffit pas au colporteur).
      const outcome = i === 0 ? { kind: 'heal' } : buildMysteryOutcome(rank, rng);
      nodes.push({
        id: `mystery-${mysterySlot}`,
        type: 'mystery',
        status: 'locked',
        revealed: false,
        outcome,
      });
      mysterySlot += 1;
    }
  }

  const withRecovery = ensureRecoveryMystery(nodes, rng);
  return hardMode ? applyHardModeToNodes(withRecovery) : withRecovery;
}

/**
 * @deprecated Prefer buildRandomRunPath(rank). Conservé pour tests / runs legacy.
 */
export function buildRunNodes(encounters, { rng = Math.random } = {}) {
  const fights =
    Array.isArray(encounters) && encounters.length
      ? encounters
      : [{ templateId: 'ronin_bandit', difficulty: 1 }];

  const nodes = [];
  for (let i = 0; i < fights.length; i += 1) {
    const fight = fights[i];
    nodes.push({
      id: `combat-${i}`,
      type: 'combat',
      status: i === 0 ? 'available' : 'locked',
      templateId: fight.templateId,
      difficulty: fight.difficulty || 1,
      boss: Boolean(fight.boss) || (i === fights.length - 1 && fights.length >= 4),
      nameFr: fight.nameFr || null,
      nameEn: fight.nameEn || null,
    });

    if (i < fights.length - 1) {
      const outcome = buildMysteryOutcome('D', rng);
      nodes.push({
        id: `mystery-${i}`,
        type: 'mystery',
        status: 'locked',
        revealed: false,
        outcome,
      });
    }
  }

  return ensureRecoveryMystery(nodes, rng);
}
