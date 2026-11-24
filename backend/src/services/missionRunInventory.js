/**
 * Helpers purs — inventaire / bourse de parcours mission.
 */
import {
  RUN_ECONOMY_VERSION,
  RUN_INVENTORY_SLOTS,
  RUN_PURSE_GAINS,
  getShopItem,
} from '../config/missionRunEconomy.js';

export function createEmptyInventory() {
  return Array.from({ length: RUN_INVENTORY_SLOTS }, (_, slot) => ({
    slot,
    itemId: null,
    qty: 0,
    meta: null,
  }));
}

export function createRunPlayerState({
  maxHp,
  purseStake = 0,
  hardMode = false,
  rewardMult = 1,
  lore = null,
} = {}) {
  return {
    economyVersion: RUN_ECONOMY_VERSION,
    hp: maxHp,
    maxHp,
    purse: Number(purseStake) || 0,
    purseStake: Number(purseStake) || 0,
    inventory: createEmptyInventory(),
    pendingLoot: { cards: [] },
    nextCombatMods: {},
    runMods: { damagePct: 0 },
    combatsWon: 0,
    branchXpMult: 1,
    branchId: null,
    hardMode: Boolean(hardMode),
    ...(hardMode ? { rewardMult: Number(rewardMult) || 1.2 } : {}),
    ...(lore ? { lore } : {}),
  };
}

export function getPurse(player) {
  if (player?.purse != null) return Math.max(0, Number(player.purse) || 0);
  // Legacy contraband runs — treat as purse for display only.
  return Math.max(0, Number(player?.contraband ?? player?.scrap) || 0);
}

export function findFreeSlot(inventory) {
  const slots = Array.isArray(inventory) ? inventory : [];
  return slots.findIndex(slot => !slot?.itemId);
}

export function countOccupiedSlots(inventory) {
  return (Array.isArray(inventory) ? inventory : []).filter(slot => slot?.itemId).length;
}

/**
 * Place un item. Si plein et replaceSlot fourni, remplace ce slot.
 * @returns {{ ok: true, inventory } | { ok: false, code: string }}
 */
export function placeInventoryItem(inventory, item, { replaceSlot = null, meta = null } = {}) {
  const next = (Array.isArray(inventory) ? inventory : createEmptyInventory()).map(slot => ({
    ...slot,
  }));
  const free = findFreeSlot(next);
  if (free >= 0) {
    next[free] = {
      slot: free,
      itemId: item.id,
      qty: 1,
      meta: meta || null,
    };
    return { ok: true, inventory: next, slot: free };
  }
  if (replaceSlot == null || replaceSlot < 0 || replaceSlot >= next.length) {
    return { ok: false, code: 'INVENTORY_FULL' };
  }
  next[replaceSlot] = {
    slot: replaceSlot,
    itemId: item.id,
    qty: 1,
    meta: meta || null,
  };
  return { ok: true, inventory: next, slot: replaceSlot, replaced: true };
}

export function discardInventorySlot(inventory, slotIndex) {
  const next = (Array.isArray(inventory) ? inventory : createEmptyInventory()).map(slot => ({
    ...slot,
  }));
  if (slotIndex < 0 || slotIndex >= next.length || !next[slotIndex]?.itemId) {
    return { ok: false, code: 'EMPTY_SLOT' };
  }
  next[slotIndex] = { slot: slotIndex, itemId: null, qty: 0, meta: null };
  return { ok: true, inventory: next };
}

export function addPurse(player, amount) {
  const gain = Math.max(0, Number(amount) || 0);
  return { ...player, purse: getPurse(player) + gain };
}

export function grantNodePurse(player) {
  return addPurse(player, RUN_PURSE_GAINS.node);
}

export function grantCombatPurse(player) {
  return addPurse(player, RUN_PURSE_GAINS.combat);
}

export function spendPurse(player, cost) {
  const price = Math.max(0, Number(cost) || 0);
  const purse = getPurse(player);
  if (purse < price) return { ok: false, code: 'INSUFFICIENT_PURSE' };
  return { ok: true, player: { ...player, purse: purse - price } };
}

export function healPercent(player, pct) {
  const maxHp = Number(player.maxHp) || 1;
  const heal = Math.max(1, Math.floor(maxHp * pct));
  return {
    ...player,
    hp: Math.min(maxHp, (Number(player.hp) || 0) + heal),
    lastHeal: heal,
  };
}

/**
 * Applique l’effet d’un consommable hors combat.
 */
