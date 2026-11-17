import { clampStat } from '../ninjaStats.js';

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

/** Niveau relatif de l'adversaire de référence (outil Élite). */
export const OPPONENT_LEVEL_TIERS = {
  weaker: { multiplier: 0.85 },
  slightly_weaker: { multiplier: 0.93 },
  similar: { multiplier: 1.0 },
  slightly_stronger: { multiplier: 1.07 },
  stronger: { multiplier: 1.15 },
};

export const OPPONENT_LEVEL_IDS = Object.keys(OPPONENT_LEVEL_TIERS);

/** Styles de consignes purs (outil Élite + benchmarks). */
export const ORDER_STYLE_STRATEGIES = {
  offensive: ['Offensive', 'Offensive', 'Offensive'],
  tank: ['Tank', 'Tank', 'Tank'],
  protect: ['Protect', 'Protect', 'Protect'],
  mixed: ['Offensive', 'Tank', 'Protect'],
};

/** @deprecated Alias historiques Assaut/Mur/Flux */
const LEGACY_STYLE_ALIASES = {
  assaut: 'offensive',
  mur: 'tank',
  flux: 'protect',
  equilibre: 'mixed',
};

export function normalizeOrderStyle(style) {
  if (ORDER_STYLE_STRATEGIES[style]) return style;
  return LEGACY_STYLE_ALIASES[style] || 'mixed';
}

export function normalizeOpponentLevel(level) {
  return OPPONENT_LEVEL_IDS.includes(level) ? level : 'similar';
}

export function getOpponentLevelMultiplier(level) {
  return OPPONENT_LEVEL_TIERS[normalizeOpponentLevel(level)].multiplier;
}

/** Somme des 6 stats d'un ninja (proxy de puissance globale). */
export function ninjaPowerSum(ninja) {
  return STAT_KEYS.reduce((sum, key) => sum + Number(ninja[key] ?? 0), 0);
}

/** Puissance moyenne d'une escouade active (3 ninjas). */
export function squadAveragePower(ninjas) {
  const active = ninjas.filter((n) => n.squad_position != null).slice(0, 3);
  const roster = active.length ? active : ninjas.slice(0, 3);
  if (!roster.length) return 0;
  return roster.reduce((sum, n) => sum + ninjaPowerSum(n), 0) / roster.length;
}

export function scaleNinjaStats(ninja, multiplier) {
  const scaled = { ...ninja };
  for (const key of STAT_KEYS) {
    scaled[key] = clampStat(Math.round(Number(ninja[key] ?? 0) * multiplier));
  }
  return scaled;
}

export function getStrategiesForComposition(composition) {
  const style = normalizeOrderStyle(composition);
  return ORDER_STYLE_STRATEGIES[style];
}

/**
 * Escouade adverse alignée sur le profil chiffré du joueur, avec consignes pures.
 */
export function buildOpponentSquadFromPlayer(playerNinjas, _composition, level = 'similar') {
  const ordered = [...playerNinjas]
    .filter((n) => n.squad_position != null)
    .sort((a, b) => a.squad_position - b.squad_position)
    .slice(0, 3);
  const base = ordered.length >= 3 ? ordered : playerNinjas.slice(0, 3);
  const multiplier = getOpponentLevelMultiplier(level);

  return base.map((ninja) => scaleNinjaStats({ ...ninja }, multiplier));
}

/**
 * Réaligne les stats d'une escouade bot pour coller à la puissance moyenne d'un joueur.
 * Préserve la forme relative (tai/nin/support) de chaque ninja.
 */
export function computeBotAlignmentScale(humanAvgPower, botAvgPower) {
  if (!humanAvgPower || !botAvgPower) return 1;
  const raw = humanAvgPower / botAvgPower;
  return Math.min(1.25, Math.max(0.75, raw));
}

export function alignBotNinjasToPower(botNinjas, targetAvgPower) {
  const botAvg = squadAveragePower(botNinjas);
  const scale = computeBotAlignmentScale(targetAvgPower, botAvg);
  if (Math.abs(scale - 1) < 0.02) return botNinjas;
  return botNinjas.map((n) => scaleNinjaStats(n, scale));
}
