/** Teinte par rang de mission, du plus accessible au plus dangereux. */
export const MISSION_RANK_TONES = {
  D: 'leaf',
  C: 'sky',
  B: 'gold',
  A: 'vermilion',
  S: 'ink',
}

export function missionRankTone(rank) {
  return MISSION_RANK_TONES[String(rank || '').toUpperCase()] || 'neutral'
}
