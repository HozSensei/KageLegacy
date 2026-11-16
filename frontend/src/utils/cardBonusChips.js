/**
 * Bonus hexagonaux (colonne droite V5) — couleurs du prototype HTML.
 * Seules les valeurs non nulles sont affichées.
 */

export const BONUS_CHIP_PALETTE = {
  taijutsu: { light: '#f0715b', dark: '#a93530' },
  ninjutsu: { light: '#67bce5', dark: '#2678aa' },
  medicine: { light: '#65c99a', dark: '#25805d' },
  genjutsu: { light: '#b19be0', dark: '#6747a2' },
  vitesse: { light: '#8bc4e8', dark: '#214b81' },
  intelligence: { light: '#f4cb66', dark: '#ad7c27' },
  force: { light: '#f0715b', dark: '#a93530' },
  dexterity: { light: '#d1a177', dark: '#8c5c3e' },
  maxHp: { light: '#d1a177', dark: '#8c5c3e' },
}

/** Ordre d’affichage aligné sur le footer historique / prototype. */
export const BONUS_CHIP_ORDER = [
  'taijutsu',
  'ninjutsu',
  'medicine',
  'genjutsu',
  'vitesse',
  'intelligence',
]

/**
 * @returns {{ key: string, value: number, light: string, dark: string }[]}
 */
export function cardBonusChips(card) {
  const bonus = card?.passiveBonus || {}
  const chips = []
  for (const key of BONUS_CHIP_ORDER) {
    const value = Number(bonus[key]) || 0
    if (value === 0) continue
    const palette = BONUS_CHIP_PALETTE[key] || BONUS_CHIP_PALETTE.dexterity
    chips.push({ key, value, light: palette.light, dark: palette.dark })
  }
  // Stats hors ordre connu (ex. dexterity)
  for (const [key, raw] of Object.entries(bonus)) {
    if (BONUS_CHIP_ORDER.includes(key)) continue
    const value = Number(raw) || 0
    if (value === 0) continue
    const palette = BONUS_CHIP_PALETTE[key] || BONUS_CHIP_PALETTE.dexterity
    chips.push({ key, value, light: palette.light, dark: palette.dark })
  }
  return chips
}

/**
 * Famille ruban gauche (prototype : taijutsu | ninjutsu | genjutsu | heredite).
 * `medicine` → heredite (vert du HTML).
 */
export function cardFamilyKey(card) {
  const raw = String(card?.statType || '').toLowerCase()
  if (raw === 'ninjutsu') return 'ninjutsu'
  if (raw === 'genjutsu') return 'genjutsu'
  if (raw === 'medicine' || raw === 'heredite' || raw === 'héritage') return 'heredite'
  return 'taijutsu'
}
