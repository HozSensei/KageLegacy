export function formatInstanceBonusPct(card) {
  if (card?.pliBonusPct == null) return ''
  return `+${Math.round(card.pliBonusPct * 100)}%`
}

export function formatBonusRange(card, locale = 'fr') {
  const min = card?.pliBonusMin
  const max = card?.pliBonusMax
  if (min == null || max == null) return ''
  const lo = Math.round(min * 100)
  const hi = Math.round(max * 100)
  if (lo === hi) return `+${lo}%`
  return locale === 'en' ? `+${lo}–${hi}%` : `+${lo}–${hi} %`
}
