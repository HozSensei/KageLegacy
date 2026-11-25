/** Filtres de possession / appartenance aux decks (vue Collection). */
export const OWNERSHIP_FILTERS = [
  '',
  'owned',
  'in_active_deck',
  'not_in_active_deck',
  'in_any_deck',
  'not_in_any_deck',
];

export const OWNERSHIP_FILTER_SET = new Set(OWNERSHIP_FILTERS);

/**
 * @param {{ kind: string, card?: { id?: number|string } }} slot
 * @param {string} filter
 * @param {Set<number>} activeDeckCardIds cardDefinitionId
 * @param {Set<number>} anyDeckCardIds cardDefinitionId
 */
export function slotMatchesOwnershipFilter(
  slot,
  filter,
  activeDeckCardIds = new Set(),
  anyDeckCardIds = new Set()
) {
  if (!filter) return true;
  if (slot?.kind !== 'owned') return false;

  const defId = Number(slot.card?.id);
  const inActive = activeDeckCardIds.has(defId);
  const inAny = anyDeckCardIds.has(defId);

  switch (filter) {
    case 'owned':
      return true;
    case 'in_active_deck':
      return inActive;
    case 'not_in_active_deck':
      return !inActive;
    case 'in_any_deck':
      return inAny;
    case 'not_in_any_deck':
      return !inAny;
    default:
      return true;
  }
}

/** Construit un Set de cardDefinitionId à partir des decks. */
export function cardDefinitionIdsFromDecks(decks, { activeOnly = false } = {}) {
  const ids = new Set();
  for (const deck of decks || []) {
    if (activeOnly && !deck?.isActive) continue;
    for (const card of deck?.cards || []) {
      const id = Number(card.cardDefinitionId ?? card.card?.id);
      if (Number.isFinite(id)) ids.add(id);
    }
  }
  return ids;
}
