/**
 * Service partagé — sims de missions réelles pour CLI + admin UI.
 *
 * Réutilise combatBalanceSim.aggregateMissionRuns (politique greedy).
 * Les entrées deck viennent soit d’un deck DB (cartes déjà sérialisées),
 * soit d’un export JSON résolu via le catalogue seed (CLI).
 */
import {
  REAL_MISSION_BRANCHES,
  REAL_MISSION_PROFILES,
  REAL_MISSION_RANKS,
  REAL_MISSION_SIM,
  REAL_MISSION_STRENGTHS,
  getRealMissionProfile,
} from '../config/realMissionBalanceProfiles.js';
import { aggregateMissionRuns } from './deckCombat/combatBalanceSim.js';
import { createEmptyPassiveStats, validateDeck } from './deckService.js';
import { mergeStatBonuses } from './playerCharacterService.js';

const ART_KEYS = Object.freeze(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Compte les cartes par voie (ignore common / inconnu).
 * @returns {{ counts: Record<string,number>, dominant: string|null, secondary: string|null }}
 */
export function inferDeckArtBreakdown(cards = []) {
  const counts = Object.fromEntries(ART_KEYS.map(k => [k, 0]));
  for (const entry of cards || []) {
    const qty = Math.max(1, Number(entry.quantity) || 1);
    const st = String(entry.card?.statType ?? entry.statType ?? '').toLowerCase();
    if (Object.hasOwn(counts, st)) counts[st] += qty;
  }
  const ranked = ART_KEYS.map(k => [k, counts[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const dominant = ranked[0][1] > 0 ? ranked[0][0] : null;
  const secondary = ranked[1][1] > 0 ? ranked[1][0] : null;
  return { counts, dominant, secondary };
}

export function deckPassiveStats(entries) {
  const deckKeys = Object.keys(createEmptyPassiveStats());
  const bonuses = (entries || []).flatMap(entry =>
    Array.from({ length: Math.max(1, Number(entry.quantity) || 1) }, () =>
      Object.fromEntries(deckKeys.map(key => [key, entry.card?.passiveBonus?.[key] || 0])),
    ),
  );
  return mergeStatBonuses(...bonuses);
}

export function buildSimProfile(branch, strength, deckPassives) {
  const base = getRealMissionProfile(branch, strength);
  return {
    id: `${branch}_${strength}`,
    label: base.label,
    level: base.level,
    stats: mergeStatBonuses(base.stats, deckPassives),
    talentCodes: [...base.talentCodes],
    deck: 'exported',
    deckUpgradeLevel: 0,
    branch: base.branch,
    strength: base.strength || strength,
  };
}

/**
 * Lance les sims mission pour un jeu de profils × rangs.
 *
 * @param {object} opts
 * @param {Array} opts.deckEntries — [{ quantity, card }]
 * @param {string} [opts.branch] — voie talents (défaut: dominante du deck ou taijutsu)
 * @param {string|string[]} [opts.strengths='moyen']
 * @param {string[]} [opts.ranks]
 * @param {number} [opts.runs]
 * @param {boolean} [opts.hardMode]
 * @param {number} [opts.seed]
 */
export function runRealMissionBalanceSim({
  deckEntries,
  branch = null,
  strengths = 'moyen',
  ranks = [...REAL_MISSION_RANKS],
  runs = REAL_MISSION_SIM.runsPerCell,
  hardMode = false,
  seed = REAL_MISSION_SIM.baseSeed,
} = {}) {
  if (!Array.isArray(deckEntries) || !deckEntries.length) {
    throw httpError(400, 'Deck vide : aucune carte à simuler.');
  }

  const art = inferDeckArtBreakdown(deckEntries);
  const resolvedBranch = branch || art.dominant || 'taijutsu';
  if (!REAL_MISSION_BRANCHES.includes(resolvedBranch)) {
    throw httpError(400, `Voie invalide: ${resolvedBranch}.`);
  }

  const strengthList = (Array.isArray(strengths) ? strengths : [strengths]).map(String);
  for (const s of strengthList) {
    if (!REAL_MISSION_STRENGTHS.includes(s)) {
      throw httpError(400, `Profil de force invalide: ${s}.`);
    }
  }

  const rankList = (ranks || []).map(r => String(r).toUpperCase());
  for (const r of rankList) {
    if (!REAL_MISSION_RANKS.includes(r)) {
      throw httpError(400, `Rang invalide: ${r}.`);
    }
  }

  const runsPerCell = Math.max(1, Math.min(80, Number(runs) || REAL_MISSION_SIM.runsPerCell));
  const validation = validateDeck(deckEntries);
  const deckPassives = deckPassiveStats(deckEntries);
  const size = deckEntries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);

  const rows = [];
  for (const strength of strengthList) {
    const profile = buildSimProfile(resolvedBranch, strength, deckPassives);
    for (const rank of rankList) {
      const agg = aggregateMissionRuns({
        rank,
        profileId: profile.id,
        baseSeed: (Number(seed) ^ (strength.charCodeAt(0) << 8) ^ rank.charCodeAt(0) ^ resolvedBranch.charCodeAt(0)) >>> 0,
        count: runsPerCell,
        hardMode: Boolean(hardMode),
        maxTurns: REAL_MISSION_SIM.maxTurns,
        profileOverride: profile,
        deckEntries,
      });
      rows.push({
        ...agg,
        branch: resolvedBranch,
        strength,
        label: profile.label,
        profileLevel: profile.level,
        talentCodes: profile.talentCodes,
        stats: profile.stats,
      });
    }
  }

  return {
    branch: resolvedBranch,
    branchAuto: !branch,
    inferred: art,
    deck: { size, validation },
    runsPerCell,
    hardMode: Boolean(hardMode),
    seed: Number(seed) >>> 0,
    strengths: strengthList,
    ranks: rankList,
    rows,
  };
}

export function listAvailableProfiles() {
  return {
    branches: [...REAL_MISSION_BRANCHES],
    strengths: [...REAL_MISSION_STRENGTHS],
    ranks: [...REAL_MISSION_RANKS],
    defaultRuns: REAL_MISSION_SIM.runsPerCell,
    profiles: Object.fromEntries(
      REAL_MISSION_BRANCHES.map(branch => [
        branch,
        Object.fromEntries(
          REAL_MISSION_STRENGTHS.map(strength => {
            const p = REAL_MISSION_PROFILES[branch][strength];
            return [
              strength,
              {
                id: `${branch}_${strength}`,
                label: p.label,
                level: p.level,
                talentPoints: p.talentPoints,
                talentCodes: [...p.talentCodes],
                stats: { ...p.stats },
              },
            ];
          }),
        ),
      ]),
    ),
  };
}
