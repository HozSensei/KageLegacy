/**
 * Illustrations locales des cartes (slug → asset Vite).
 * Préférence WebP ; fallback PNG pour les builds / previews hors Vite.
 */
import barrageDeLames from '../assets/cards/barrage-de-lames.webp'
import concentration from '../assets/cards/concentration.webp'
import contreTranchant from '../assets/cards/contre-tranchant.webp'
import gardeHaute from '../assets/cards/garde-haute.webp'
import lanceDeFoudre from '../assets/cards/lance-de-foudre.webp'
import murDePierre from '../assets/cards/mur-de-pierre.webp'
import paumeApaisante from '../assets/cards/paume-apaisante.webp'
import poingDuDragon from '../assets/cards/poing-du-dragon.webp'
import poingRapide from '../assets/cards/poing-rapide.webp'
import souffleArdent from '../assets/cards/souffle-ardent.webp'
import vagueBrumeuse from '../assets/cards/vague-brumeuse.webp'
import voileDOmbre from '../assets/cards/voile-d-ombre.webp'

/** @type {Record<string, string>} */
export const CARD_ART_BY_SLUG = {
  'barrage-de-lames': barrageDeLames,
  concentration,
  'contre-tranchant': contreTranchant,
  'garde-haute': gardeHaute,
  'lance-de-foudre': lanceDeFoudre,
  'mur-de-pierre': murDePierre,
  'paume-apaisante': paumeApaisante,
  'poing-du-dragon': poingDuDragon,
  'poing-rapide': poingRapide,
  'souffle-ardent': souffleArdent,
  'vague-brumeuse': vagueBrumeuse,
  'voile-d-ombre': voileDOmbre,
}

/**
 * Résout l’URL d’illustration d’une carte.
 * Priorité : image_url / imageUrl API (http(s) ou chemin absolu) → asset local par slug.
 *
 * @param {{ slug?: string, imageUrl?: string|null, image_url?: string|null }|null|undefined} card
 * @returns {string|null}
 */
export function resolveCardArt(card) {
  if (!card) return null
  const remote = card.imageUrl ?? card.image_url
  if (typeof remote === 'string' && remote.trim()) {
    const url = remote.trim()
    if (/^(https?:|data:|blob:|\/)/i.test(url)) return url
  }
  const slug = card.slug
  if (!slug) return null
  return CARD_ART_BY_SLUG[slug] || null
}
