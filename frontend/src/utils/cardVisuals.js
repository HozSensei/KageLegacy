/**
 * Langage visuel des cartes : une teinte et une forme par type,
 * des losanges pour la rareté, une teinte par élément.
 */
export const CARD_TYPE_VISUALS = {
  attack: { tone: 'vermilion', shape: 'triangle' },
  defense: { tone: 'indigo', shape: 'square' },
  skill: { tone: 'leaf', shape: 'circle' },
  summon: { tone: 'wood', shape: 'hexagon' },
  item: { tone: 'gold', shape: 'lozenge' },
}

export const RARITY_VISUALS = {
  common: { pips: 1, tone: 'neutral', foil: false },
  rare: { pips: 2, tone: 'sky', foil: true },
  legendary: { pips: 3, tone: 'gold', foil: true },
  mythic: { pips: 4, tone: 'vermilion', foil: true },
}

export const ELEMENT_TONES = {
  katon: 'vermilion',
  suiton: 'sky',
  raiton: 'gold',
  doton: 'wood',
  futon: 'leaf',
}

/** Teintes des stats de combat / catégorie chakra (footer, capsule scaling). */
export const STAT_TONES = {
  taijutsu: 'vermilion',
  ninjutsu: 'sky',
  genjutsu: 'indigo',
  medicine: 'leaf',
  vitesse: 'gold',
  intelligence: 'wood',
  dexterity: 'gold',
  force: 'vermilion',
  maxHp: 'vermilion',
}

export function statTone(statKey) {
  return STAT_TONES[statKey] || 'neutral'
}

export function cardTypeVisual(type) {
  return CARD_TYPE_VISUALS[type] || { tone: 'neutral', shape: 'square' }
}

export function rarityVisual(rarity) {
  return RARITY_VISUALS[rarity] || RARITY_VISUALS.common
}

export function elementTone(element) {
  return ELEMENT_TONES[String(element || '').toLowerCase()] || 'neutral'
}

/** Clé i18n `player.elements.*` correspondant à un élément de carte (« raiton » → « Raiton »). */
export function elementLabelKey(element) {
  const raw = String(element || '')
  if (!raw) return ''
  return `player.elements.${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`
}
