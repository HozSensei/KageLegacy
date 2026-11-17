/**
 * Bonus passifs (colonne droite) — aplats de couleur (carrés).
 * Seules les valeurs non nulles sont affichées.
 */

export const BONUS_CHIP_PALETTE = {
  taijutsu: { fill: '#d8513d' },
  ninjutsu: { fill: '#3776af' },
  medicine: { fill: '#408b68' },
  genjutsu: { fill: '#8653b4' },
  maxHp: { fill: '#d8513d' },
  maxChakra: { fill: '#3776af' },
  startingBlock: { fill: '#8c5c3e' },
};

/** Ordre des quatre arts et bonus de caractéristique. */
export const BONUS_CHIP_ORDER = [
  'taijutsu',
  'ninjutsu',
  'medicine',
  'genjutsu',
  'maxHp',
  'maxChakra',
  'startingBlock',
];

/**
 * @returns {{ key: string, value: number, fill: string }[]}
 */
export function cardBonusChips(card) {
  const bonus = card?.passiveBonus || {};
  const chips = [];
  for (const key of BONUS_CHIP_ORDER) {
    const value = Number(bonus[key]) || 0;
    if (value === 0) continue;
    const palette = BONUS_CHIP_PALETTE[key];
    chips.push({ key, value, fill: palette.fill });
  }
  return chips;
}

/**
 * Famille ruban gauche : taijutsu | ninjutsu | genjutsu | heredite.
 * `medicine` → heredite (vert).
 */
export function cardFamilyKey(cardOrStat) {
  const raw = String(
    typeof cardOrStat === 'string' ? cardOrStat : cardOrStat?.statType || ''
  ).toLowerCase();
  if (raw === 'ninjutsu') return 'ninjutsu';
  if (raw === 'genjutsu') return 'genjutsu';
  if (raw === 'medicine' || raw === 'medecine' || raw === 'heredite' || raw === 'héritage') {
    return 'heredite';
  }
  return 'taijutsu';
}

export function cardMatchesArt(card, art) {
  if (!art) return true;
  const primary = String(card?.statType || '').toLowerCase();
  return (primary === 'medecine' ? 'medicine' : primary) === art || cardSecondaryArt(card) === art;
}

/** Art secondaire (cartes double type). */
export function cardSecondaryArt(card) {
  const raw = String(card?.statTypeSecondary || '').toLowerCase();
  if (!raw) return null;
  if (raw === 'ninjutsu' || raw === 'genjutsu' || raw === 'taijutsu') return raw;
  if (raw === 'medicine' || raw === 'medecine') return 'medicine';
  return null;
}
