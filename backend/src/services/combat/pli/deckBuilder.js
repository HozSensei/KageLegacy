import { randomInt } from 'node:crypto';
import {
  TECHNIQUE_CARDS_PER_NINJA,
  DECK_ELEMENTS_COUNT,
  DOMAIN_LABELS,
  MAX_PLIS,
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

function hasExplicitTechniques(rawTechniques, fighterId) {
  const saved = rawTechniques?.[fighterId] ?? rawTechniques?.[String(fighterId)];
  return Boolean(saved?.primary || saved?.secondary);
}

/** Carte relais de comblement — proxy aléatoire, domaine dominant (comme relais K.O.). */
export function createRelaisFillerCard(team, fighter = null) {
  const label = fighter?.name
    ? `Relais · ${fighter.name}`
    : 'Relais · Escouade';
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

/**
 * Construit le deck : 3 cartes technique / ninja actif (ou relais si non configuré)
 * + éléments d'escouade + relais de comblement → toujours MAX_PLIS cartes.
 */
export function buildTeamDeck(
  team,
  { techniquesByNinjaId = {}, rawTechniquesByNinjaId = null, elementCards = [] } = {}
) {
  const rawTechniques = rawTechniquesByNinjaId ?? techniquesByNinjaId;
  const cards = [];

  for (const fighter of team.fighters) {
    if (!hasExplicitTechniques(rawTechniques, fighter.id)) {
      for (let i = 0; i < TECHNIQUE_CARDS_PER_NINJA; i += 1) {
        cards.push(createRelaisFillerCard(team, fighter));
      }
      continue;
    }

    const picks =
      techniquesByNinjaId[fighter.id] ||
      techniquesByNinjaId[String(fighter.id)] ||
      defaultTechniquesForFighter(fighter);
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
