/**
 * Construction pure de parcours mission branchés (sans DB / HTTP).
 *
 * Structure typique :
 *   combat-0 → shop-1 → branch-2
 *     short → combats… → fin
 *     long  → rest → combats… → shop → combat final
 */
import {
  getRankPathConfig,
  MYSTERY_OUTCOME_WEIGHTS,
  HARD_MODE_DIFFICULTY_MULT,
} from '../config/missionPathConfig.js';
import { BRANCH_XP_MULT, rollShopOffer } from '../config/missionRunEconomy.js';

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

function makeCombatNode(id, fight, status = 'locked') {
  return {
    id,
    type: 'combat',
    status,
    templateId: fight.templateId,
    difficulty: fight.difficulty || 1,
    boss: Boolean(fight.boss),
    branch: fight.branch || null,
  };
}

function pickFights(rank, count, difficulties, { bossLast = false, rng = Math.random, branch = null } = {}) {
  const cfg = getRankPathConfig(rank);
  if (!cfg) {
    return Array.from({ length: count }, (_, i) => ({
      templateId: 'ronin_bandit',
      difficulty: difficulties[i] ?? 1,
      boss: false,
      branch,
    }));
  }
  const regularPool = shuffleCopy(cfg.pool, rng);
  const fights = [];
  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const useBoss = Boolean(bossLast && isLast && cfg.bossPool?.length);
    const pool = useBoss ? cfg.bossPool : regularPool;
    const templateId = pool[i % pool.length] || pool[0] || 'ronin_bandit';
    fights.push({
      templateId,
      difficulty: difficulties[i] ?? difficulties[difficulties.length - 1] ?? 1,
      boss: useBoss,
      branch,
    });
  }
  return fights;
}

/** @deprecated Compat tests / harness legacy. */
export function pickEncountersForRank(rank, rng = Math.random) {
  const cfg = getRankPathConfig(rank);
  if (!cfg) return [{ templateId: 'ronin_bandit', difficulty: 1 }];
  return pickFights(rank, cfg.fightCount, cfg.difficulties, {
    bossLast: Boolean(cfg.bossLast),
    rng,
  });
}

/** @deprecated Compat mystery rolls. */
export function buildMysteryOutcome(rank, rng = Math.random) {
  const kind = pickWeighted(MYSTERY_OUTCOME_WEIGHTS, rng);
  if (kind !== 'combat') return { kind };
  const cfg = getRankPathConfig(rank);
  const pool = cfg?.pool?.length ? cfg.pool : ['ronin_bandit'];
  const templateId = pool[Math.floor(rng() * pool.length)] || pool[0];
  const midDiff =
    cfg?.difficulties?.[Math.floor((cfg.difficulties.length - 1) / 2)] ??
    cfg?.difficulties?.[0] ??
    1.3;
  return { kind: 'combat', templateId, difficulty: midDiff, boss: false };
}

export function isRecoveryOutcome(outcome) {
  const kind = outcome?.kind;
  return kind === 'heal' || kind === 'merchant' || kind === 'rest' || kind === 'shop';
}

/** @deprecated Guaranteed recovery — branched paths always include shop/rest. */
export function ensureRecoveryMystery(nodes) {
  return nodes;
}

export function applyHardModeToNodes(nodes, mult = HARD_MODE_DIFFICULTY_MULT) {
  const scale = Number(mult) || HARD_MODE_DIFFICULTY_MULT;
  return (Array.isArray(nodes) ? nodes : []).map(node => {
    if (node?.type === 'combat') {
      return {
        ...node,
        difficulty: Number(((Number(node.difficulty) || 1) * scale).toFixed(3)),
      };
    }
    return node;
  });
}

/**
 * Parcours branché :
 * combat-0 → shop-1 → branch-2 → (short | long) → …
 */
