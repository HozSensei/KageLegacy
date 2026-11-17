import { STAT_TONES } from './cardVisuals.js'

/**
 * Footer sobres des cartes — une case colorée par stat de combat.
 * Ordre et teintes alignés sur le croquis plein-bord
 * (rouge / bleu / vert / violet / orange / teal).
 */
export const CARD_FOOTER_STATS = [
  { key: 'taijutsu', tone: STAT_TONES.taijutsu },
  { key: 'ninjutsu', tone: STAT_TONES.ninjutsu },
  { key: 'medicine', tone: STAT_TONES.medicine },
  { key: 'genjutsu', tone: STAT_TONES.genjutsu },
]

/** Cases footer pour une carte : valeur > 0 → chiffre, sinon case vide. */
export function cardFooterCells(card) {
  const bonus = card?.passiveBonus || {}
  return CARD_FOOTER_STATS.map(({ key, tone }) => {
    const value = Number(bonus[key]) || 0
    return { key, tone, value, show: value > 0 }
  })
}
