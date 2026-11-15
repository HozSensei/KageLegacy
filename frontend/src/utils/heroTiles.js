/**
 * Tiles décoratives pour les héros en perspective.
 * Préfère des types / raretés / branches on-brand — pas de fausses cartes marketing.
 */
import { CARD_TYPE_VISUALS, RARITY_VISUALS } from './cardVisuals'
import { talentBranchTone } from './talentVisuals'

const TYPE_ORDER = ['attack', 'defense', 'skill', 'summon', 'item']
const RARITY_ORDER = ['common', 'rare', 'legendary', 'mythic']
const BRANCH_ORDER = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']

/** Jeu de tiles par type de carte (collection / deck / hub). */
export function typeHeroTiles(count = 9) {
  const tiles = []
  for (let i = 0; i < count; i += 1) {
    const type = TYPE_ORDER[i % TYPE_ORDER.length]
    const visual = CARD_TYPE_VISUALS[type]
    tiles.push({
      id: `type-${type}-${i}`,
      tone: visual.tone,
      shape: visual.shape,
      labelKey: `cards.types.${type}`,
      accent: RARITY_ORDER[i % RARITY_ORDER.length],
    })
  }
  return tiles
}

/** Tiles rareté (boutique / passe). */
export function rarityHeroTiles(count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const rarity = RARITY_ORDER[i % RARITY_ORDER.length]
    const visual = RARITY_VISUALS[rarity]
    return {
      id: `rarity-${rarity}-${i}`,
      tone: visual.tone === 'neutral' ? 'indigo' : visual.tone,
      shape: 'lozenge',
      labelKey: `cards.rarities.${rarity}`,
      pips: visual.pips,
    }
  })
}

/** Tiles branches de talent. */
export function talentHeroTiles(count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const branch = BRANCH_ORDER[i % BRANCH_ORDER.length]
    return {
      id: `talent-${branch}-${i}`,
      tone: talentBranchTone(branch),
      shape: i % 2 === 0 ? 'circle' : 'hexagon',
      labelKey: `talents.branches.${branch}`,
    }
  })
}

/** Tiles missions / combat (rangs stylisés). */
export function missionHeroTiles(count = 8) {
  const ranks = [
    { tone: 'leaf', shape: 'square', label: 'D' },
    { tone: 'sky', shape: 'square', label: 'C' },
    { tone: 'gold', shape: 'lozenge', label: 'B' },
    { tone: 'vermilion', shape: 'triangle', label: 'A' },
  ]
  return Array.from({ length: count }, (_, i) => {
    const rank = ranks[i % ranks.length]
    return {
      id: `mission-${i}`,
      tone: rank.tone,
      shape: rank.shape,
      label: rank.label,
    }
  })
}

/** Construit des tiles à partir de vraies entrées de collection. */
export function tilesFromCollection(entries = [], count = 9) {
  if (!entries.length) return typeHeroTiles(count)
  return entries.slice(0, count).map((entry, i) => {
    const card = entry.card || entry
    const type = card.type || TYPE_ORDER[i % TYPE_ORDER.length]
    const visual = CARD_TYPE_VISUALS[type] || CARD_TYPE_VISUALS.attack
    const rarity = card.rarity || 'common'
    return {
      id: `owned-${entry.collectionId || card.id || i}`,
      tone: visual.tone,
      shape: visual.shape,
      labelKey: `cards.types.${type}`,
      accent: rarity,
      nameFr: card.nameFr,
      nameEn: card.nameEn,
    }
  })
}
