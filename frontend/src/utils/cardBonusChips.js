/**
 * Bonus passifs (colonne droite) — icônes de statistique + valeur.
 * Seules les valeurs non nulles sont affichées.
 */

import { statVisual } from './statIcons.js';

export const BONUS_CHIP_PALETTE = Object.fromEntries(
  ['taijutsu', 'ninjutsu', 'medicine', 'genjutsu', 'maxHp', 'maxChakra', 'startingBlock'].map(
    key => [key, statVisual(key)]
  )
);

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
    chips.push({ key, value, fill: palette.fill, icon: palette.icon });
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
  if (raw === 'common') return 'common';
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
