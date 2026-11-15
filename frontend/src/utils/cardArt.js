/**
 * Illustrations locales des cartes (slug → asset Vite).
 * Préférence WebP ; fallback PNG pour les builds / previews hors Vite.
 */
import aiguillonNerveux from '../assets/cards/aiguillon-nerveux.webp'
import ampouleDeChakra from '../assets/cards/ampoule-de-chakra.webp'
import bandeDeSoie from '../assets/cards/bande-de-soie.webp'
import barrageDeLames from '../assets/cards/barrage-de-lames.webp'
import cauchemarAigu from '../assets/cards/cauchemar-aigu.webp'
import chaineDEclairs from '../assets/cards/chaine-d-eclairs.webp'
import cloneDeCombat from '../assets/cards/clone-de-combat.webp'
import concentration from '../assets/cards/concentration.webp'
import contreTranchant from '../assets/cards/contre-tranchant.webp'
import coupeVenteuse from '../assets/cards/coupe-venteuse.webp'
import eclatDeRoche from '../assets/cards/eclat-de-roche.webp'
import espritDuRenard from '../assets/cards/esprit-du-renard.webp'
import frappeOpportuniste from '../assets/cards/frappe-opportuniste.webp'
import gardeHaute from '../assets/cards/garde-haute.webp'
import illusionTranchante from '../assets/cards/illusion-tranchante.webp'
import kunaiDeFer from '../assets/cards/kunai-de-fer.webp'
import lameCrespusculaire from '../assets/cards/lame-crespusculaire.webp'
import lameDeGranit from '../assets/cards/lame-de-granit.webp'
import lameDuTyphon from '../assets/cards/lame-du-typhon.webp'
import lanceDeFoudre from '../assets/cards/lance-de-foudre.webp'
import miragePersistant from '../assets/cards/mirage-persistant.webp'
import murDePierre from '../assets/cards/mur-de-pierre.webp'
import oeilDuMirroir from '../assets/cards/oeil-du-mirroir.webp'
import orageDuPic from '../assets/cards/orage-du-pic.webp'
import parcheminDeScellement from '../assets/cards/parchemin-de-scellement.webp'
import paumeApaisante from '../assets/cards/paume-apaisante.webp'
import piluleDuSoldat from '../assets/cards/pilule-du-soldat.webp'
import poingDuDragon from '../assets/cards/poing-du-dragon.webp'
import poingRapide from '../assets/cards/poing-rapide.webp'
import serresDeFer from '../assets/cards/serres-de-fer.webp'
import souffleArdent from '../assets/cards/souffle-ardent.webp'
import soupirDuVide from '../assets/cards/soupir-du-vide.webp'
import tombeauDeSable from '../assets/cards/tombeau-de-sable.webp'
import vagueBrumeuse from '../assets/cards/vague-brumeuse.webp'
import ventPorteur from '../assets/cards/vent-porteur.webp'
import voileDOmbre from '../assets/cards/voile-d-ombre.webp'

/** @type {Record<string, string>} */
export const CARD_ART_BY_SLUG = {
  'aiguillon-nerveux': aiguillonNerveux,
  'ampoule-de-chakra': ampouleDeChakra,
  'bande-de-soie': bandeDeSoie,
  'barrage-de-lames': barrageDeLames,
  'cauchemar-aigu': cauchemarAigu,
  'chaine-d-eclairs': chaineDEclairs,
  'clone-de-combat': cloneDeCombat,
  concentration,
  'contre-tranchant': contreTranchant,
  'coupe-venteuse': coupeVenteuse,
  'eclat-de-roche': eclatDeRoche,
  'esprit-du-renard': espritDuRenard,
  'frappe-opportuniste': frappeOpportuniste,
  'garde-haute': gardeHaute,
  'illusion-tranchante': illusionTranchante,
  'kunai-de-fer': kunaiDeFer,
  'lame-crespusculaire': lameCrespusculaire,
  'lame-de-granit': lameDeGranit,
  'lame-du-typhon': lameDuTyphon,
  'lance-de-foudre': lanceDeFoudre,
  'mirage-persistant': miragePersistant,
  'mur-de-pierre': murDePierre,
  'oeil-du-mirroir': oeilDuMirroir,
  'orage-du-pic': orageDuPic,
  'parchemin-de-scellement': parcheminDeScellement,
  'paume-apaisante': paumeApaisante,
  'pilule-du-soldat': piluleDuSoldat,
  'poing-du-dragon': poingDuDragon,
  'poing-rapide': poingRapide,
  'serres-de-fer': serresDeFer,
  'souffle-ardent': souffleArdent,
  'soupir-du-vide': soupirDuVide,
  'tombeau-de-sable': tombeauDeSable,
  'vague-brumeuse': vagueBrumeuse,
  'vent-porteur': ventPorteur,
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
