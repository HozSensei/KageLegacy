/**
 * Défis de préparation (Pack Élite) — deck d'opération et voies ninja.
 */

import { inferPrimaryArt } from './ninjaProfile.js';
import { TECHNIQUE_CARDS_PER_NINJA } from './combat/pli/constants.js';

const ART_LABELS = {
  fr: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Médecine',
  },
  en: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Medicine',
  },
};

function challenge(id, status, priority, title, detail) {
  return { id, status, priority, title, detail };
}

function summarizeChallenges(challenges) {
  return {
    done: challenges.filter((c) => c.status === 'done').length,
    pending: challenges.filter((c) => c.status === 'pending').length,
    warning: challenges.filter((c) => c.status === 'warning').length,
    total: challenges.length,
  };
}

export function buildPreparationChallenges({ ninjas, operationDeck = null, locale = 'fr' }) {
  const lang = locale === 'en' ? 'en' : 'fr';
  const artLabels = ART_LABELS[lang];
  const active = ninjas
    .filter((n) => n.squad_position != null)
    .sort((a, b) => a.squad_position - b.squad_position);

  const challenges = [];
  const techniqueCount = operationDeck?.techniqueCount ?? 0;
  const maxTechniques = active.length * TECHNIQUE_CARDS_PER_NINJA;
  const rawSlots = operationDeck?.rawTechniqueSlotsByNinjaId ?? operationDeck?.techniqueSlotsByNinjaId ?? {};

  if (active.length >= 3 && techniqueCount < maxTechniques) {
    challenges.push(
      challenge(
        'deck_techniques',
        'pending',
        'high',
        lang === 'en' ? 'Assign inventory technique cards' : 'Assigner les cartes technique inventaire',
        lang === 'en'
          ? `${techniqueCount}/${maxTechniques} cards assigned — empty slots become relay plis at H71.`
          : `${techniqueCount}/${maxTechniques} cartes assignées — les emplacements vides deviennent des relais à H71.`
      )
    );
  } else if (active.length >= 3) {
    challenges.push(
      challenge(
        'deck_techniques',
        'done',
        'high',
        lang === 'en' ? 'Technique deck complete' : 'Deck technique complet',
        lang === 'en'
          ? 'Full 9-pli shuffle — 1 inventory card + 2 stat cards per active ninja.'
          : 'Mélange complet à 9 plis — 1 carte inventaire + 2 cartes stat par ninja actif.'
      )
    );
  }

  const missingTechniques = active.filter((n) => {
    const slots = rawSlots[n.id] || rawSlots[String(n.id)] || [];
    return (Array.isArray(slots) ? slots : []).length < TECHNIQUE_CARDS_PER_NINJA;
  });
  if (missingTechniques.length && techniqueCount < maxTechniques) {
    challenges.push(
      challenge(
        'deck_per_ninja',
        'warning',
        'medium',
        lang === 'en' ? 'Fill technique slot per ninja' : 'Remplir la carte technique par ninja',
        lang === 'en'
          ? `${missingTechniques.length} active(s) without an inventory technique card — relay plis will fill those slots.`
          : `${missingTechniques.length} actif(s) sans carte technique inventaire — des relais combleront ces emplacements.`
      )
    );
  }

  const arts = new Set(active.map((n) => inferPrimaryArt(n)));
  if (arts.size < 2 && active.length >= 3) {
    challenges.push(
      challenge(
        'art_diversity',
        'warning',
        'low',
        lang === 'en' ? 'Diversify combat arts' : 'Diversifier les voies de combat',
        lang === 'en'
          ? 'All actives share the same primary art — mixed arts cover more matchups.'
          : 'Tous les actifs partagent la même voie — un mix Tai/Nin/Gen/Médecine couvre plus de matchups.'
      )
    );
  } else if (active.length >= 3) {
    const artList = [...arts].map((a) => artLabels[a]).join(', ');
    challenges.push(
      challenge(
        'art_diversity',
        'done',
        'low',
        lang === 'en' ? 'Art diversity OK' : 'Diversité des voies OK',
        lang === 'en' ? `Primary arts: ${artList}.` : `Voies principales : ${artList}.`
      )
    );
  }

  const genNinja = active.find((n) => inferPrimaryArt(n) === 'genjutsu');
  if (genNinja) {
    const t = rawTechniques[genNinja.id] || rawTechniques[String(genNinja.id)] || {};
    const hasGenTechnique = t.primary === 'genjutsu' || t.secondary === 'genjutsu';
    challenges.push(
      challenge(
        'genjutsu_specialist',
        hasGenTechnique ? 'done' : 'pending',
        'low',
        lang === 'en' ? 'Genjutsu specialist leveraged' : 'Spécialiste Genjutsu exploité',
        hasGenTechnique
          ? lang === 'en'
            ? `${genNinja.name} has Genjutsu in their technique deck.`
            : `${genNinja.name} a du Genjutsu dans son deck technique.`
          : lang === 'en'
            ? `Set a Genjutsu technique on ${genNinja.name} to exploit their stats.`
            : `Placez une technique Genjutsu sur ${genNinja.name} pour exploiter ses stats.`
      )
    );
  }

  return {
    challenges,
    summary: summarizeChallenges(challenges),
  };
}
