/**
 * Identité visuelle des sections du jeu : numéro affiché, glyphe et teinte.
 * Partagé par la navigation et les en-têtes de page pour rester cohérent.
 *
 * L'ordre des index doit suivre l'ordre d'affichage de `useNavStructure`
 * (hub → cards → missions → extra).
 */
export const SECTIONS = {
  // Groupe hub
  hub: { index: '01', icon: 'hub', tone: 'vermilion' },
  profile: { index: '02', icon: 'profile', tone: 'indigo' },
  talents: { index: '03', icon: 'talents', tone: 'leaf' },
  village: { index: '04', icon: 'profile', tone: 'sky' },
  rules: { index: '05', icon: 'rules', tone: 'ink' },
  // Groupe cards
  collection: { index: '06', icon: 'collection', tone: 'wood' },
  decks: { index: '07', icon: 'decks', tone: 'sky' },
  shop: { index: '08', icon: 'shop', tone: 'gold' },
  // Groupe missions
  missions: { index: '09', icon: 'missions', tone: 'leaf' },
  coop: { index: '10', icon: 'profile', tone: 'leaf' },
  'deck-duels': { index: '11', icon: 'pvp', tone: 'vermilion' },
  'battle-pass': { index: '12', icon: 'battle-pass', tone: 'gold' },
  journal: { index: '13', icon: 'journal', tone: 'indigo' },
  leaderboard: { index: '14', icon: 'leaderboard', tone: 'indigo' },
  // Groupe extra
  admin: { index: '15', icon: 'admin', tone: 'ink' },
};

export function sectionOf(name) {
  return SECTIONS[name] || { index: '', icon: 'hub', tone: 'vermilion' };
}
