/** Langage visuel de l'arbre de talents : une teinte par branche, une forme par type de nœud. */
export const TALENT_BRANCH_TONES = {
  taijutsu: 'vermilion',
  ninjutsu: 'sky',
  genjutsu: 'indigo',
  medicine: 'leaf',
  center: 'gold',
}

export const TALENT_NODE_SHAPES = {
  stat: 'circle',
  notable: 'square',
  keystone: 'lozenge',
}

export function talentBranchTone(branch) {
  return TALENT_BRANCH_TONES[branch] || 'neutral'
}

export function talentNodeShape(type) {
  return TALENT_NODE_SHAPES[type] || 'circle'
}
