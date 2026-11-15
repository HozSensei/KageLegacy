/**
 * Illustrations locales des cartes (slug → asset Vite).
 * Préférence WebP ; fallback PNG pour les builds / previews hors Vite.
 */
import aegisAncestral from '../assets/cards/aegis-ancestral.webp'
import aiguillonNerveux from '../assets/cards/aiguillon-nerveux.webp'
import ampouleDeChakra from '../assets/cards/ampoule-de-chakra.webp'
import armureDeMagma from '../assets/cards/armure-de-magma.webp'
import assautDeLAube from '../assets/cards/assaut-de-l-aube.webp'
import bandageRenforce from '../assets/cards/bandage-renforce.webp'
import bandeDeSoie from '../assets/cards/bande-de-soie.webp'
import barrageDeLames from '../assets/cards/barrage-de-lames.webp'
import barriereStatique from '../assets/cards/barriere-statique.webp'
import bouclierDeBois from '../assets/cards/bouclier-de-bois.webp'
import carapaceDeFer from '../assets/cards/carapace-de-fer.webp'
import cauchemarAigu from '../assets/cards/cauchemar-aigu.webp'
import chaineDEclairs from '../assets/cards/chaine-d-eclairs.webp'
import cloneDeCombat from '../assets/cards/clone-de-combat.webp'
import concentration from '../assets/cards/concentration.webp'
import contreTranchant from '../assets/cards/contre-tranchant.webp'
import coquilleDeTerre from '../assets/cards/coquille-de-terre.webp'
import coupeVenteuse from '../assets/cards/coupe-venteuse.webp'
import crochetDuSentinelle from '../assets/cards/crochet-du-sentinelle.webp'
import eclatDeRoche from '../assets/cards/eclat-de-roche.webp'
import ecranDeVapeur from '../assets/cards/ecran-de-vapeur.webp'
import espritDuRenard from '../assets/cards/esprit-du-renard.webp'
import forteresseVivante from '../assets/cards/forteresse-vivante.webp'
import frappeOpportuniste from '../assets/cards/frappe-opportuniste.webp'
import gardeDuMedecin from '../assets/cards/garde-du-medecin.webp'
import gardeHaute from '../assets/cards/garde-haute.webp'
import illusionTranchante from '../assets/cards/illusion-tranchante.webp'
import jugementDuCielBrise from '../assets/cards/jugement-du-ciel-brise.webp'
import kunaiDeFer from '../assets/cards/kunai-de-fer.webp'
import lameCrespusculaire from '../assets/cards/lame-crespusculaire.webp'
import lameDeGranit from '../assets/cards/lame-de-granit.webp'
import lameDuTyphon from '../assets/cards/lame-du-typhon.webp'
import lanceDeFoudre from '../assets/cards/lance-de-foudre.webp'
import marteauDuRoc from '../assets/cards/marteau-du-roc.webp'
import miragePersistant from '../assets/cards/mirage-persistant.webp'
import mirageProtecteur from '../assets/cards/mirage-protecteur.webp'
import murDePierre from '../assets/cards/mur-de-pierre.webp'
import oeilDuMirroir from '../assets/cards/oeil-du-mirroir.webp'
import orageDuPic from '../assets/cards/orage-du-pic.webp'
import paradeBasse from '../assets/cards/parade-basse.webp'
import parcheminDeScellement from '../assets/cards/parchemin-de-scellement.webp'
import paumeApaisante from '../assets/cards/paume-apaisante.webp'
import piluleDuSoldat from '../assets/cards/pilule-du-soldat.webp'
import poingDuDragon from '../assets/cards/poing-du-dragon.webp'
import poingRapide from '../assets/cards/poing-rapide.webp'
import pressionVitale from '../assets/cards/pression-vitale.webp'
import rempartDEau from '../assets/cards/rempart-d-eau.webp'
import respirationProfonde from '../assets/cards/respiration-profonde.webp'
import riposteEclair from '../assets/cards/riposte-eclair.webp'
import sangDeBraise from '../assets/cards/sang-de-braise.webp'
import scalpelDeChakra from '../assets/cards/scalpel-de-chakra.webp'
import serresDeFer from '../assets/cards/serres-de-fer.webp'
import souffleArdent from '../assets/cards/souffle-ardent.webp'
import soupirDuVide from '../assets/cards/soupir-du-vide.webp'
import tombeauDeSable from '../assets/cards/tombeau-de-sable.webp'
import vagueBrumeuse from '../assets/cards/vague-brumeuse.webp'
import ventPorteur from '../assets/cards/vent-porteur.webp'
import voileDeBrise from '../assets/cards/voile-de-brise.webp'
import voileDeMensonge from '../assets/cards/voile-de-mensonge.webp'
import voileDOmbre from '../assets/cards/voile-d-ombre.webp'

