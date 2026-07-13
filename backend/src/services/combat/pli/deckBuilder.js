import { randomInt } from 'node:crypto';
import {
  TECHNIQUE_CARDS_PER_NINJA,
  DECK_ELEMENTS_COUNT,
  DOMAIN_LABELS,
} from './constants.js';
import { DOMAINS } from './constants.js';

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function defaultTechniquesForFighter(fighter) {
  const ranked = DOMAINS.map((d) => ({ domain: d, value: fighter.stats[d] || 0 }))
    .sort((a, b) => b.value - a.value);
  return {
    primary: ranked[0]?.domain || 'taijutsu',
    secondary: ranked[1]?.domain || 'ninjutsu',
  };
}

/**
 * Construit le deck : 3 cartes technique / ninja actif + 5 éléments d'escouade.
 */
export function buildTeamDeck(team, { techniquesByNinjaId = {}, elementCards = [] } = {}) {
  const cards = [];

  for (const fighter of team.fighters) {
    const picks =
      techniquesByNinjaId[fighter.id] || defaultTechniquesForFighter(fighter);
    const primary = picks.primary || picks.primaryTechnique;
    const secondary = picks.secondary || picks.secondaryTechnique;

    cards.push({
      kind: 'technique',
      ownerId: fighter.id,
      ownerName: fighter.name,
      domain: primary,
      label: `${fighter.name} · ${DOMAIN_LABELS[primary]}`,
    });
    cards.push({
      kind: 'technique',
      ownerId: fighter.id,
      ownerName: fighter.name,
      domain: secondary,
      label: `${fighter.name} · ${DOMAIN_LABELS[secondary]}`,
    });
    cards.push({
      kind: 'technique',
      ownerId: fighter.id,
      ownerName: fighter.name,
      domain: secondary,
      label: `${fighter.name} · ${DOMAIN_LABELS[secondary]}`,
    });
  }

  const elements = elementCards.slice(0, DECK_ELEMENTS_COUNT);
  for (const el of elements) {
    cards.push({
      kind: 'element',
      ownerId: null,
      ownerName: null,
      domain: el.statType || el.stat_type || 'ninjutsu',
      label: el.nameFr || el.name_fr || el.slug,
      elementDef: el,
      userTacticCardId: el.userTacticCardId || el.user_tactic_card_id,
    });
  }

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