export function applyConsumableEffect(player, effect) {
  if (!effect?.type) return { ok: false, code: 'NO_EFFECT' };
  let next = { ...player };

  if (effect.type === 'heal_percent') {
    next = healPercent(next, Number(effect.value) || 0);
    return { ok: true, player: next, log: { heal: next.lastHeal } };
  }
  if (effect.type === 'run_damage_pct') {
    const runMods = { ...(next.runMods || {}) };
    runMods.damagePct = (Number(runMods.damagePct) || 0) + (Number(effect.value) || 0);
    next.runMods = runMods;
    return { ok: true, player: next, log: { runDamagePct: effect.value } };
  }
  if (effect.type === 'next_combat_block') {
    const mods = { ...(next.nextCombatMods || {}) };
    mods.block = (Number(mods.block) || 0) + (Number(effect.value) || 0);
    next.nextCombatMods = mods;
    return { ok: true, player: next, log: { nextBlock: effect.value } };
  }
  if (effect.type === 'next_combat_chakra') {
    const mods = { ...(next.nextCombatMods || {}) };
    mods.chakra = (Number(mods.chakra) || 0) + (Number(effect.value) || 0);
    next.nextCombatMods = mods;
    return { ok: true, player: next, log: { nextChakra: effect.value } };
  }
  if (effect.type === 'next_combat_damage_pct') {
    const mods = { ...(next.nextCombatMods || {}) };
    mods.damagePct = (Number(mods.damagePct) || 0) + (Number(effect.value) || 0);
    next.nextCombatMods = mods;
    return { ok: true, player: next, log: { nextDamagePct: effect.value } };
  }
  return { ok: false, code: 'UNKNOWN_EFFECT' };
}

export function useInventorySlot(player, slotIndex) {
  const inventory = player.inventory || createEmptyInventory();
  const slot = inventory[slotIndex];
  if (!slot?.itemId) return { ok: false, code: 'EMPTY_SLOT' };
  const def = getShopItem(slot.itemId);
  if (!def) return { ok: false, code: 'UNKNOWN_ITEM' };
  if (def.kind === 'pending_card') {
    return { ok: false, code: 'SEALED_UNTIL_FINISH' };
  }
  if (def.kind !== 'consumable' || !def.effect) {
    return { ok: false, code: 'NOT_USABLE' };
  }
  const applied = applyConsumableEffect(player, def.effect);
  if (!applied.ok) return applied;
  const discarded = discardInventorySlot(applied.player.inventory || inventory, slotIndex);
  return {
    ok: true,
    player: {
      ...applied.player,
      inventory: discarded.inventory,
      lastHeal: undefined,
    },
    log: { itemId: def.id, ...applied.log },
  };
}

export function pendingCardEntryFromItem(item, meta = null) {
  if (!item || item.kind !== 'pending_card') return null;
  return {
    itemId: item.id,
    rarity: item.rarity || 'common',
    meta: meta || { rarity: item.rarity || 'common' },
  };
}

/** Enregistre un parchemin scellé pour le grant de fin (survit à un inventaire corrompu). */
export function trackPendingCard(player, item, meta = null) {
  const entry = pendingCardEntryFromItem(item, meta);
  if (!entry) return player;
  const cards = [...(player.pendingLoot?.cards || []), entry];
  return { ...player, pendingLoot: { ...(player.pendingLoot || {}), cards } };
}

/** Retire une occurrence de parchemin scellé (jet / remplacement). */
export function untrackPendingCard(player, itemId) {
  if (!itemId) return player;
  const cards = [...(player.pendingLoot?.cards || [])];
  const idx = cards.findIndex(c => c?.itemId === itemId);
  if (idx < 0) return player;
  cards.splice(idx, 1);
  return { ...player, pendingLoot: { ...(player.pendingLoot || {}), cards } };
}

export function collectPendingCardsFromInventory(player) {
  const fromLoot = [...(player.pendingLoot?.cards || [])];
  const fromInv = [];
  for (const slot of player.inventory || []) {
    if (!slot?.itemId) continue;
    const def = getShopItem(slot.itemId);
    if (def?.kind === 'pending_card') {
      fromInv.push({
        itemId: def.id,
        rarity: def.rarity || slot.meta?.rarity || 'common',
        meta: slot.meta || null,
      });
    }
  }
  // Dedup : pendingLoot est la source de vérité ; l’inventaire complète les anciens runs.
  if (fromLoot.length) return fromLoot;
  return fromInv;
}
