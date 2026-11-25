/**
 * Réexport FE des capacités inventaire (source : shared/).
 * @see shared/inventoryCapacity.js
 */
export {
  CHEST_BASE_PAGES,
  CHEST_CAPACITY,
  CHEST_PAGE_SIZE,
  POUCH_CAPACITY,
  capacityFor,
  chestSlotsNeededForRewards,
  countsTowardPouchCapacity,
  emptySlotCount,
  getChestCapacity,
  pouchCapacityUsed,
} from '@shared/inventoryCapacity.js';
