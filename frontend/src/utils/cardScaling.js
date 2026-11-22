/**
 * Aperçu client du scaling cartes — aligné sur
 * `backend/.../formulas.js` : Base × (1 + Stat / 100).
 * N’inclut pas critique, triade, éléments ni buffs de statut
 * (résolus au moment du play côté serveur).
 */

/** Aligné sur backend DOT_BASES / DOT_STAT_FACTOR / DOT_ART_BY_KEY. */
export const DOT_STAT_FACTOR = 0.09;
export const DOT_BASES = Object.freeze({
  bleed: 8,
  burn: 5,
  poison: 4,
  madness: 4,
});
export const DOT_ART_BY_KEY = Object.freeze({
  bleed: 'taijutsu',
  burn: 'ninjutsu',
  poison: 'medicine',
  madness: 'genjutsu',
});
export const DOT_STATUS_KEYS = new Set(['bleed', 'burn', 'poison', 'madness']);

export function scaleByStat(base, stat) {
  const b = Math.max(0, Number(base) || 0);
  const s = Number(stat) || 0;
  return Math.round(b * (1 + s / 100));
}

/** Intensité DoT = base + round(stat × 0.09). */
export function scaleDotIntensity(base, artStat) {
  const b = Math.max(0, Number(base) || 0);
  const s = Math.max(0, Number(artStat) || 0);
  return b + Math.round(s * DOT_STAT_FACTOR);
}

export function isDotStatusKey(key) {
  return DOT_STATUS_KEYS.has(String(key || '').toLowerCase());
}

/**
 * Aperçu intensité DoT pour affichage carte.
 * @returns {{ key: string, base: number, effective: number, statKey: string|null, duration: number }|null}
 */
export function previewDotIntensity(statusKey, stats = null, duration = 1) {
  const key = String(statusKey || '').toLowerCase();
  const base = DOT_BASES[key];
  if (base == null) return null;
  const statKey = DOT_ART_BY_KEY[key];
  const turns = Math.min(2, Math.max(1, Math.floor(Number(duration) || 1)));
  if (!stats || !statKey) {
    return { key, base, effective: base, statKey, duration: turns };
  }
  const effective = scaleDotIntensity(base, Number(stats[statKey]) || 0);
  return { key, base, effective, statKey, duration: turns };
}

/** Stat qui scale une figure affichée (dégâts / armure / soins). */
export function scalingStatKey(card, figureKey) {
  if (card?.statType === 'common') return 'common';
  if (figureKey === 'damage') return card?.statType || 'taijutsu';
  if (figureKey === 'block' || figureKey === 'heal') return 'medicine';
  return null;
}

/**
 * @returns {{ key: string, base: number, effective: number, statKey: string|null, scaled: boolean }}
 */
export function previewFigure(card, figureKey, stats = null) {
  const base = Number(card?.[figureKey]) || 0;
  const statKey = scalingStatKey(card, figureKey);
  if (!base || !statKey) {
    return { key: figureKey, base, effective: base, statKey, scaled: false };
  }
  if (!stats) {
    return { key: figureKey, base, effective: base, statKey, scaled: false };
  }
  const stat =
    statKey === 'common'
      ? Math.max(
          Number(stats.taijutsu) || 0,
          Number(stats.ninjutsu) || 0,
          Number(stats.genjutsu) || 0,
          Number(stats.medicine) || 0
        )
      : stats[statKey];
  const effective = scaleByStat(base, stat);
  return {
    key: figureKey,
    base,
    effective,
    statKey,
    scaled: effective !== base,
  };
}

export function previewCardFigures(card, stats = null) {
  const figures = ['damage', 'block', 'heal'].map(key => previewFigure(card, key, stats));
  const effects = card?.effects || [];

  for (const effect of effects) {
    if (effect.type === 'gain_block' && figures[1].base === 0) {
      figures[1] = previewFigure({ ...card, block: effect.value }, 'block', stats);
    }
    if (effect.type === 'heal_self' && figures[2].base === 0) {
      figures[2] = previewFigure({ ...card, heal: effect.value }, 'heal', stats);
    }
  }
  return figures.filter(entry => entry.base > 0);
}
