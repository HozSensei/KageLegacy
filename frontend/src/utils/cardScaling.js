/**
 * Aperçu client du scaling cartes — aligné sur
 * `backend/.../formulas.js` : Base × (1 + Stat / 100).
 * N’inclut pas critique, triade, éléments ni buffs de statut
 * (résolus au moment du play côté serveur).
 */

export function scaleByStat(base, stat) {
  const b = Math.max(0, Number(base) || 0);
  const s = Number(stat) || 0;
  return Math.round(b * (1 + s / 100));
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
  return ['damage', 'block', 'heal']
    .map(key => previewFigure(card, key, stats))
    .filter(entry => entry.base > 0);
}
