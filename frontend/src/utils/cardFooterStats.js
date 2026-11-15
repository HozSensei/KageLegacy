/**
 * Footer sobres des cartes — une case colorée par stat de combat.
 * Ordre et teintes alignés sur le croquis plein-bord
 * (rouge / bleu / vert / violet / orange / teal).
 */
export const CARD_FOOTER_STATS = [
  { key: 'taijutsu', tone: 'vermilion' },
  { key: 'ninjutsu', tone: 'sky' },
  { key: 'medicine', tone: 'leaf' },
  { key: 'genjutsu', tone: 'indigo' },
  { key: 'vitesse', tone: 'gold' },
  { key: 'intelligence', tone: 'wood' },
]

/** Cases footer pour une carte : valeur > 0 → chiffre, sinon case vide. */
export function cardFooterCells(card) {
  const bonus = card?.passiveBonus || {}
  return CARD_FOOTER_STATS.map(({ key, tone }) => {
    const value = Number(bonus[key]) || 0
    return { key, tone, value, show: value > 0 }
  })
}
