/**
 * Défis de préparation (Pack Élite) — cartes, consignes, voies ninja.
 * Lecture seule sur l'escouade active ; pas d'avantage en match.
 */

import { inferPrimaryArt } from './ninjaProfile.js';

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

const ORDER_CARD_TYPE = {
  Offensive: 'attack',
  Tank: 'defense',
  Protect: 'support',
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

export function buildPreparationChallenges({ ninjas, cardRows = [], locale = 'fr' }) {
  const lang = locale === 'en' ? 'en' : 'fr';
  const artLabels = ART_LABELS[lang];
  const active = ninjas
    .filter((n) => n.squad_position != null)
    .sort((a, b) => a.squad_position - b.squad_position);

  const cardByNinjaId = new Map(cardRows.map((row) => [row.ninja_id, row]));
  const challenges = [];

  const equippedCount = active.filter((n) => cardByNinjaId.has(n.id)).length;
  if (active.length >= 3 && equippedCount < 3) {
    challenges.push(
      challenge(
        'equip_all_cards',
        'pending',
        'high',
        lang === 'en' ? 'Equip tactic cards on all actives' : 'Équiper une carte sur chaque actif',
        lang === 'en'
          ? `${equippedCount}/3 ninjas have a card — each can proc once per match when conditions are met.`
          : `${equippedCount}/3 ninjas ont une carte — chacune peut se déclencher une fois par match si la condition est remplie.`
      )
    );
  } else if (active.length >= 3) {
    challenges.push(
      challenge(
        'equip_all_cards',
        'done',
        'high',
        lang === 'en' ? 'All actives have tactic cards' : 'Tous les actifs ont une carte tactique',
        lang === 'en'
          ? 'Full card coverage — check synergy with orders below.'
          : 'Couverture cartes complète — vérifiez la synergie avec les consignes ci-dessous.'
      )
    );
  }

  const orderCounts = { Offensive: 0, Tank: 0, Protect: 0, Normal: 0 };
  for (const ninja of active) {
    const key = ninja.battle_strategy || 'Normal';
    if (orderCounts[key] != null) orderCounts[key] += 1;
    else orderCounts.Normal += 1;
  }

  if (orderCounts.Tank === 0) {
    challenges.push(
      challenge(
        'order_defensive',
        'pending',
        'medium',
        lang === 'en' ? 'Add a Defensive order' : 'Ajouter une consigne Défensive',
        lang === 'en'
          ? 'No provocation role — focused enemies may reach your damage dealers.'
          : 'Aucun rôle de provocation — les spécialistes dégâts peuvent être ciblés directement.'
      )
    );
  } else {
    challenges.push(
      challenge(
        'order_defensive',
        'done',
        'medium',
        lang === 'en' ? 'Defensive order assigned' : 'Consigne Défensive en place',
        lang === 'en'
          ? `${orderCounts.Tank} ninja(s) will draw enemy attacks.`
          : `${orderCounts.Tank} ninja(s) attirent les attaques adverses.`
      )
    );
  }

  if (orderCounts.Protect === 0) {
    challenges.push(
      challenge(
        'order_protection',
        'pending',
        'medium',
        lang === 'en' ? 'Add a Protection order' : 'Ajouter une consigne Protection',
        lang === 'en'
          ? 'No dedicated healer under 50% HP — long trades are risky.'
          : 'Pas de soin dédié sous 50 % PV — les échanges longs sont risqués.'
      )
    );
  } else {
    const protectNinjas = active.filter((n) => n.battle_strategy === 'Protect');
    const missingTarget = protectNinjas.filter((n) => !n.protect_target_ninja_id);
    if (missingTarget.length) {
      challenges.push(
        challenge(
          'order_protection',
          'warning',
          'medium',
          lang === 'en' ? 'Set Protection targets' : 'Définir les cibles Protection',
          lang === 'en'
            ? 'Protection ninjas need an ally to cover in the squad screen.'
            : 'Les ninjas en Protection doivent couvrir un allié — définissez la cible en Escouade.'
        )
      );
    } else {
      challenges.push(
        challenge(
          'order_protection',
          'done',
          'medium',
          lang === 'en' ? 'Protection order configured' : 'Consigne Protection configurée',
          lang === 'en'
            ? 'Heals trigger when the covered ally drops below 50% HP.'
            : 'Les soins se déclenchent quand l\'allié couvert passe sous 50 % PV.'
        )
      );
    }
  }

  if (orderCounts.Offensive === 0) {
    challenges.push(
      challenge(
        'order_offensive',
        'warning',
        'low',
        lang === 'en' ? 'Consider an Offensive order' : 'Envisager une consigne Offensive',
        lang === 'en'
          ? 'Burst damage may be inconsistent without an attack-focused ninja.'
          : 'Le burst peut manquer sans ninja orienté attaque.'
      )
    );
  } else {
    challenges.push(
      challenge(
        'order_offensive',
        'done',
        'low',
        lang === 'en' ? 'Offensive pressure present' : 'Pression offensive présente',
        lang === 'en'
          ? `${orderCounts.Offensive} ninja(s) prioritize their best combat stat.`
          : `${orderCounts.Offensive} ninja(s) priorisent leur meilleure stat de combat.`
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

  for (const ninja of active) {
    const card = cardByNinjaId.get(ninja.id);
    if (!card) continue;
    const strategy = ninja.battle_strategy || 'Normal';
    const expectedType = ORDER_CARD_TYPE[strategy];
    if (!expectedType || card.card_type === expectedType) continue;

    const typeLabels = {
      fr: { attack: 'attaque', defense: 'défense', support: 'soutien' },
      en: { attack: 'attack', defense: 'defense', support: 'support' },
    };
    challenges.push(
      challenge(
        `card_synergy_${ninja.id}`,
        'warning',
        'high',
        lang === 'en'
          ? `${ninja.name}: card/order mismatch`
          : `${ninja.name} : carte et consigne décalées`,
        lang === 'en'
          ? `Order ${strategy} pairs best with ${typeLabels.en[expectedType]} cards; equipped card is ${card.card_type}.`
          : `Consigne ${strategy} : privilégiez une carte ${typeLabels.fr[expectedType]} ; carte équipée : ${card.card_type}.`
      )
    );
  }

  const genNinja = active.find((n) => inferPrimaryArt(n) === 'genjutsu');
  if (genNinja) {
    const card = cardByNinjaId.get(genNinja.id);
    const hasGenCard =
      card &&
      (card.stat_type === 'genjutsu' ||
        card.trigger_kind === 'on_genjutsu_success' ||
        card.slug === 'gen-illusion-mineure');
    challenges.push(
      challenge(
        'genjutsu_specialist',
        hasGenCard ? 'done' : 'pending',
        'low',
        lang === 'en' ? 'Genjutsu specialist leveraged' : 'Spécialiste Genjutsu exploité',
        hasGenCard
          ? lang === 'en'
            ? `${genNinja.name} has a genjutsu-aligned card.`
            : `${genNinja.name} a une carte alignée Genjutsu.`
          : lang === 'en'
            ? `${genNinja.name} is a genjutsu specialist — consider a mind-haze or gen card.`
            : `${genNinja.name} est spécialiste Genjutsu — envisagez une carte genjutsu (brume mentale, etc.).`
      )
    );
  }

  const medNinja = active.find((n) => inferPrimaryArt(n) === 'medecine');
  if (medNinja) {
    const card = cardByNinjaId.get(medNinja.id);
    const hasMedCard = card && (card.stat_type === 'medecine' || card.card_type === 'support');
    challenges.push(
      challenge(
        'medicine_specialist',
        hasMedCard ? 'done' : 'pending',
        'low',
        lang === 'en' ? 'Medicine specialist leveraged' : 'Spécialiste Médecine exploité',
        hasMedCard
          ? lang === 'en'
            ? `${medNinja.name} carries a support/heal card.`
            : `${medNinja.name} porte une carte de soutien/soin.`
          : lang === 'en'
            ? `${medNinja.name} excels at medicine — a field dressing or squad heal card fits well.`
            : `${medNinja.name} excelle en Médecine — pansement ou soin de zone conviennent bien.`
      )
    );
  }

  return {
    challenges,
    summary: summarizeChallenges(challenges),
  };
}
