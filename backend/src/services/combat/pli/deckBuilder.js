import { randomInt } from 'node:crypto';
import {
  TECHNIQUE_CARDS_PER_NINJA,
  STAT_CARDS_PER_NINJA,
  DOMAIN_LABELS,
  DOMAINS,
} from './constants.js';

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

/** Carte relais — proxy aléatoire si emplacement non configuré ou propriétaire K.O. */
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

function slotIdsForFighter(techniqueSlotsByNinjaId, fighterId) {
  return (
    techniqueSlotsByNinjaId[fighterId] ||
    techniqueSlotsByNinjaId[String(fighterId)] ||
    []
  );
}

function techniquesForFighter(techniquesByNinjaId, fighter) {
  return (
    techniquesByNinjaId[fighter.id] ||
    techniquesByNinjaId[String(fighter.id)] ||
    defaultTechniquesForFighter(fighter)
  );
}

/**
 * Construit le deck : par ninja actif
 * — 1 carte technique inventaire (ou relais)
 * — 2 cartes stat / domaine (primaire + secondaire, ou relais)
 * → 9 plis pour 3 ninjas, sans comblement.
 */
export function buildTeamDeck(
  team,
  {
    techniquesByNinjaId = {},
    rawTechniquesByNinjaId = null,
    techniqueSlotsByNinjaId = {},
    techniqueCardsById = {},
  } = {}
) {
  const rawTechniques = rawTechniquesByNinjaId ?? techniquesByNinjaId;
  const cards = [];

  for (const fighter of team.fighters) {
    const slotIds = slotIdsForFighter(techniqueSlotsByNinjaId, fighter.id)
      .slice(0, TECHNIQUE_CARDS_PER_NINJA)
      .map(Number)
      .filter(Boolean);

    const inventoryCard = slotIds
      .map((id) => techniqueCardsById[id] || techniqueCardsById[String(id)])
      .find(Boolean);

    if (inventoryCard) {
      const domain = inventoryCard.statType || inventoryCard.stat_type || 'taijutsu';
      const name = inventoryCard.nameFr || inventoryCard.name_fr || inventoryCard.slug;
      cards.push({
        kind: 'technique',
        ownerId: fighter.id,
        ownerName: fighter.name,
        domain,
        label: `${fighter.name} · ${name}`,
        userTacticCardId: inventoryCard.userTacticCardId || inventoryCard.user_tactic_card_id,
        cardDef: inventoryCard,
      });
    } else {
      cards.push(createRelaisFillerCard(team, fighter));
    }

    if (!hasExplicitTechniques(rawTechniques, fighter.id)) {
      for (let i = 0; i < STAT_CARDS_PER_NINJA; i += 1) {
        cards.push(createRelaisFillerCard(team, fighter));
      }
      continue;
    }

    const picks = techniquesForFighter(techniquesByNinjaId, fighter);
    const primary = picks.primary || picks.primaryTechnique || 'taijutsu';
    const secondary = picks.secondary || picks.secondaryTechnique || 'ninjutsu';

    cards.push({
      kind: 'domain',
      ownerId: fighter.id,
      ownerName: fighter.name,
      domain: primary,
      label: `${fighter.name} · ${DOMAIN_LABELS[primary]}`,
    });
    cards.push({
      kind: 'domain',
      ownerId: fighter.id,
      ownerName: fighter.name,
      domain: secondary,
      label: `${fighter.name} · ${DOMAIN_LABELS[secondary]}`,
    });
  }

  shuffleInPlace(cards);
  return cards;
}

export function markRelaisCards(deck, koOwnerIds) {
  const koSet = new Set(koOwnerIds);
  for (const card of deck) {
    if ((card.kind === 'technique' || card.kind === 'domain') && koSet.has(card.ownerId)) {
      card.relais = true;
      card.relaisOwnerId = card.ownerId;
      card.relaisOwnerName = card.ownerName;
    }
  }
}