/** @type {Record<string, string>} */
export const CARD_ART_BY_SLUG = {
  'aegis-ancestral': aegisAncestral,
  'aiguillon-nerveux': aiguillonNerveux,
  'ampoule-de-chakra': ampouleDeChakra,
  'armure-de-magma': armureDeMagma,
  'assaut-de-l-aube': assautDeLAube,
  'bandage-renforce': bandageRenforce,
  'bande-de-soie': bandeDeSoie,
  'barrage-de-lames': barrageDeLames,
  'barriere-statique': barriereStatique,
  'bouclier-de-bois': bouclierDeBois,
  'carapace-de-fer': carapaceDeFer,
  'cauchemar-aigu': cauchemarAigu,
  'chaine-d-eclairs': chaineDEclairs,
  'clone-de-combat': cloneDeCombat,
  concentration,
  'contre-tranchant': contreTranchant,
  'coquille-de-terre': coquilleDeTerre,
  'coupe-venteuse': coupeVenteuse,
  'crochet-du-sentinelle': crochetDuSentinelle,
  'eclat-de-roche': eclatDeRoche,
  'ecran-de-vapeur': ecranDeVapeur,
  'esprit-du-renard': espritDuRenard,
  'forteresse-vivante': forteresseVivante,
  'frappe-opportuniste': frappeOpportuniste,
  'garde-du-medecin': gardeDuMedecin,
  'garde-haute': gardeHaute,
  'illusion-tranchante': illusionTranchante,
  'jugement-du-ciel-brise': jugementDuCielBrise,
  'kunai-de-fer': kunaiDeFer,
  'lame-crespusculaire': lameCrespusculaire,
  'lame-de-granit': lameDeGranit,
  'lame-du-typhon': lameDuTyphon,
  'lance-de-foudre': lanceDeFoudre,
  'marteau-du-roc': marteauDuRoc,
  'mirage-persistant': miragePersistant,
  'mirage-protecteur': mirageProtecteur,
  'mur-de-pierre': murDePierre,
  'oeil-du-mirroir': oeilDuMirroir,
  'orage-du-pic': orageDuPic,
  'parade-basse': paradeBasse,
  'parchemin-de-scellement': parcheminDeScellement,
  'paume-apaisante': paumeApaisante,
  'pilule-du-soldat': piluleDuSoldat,
  'poing-du-dragon': poingDuDragon,
  'poing-rapide': poingRapide,
  'pression-vitale': pressionVitale,
  'rempart-d-eau': rempartDEau,
  'respiration-profonde': respirationProfonde,
  'riposte-eclair': riposteEclair,
  'sang-de-braise': sangDeBraise,
  'scalpel-de-chakra': scalpelDeChakra,
  'serres-de-fer': serresDeFer,
  'souffle-ardent': souffleArdent,
  'soupir-du-vide': soupirDuVide,
  'tombeau-de-sable': tombeauDeSable,
  'vague-brumeuse': vagueBrumeuse,
  'vent-porteur': ventPorteur,
  'voile-de-brise': voileDeBrise,
  'voile-de-mensonge': voileDeMensonge,
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
