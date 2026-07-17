/** Profils de caractère — libellés UI et ton selon l'intensité du boost. */

export const TRAIT_STAT = {
  Brute: 'taijutsu',
  Canaliseur: 'ninjutsu',
  Illusionniste: 'genjutsu',
  Guerisseur: 'medecine',
  Veloce: 'vitesse',
  Stratege: 'intelligence',
}

/**
 * Couleur du libellé : +1 discret, +2 accentué. Sans profil = faint.
 * @param {number|null|undefined} boost
 */
export function traitToneClass(boost) {
  const level = Number(boost)
  if (level === 2) return 'text-accent'
  if (level === 1) return 'text-accent-soft'
  return 'text-ink-faint'
}

export function traitLabelKey(trait) {
  if (!trait) return 'traits.none.label'
  return `traits.${trait}.label`
}

export function traitHintKey(trait) {
  if (!trait) return 'traits.none.hint'
  return `traits.${trait}.hint`
}