export function buildRandomRunPath(rank, { rng = Math.random, hardMode = false } = {}) {
  const cfg = getRankPathConfig(rank) || {
    fightCount: 4,
    shortFightCount: 3,
    bossLast: false,
    difficulties: [1, 1.1, 1.2, 1.3],
    shortDifficulties: [1, 1.15, 1.3],
    pool: ['ronin_bandit'],
  };

  const longDiffs = [...cfg.difficulties];
  const shortDiffs = [...(cfg.shortDifficulties || cfg.difficulties)];

  // Opening combat shared (index 0 of both curves).
  const opening = pickFights(rank, 1, [longDiffs[0] ?? 1], { rng, branch: null })[0];

  const shortRemaining = Math.max(1, (cfg.shortFightCount || 3) - 1);
  const longRemaining = Math.max(2, (cfg.fightCount || 4) - 1);

  const shortFights = pickFights(rank, shortRemaining, shortDiffs.slice(1), {
    bossLast: Boolean(cfg.bossLast),
    rng,
    branch: 'short',
  });
  const longFights = pickFights(rank, longRemaining, longDiffs.slice(1), {
    bossLast: Boolean(cfg.bossLast),
    rng,
    branch: 'long',
  });

  const nodes = [];
  nodes.push(makeCombatNode('combat-0', opening, 'available'));
  nodes.push({
    id: 'shop-1',
    type: 'shop',
    status: 'locked',
    offer: rollShopOffer(rng),
  });

  const shortFirstId = 'combat-s-0';
  const longFirstId = 'rest-l';

  nodes.push({
    id: 'branch-2',
    type: 'branch',
    status: 'locked',
    choices: [
      {
        id: 'short',
        nextNodeId: shortFirstId,
        labelFr: 'Sentier court',
        labelEn: 'Short path',
        lengthHint: 'short',
        xpMult: BRANCH_XP_MULT.short,
        fightCount: 1 + shortRemaining,
      },
      {
        id: 'long',
        nextNodeId: longFirstId,
        labelFr: 'Sentier long',
        labelEn: 'Long path',
        lengthHint: 'long',
        xpMult: BRANCH_XP_MULT.long,
        fightCount: 1 + longRemaining,
      },
    ],
  });

  // Short branch: remaining combats only.
  shortFights.forEach((fight, i) => {
    nodes.push(makeCombatNode(`combat-s-${i}`, fight));
  });

  // Long branch: rest → mid combats → shop → final combat(s).
  nodes.push({
    id: 'rest-l',
    type: 'rest',
    status: 'locked',
    branch: 'long',
  });

  const longMid = longFights.slice(0, Math.max(0, longFights.length - 1));
  const longFinal = longFights[longFights.length - 1];
  longMid.forEach((fight, i) => {
    nodes.push(makeCombatNode(`combat-l-${i}`, fight));
  });
  nodes.push({
    id: 'shop-l',
    type: 'shop',
    status: 'locked',
    branch: 'long',
    offer: rollShopOffer(rng),
  });
  if (longFinal) {
    nodes.push(makeCombatNode('combat-l-final', longFinal));
  }

  // Wire linear next pointers within each segment (for UI / unlock helpers).
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const wireLinear = ids => {
    for (let i = 0; i < ids.length - 1; i += 1) {
      const cur = byId[ids[i]];
      if (cur) cur.nextNodeId = ids[i + 1];
    }
  };

  wireLinear(['combat-0', 'shop-1', 'branch-2']);
  wireLinear(shortFights.map((_, i) => `combat-s-${i}`));
  const longIds = [
    'rest-l',
    ...longMid.map((_, i) => `combat-l-${i}`),
    'shop-l',
    ...(longFinal ? ['combat-l-final'] : []),
  ];
  wireLinear(longIds);

  return hardMode ? applyHardModeToNodes(nodes) : nodes;
}

/**
 * @deprecated Prefer buildRandomRunPath(rank). Conservé pour tests / runs legacy.
 */
export function buildRunNodes(encounters) {
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
      boss: Boolean(fight.boss),
      ...(i < fights.length - 1 ? { nextNodeId: `combat-${i + 1}` } : {}),
    });
  }
  return nodes;
}
