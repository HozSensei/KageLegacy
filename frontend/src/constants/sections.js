/**
 * Identité visuelle des sections du jeu : numéro affiché, glyphe et teinte.
 * Partagé par la navigation et les en-têtes de page pour rester cohérent.
 */
export const SECTIONS = {
  hub: { index: '01', icon: 'hub', tone: 'vermilion' },
  profile: { index: '02', icon: 'profile', tone: 'indigo' },
  talents: { index: '03', icon: 'talents', tone: 'leaf' },
  collection: { index: '04', icon: 'collection', tone: 'wood' },
  decks: { index: '05', icon: 'decks', tone: 'sky' },
  shop: { index: '06', icon: 'shop', tone: 'gold' },
  missions: { index: '07', icon: 'missions', tone: 'leaf' },
  'battle-pass': { index: '08', icon: 'battle-pass', tone: 'gold' },
  pvp: { index: '09', icon: 'pvp', tone: 'vermilion' },
  leaderboard: { index: '10', icon: 'leaderboard', tone: 'indigo' },
  'elite-tools': { index: '11', icon: 'elite-tools', tone: 'gold' },
  admin: { index: '12', icon: 'admin', tone: 'ink' },
}

export function sectionOf(name) {
  return SECTIONS[name] || { index: '', icon: 'hub', tone: 'vermilion' }
}
