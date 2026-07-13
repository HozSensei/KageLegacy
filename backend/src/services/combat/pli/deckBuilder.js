import { randomInt } from 'node:crypto';
import { TECHNIQUE_CARDS_PER_NINJA, DOMAIN_LABELS, MAX_PLIS } from './constants.js';

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Carte relais de comblement — proxy aléatoire, domaine dominant (comme relais K.O.). */
export function createRelaisFillerCard(team, fighter = null) {
  const label = fighter?.name ? `Relais · ${fighter.name}` : 'Relais · Escouade';
  return {
    kind: 'relais',
    padded: true,
    ownerId: fighter?.id ?? null,
    ownerName: fighter?.name ?? null,
    domain: null,
    label,
  };
}

/** Complète le deck jusqu'à MAX_PLIS avec des cartes relais. */
export function padDeckToMaxPlis(cards, team) {
  while (cards.length < MAX_PLIS) {
    cards.push(createRelaisFillerCard(team));
  }
  return cards;
}

function slotIdsForFighter(techniqueSlotsByNinjaId, fighterId) {
  return (
    techniqueSlotsByNinjaId[fighterId] ||
    techniqueSlotsByNinjaId[String(fighterId)] ||
    []
  );
}

/**
 * Construit le deck : 3 cartes technique ninja / ninja actif (ou relais si non configuré)
 * + relais de comblement → toujours MAX_PLIS cartes.
 */
export function buildTeamDeck(
  team,
  { techniqueSlotsByNinjaId = {}, techniqueCardsById = {} } = {}
) {
  const cards = [];

  for (const fighter of team.fighters) {
    const slotIds = slotIdsForFighter(techniqueSlotsByNinjaId, fighter.id)
      .slice(0, TECHNIQUE_CARDS_PER_NINJA)
      .map(Number)
      .filter(Boolean);

    const assigned = slotIds
      .map((id) => techniqueCardsById[id] || techniqueCardsById[String(id)])
      .filter(Boolean);

    if (!assigned.length) {
      for (let i = 0; i < TECHNIQUE_CARDS_PER_NINJA; i += 1) {
        cards.push(createRelaisFillerCard(team, fighter));
      }
      continue;
    }

    for (let i = 0; i < TECHNIQUE_CARDS_PER_NINJA; i += 1) {
      const card = assigned[i];
      if (!card) {
        cards.push(createRelaisFillerCard(team, fighter));
        continue;
      }
      const domain = card.statType || card.stat_type || 'taijutsu';
      const name = card.nameFr || card.name_fr || card.slug;
      cards.push({
        kind: 'technique',
        ownerId: fighter.id,
        ownerName: fighter.name,
        domain,
        label: `${fighter.name} · ${name}`,
        userTacticCardId: card.userTacticCardId || card.user_tactic_card_id,
        cardDef: card,
      });
    }
  }

  padDeckToMaxPlis(cards, team);
  shuffleInPlace(cards);
  return cards;
}

export function markRelaisCards(deck, koOwnerIds) {
  const koSet = new Set(koOwnerIds);
  for (const card of deck) {
    if (card.kind === 'technique' && koSet.has(card.ownerId)) {
      card.relais = true;
      card.relaisOwnerId = card.ownerId;
      card.relaisOwnerName = card.ownerName;
    }
  }
}

/** @deprecated Conservé pour les tests legacy — plus utilisé en production. */
export function defaultTechniquesForFighter(fighter) {
  const domains = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];
  const ranked = domains
    .map((d) => ({ domain: d, value: fighter.stats[d] || 0 }))
    .sort((a, b) => b.value - a.value);
  return {
    primary: ranked[0]?.domain || 'taijutsu',
    secondary: ranked[1]?.domain || 'ninjutsu',
  };
}
