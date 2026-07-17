/**
 * Filtre minimal FR/EN pour le mur de ligue.
 * Remplace chaque mot modéré en gardant la 1ʳᵉ lettre, le reste en *.
 * Ex. "merde" → "m****"
 */

/** Liste courte, volontairement basique — à enrichir au besoin. */
const MODERATED_WORDS = [
  // FR
  'merde',
  'putain',
  'pute',
  'salope',
  'connard',
  'connasse',
  'enculé',
  'encule',
  'enculer',
  'bordel',
  'foutre',
  'nique',
  'niquer',
  'bite',
  'couilles',
  'pd',
  'fdp',
  'ntm',
  'tg',
  // EN
  'fuck',
  'fucking',
  'fucker',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cunt',
  'motherfucker',
  'wtf',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Trie du plus long au plus court pour éviter les sous-matches. */
const SORTED_WORDS = [...MODERATED_WORDS].sort((a, b) => b.length - a.length);

export function maskModeratedWord(word) {
  if (!word || word.length <= 1) return word;
  return word[0] + '*'.repeat(word.length - 1);
}

/**
 * Applique le masquage sur le texte (insensible à la casse, frontières de lettres Unicode).
 */
export function moderateWallText(raw) {
  let text = String(raw ?? '');
  for (const word of SORTED_WORDS) {
    const pattern = new RegExp(`(^|[^\\p{L}])(${escapeRegex(word)})(?=[^\\p{L}]|$)`, 'giu');
    text = text.replace(pattern, (_full, sep, matched) => sep + maskModeratedWord(matched));
  }
  return text;
}

export { MODERATED_WORDS };
