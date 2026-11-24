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
  inventory: { index: '03', icon: 'inventory', tone: 'wood' },
  talents: { index: '04', icon: 'talents', tone: 'leaf' },
  village: { index: '05', icon: 'profile', tone: 'sky' },
  rules: { index: '06', icon: 'rules', tone: 'ink' },
  // Groupe cards
  collection: { index: '07', icon: 'collection', tone: 'wood' },
  decks: { index: '08', icon: 'decks', tone: 'sky' },
  shop: { index: '09', icon: 'shop', tone: 'gold' },
  // Groupe missions
  missions: { index: '10', icon: 'missions', tone: 'leaf' },
  coop: { index: '11', icon: 'profile', tone: 'leaf' },
  'deck-duels': { index: '12', icon: 'pvp', tone: 'vermilion' },
  'battle-pass': { index: '13', icon: 'battle-pass', tone: 'gold' },
  journal: { index: '14', icon: 'journal', tone: 'indigo' },
  leaderboard: { index: '15', icon: 'leaderboard', tone: 'indigo' },
  // Groupe extra
  admin: { index: '16', icon: 'admin', tone: 'ink' },
};

export function sectionOf(name) {
  return SECTIONS[name] || { index: '', icon: 'hub', tone: 'vermilion' };
}
