/**
 * Défis de préparation (Pack Élite) — deck d'opération et voies ninja.
 */

import { inferPrimaryArt } from './ninjaProfile.js';
import { DECK_ELEMENTS_COUNT } from './combat/pli/constants.js';

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
  const elementCount = operationDeck?.elementCardIds?.length ?? 0;
  const techniques = operationDeck?.techniquesByNinjaId ?? {};

  if (active.length >= 3 && elementCount < DECK_ELEMENTS_COUNT) {
    challenges.push(
      challenge(
        'deck_elements',
        'pending',
        'high',
        lang === 'en' ? 'Pick 5 deck elements' : 'Choisir 5 éléments de deck',
        lang === 'en'
          ? `${elementCount}/${DECK_ELEMENTS_COUNT} elements selected — each adds a tactical pli.`
          : `${elementCount}/${DECK_ELEMENTS_COUNT} éléments choisis — chacun ajoute un pli tactique.`
      )
    );
  } else if (active.length >= 3) {
    challenges.push(
      challenge(
        'deck_elements',
        'done',
        'high',
        lang === 'en' ? 'Deck elements complete' : 'Éléments de deck complets',
        lang === 'en'
          ? 'Full 14-pli shuffle — techniques + squad elements.'
          : 'Mélange complet à 14 plis — techniques + éléments d\'escouade.'
      )
    );
  }

  const missingTechniques = active.filter((n) => {
    const t = techniques[n.id] || techniques[String(n.id)];
    return !t?.primary || !t?.secondary;
  });
  if (missingTechniques.length) {
    challenges.push(
      challenge(
        'deck_techniques',
        'warning',
        'medium',
        lang === 'en' ? 'Configure ninja techniques' : 'Configurer les techniques des ninjas',
        lang === 'en'
          ? `${missingTechniques.length} active(s) still use auto defaults — set primary/secondary domains.`
          : `${missingTechniques.length} actif(s) en défaut auto — définissez domaines principal/secondaire.`
      )
    );
  } else if (active.length >= 3) {
    challenges.push(
      challenge(
        'deck_techniques',
        'done',
        'medium',
        lang === 'en' ? 'Techniques configured' : 'Techniques configurées',
        lang === 'en'
          ? 'Each ninja has primary and secondary technique domains.'
          : 'Chaque ninja a un domaine principal et secondaire.'
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
    const t = techniques[genNinja.id] || techniques[String(genNinja.id)] || {};
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
