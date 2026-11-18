const ART_KEYS = new Set(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

function heldCards(player = {}) {
  const cards = [...(player.hand || [])];
  if (player.reserveCard) cards.push(player.reserveCard);
  if (player.reservedCard) cards.push(player.reservedCard);
  const unique = new Map();
  for (const card of cards) {
    if (card?.heldEffect) {
      const key = card.instanceId || card.slug || card.id;
      if (!unique.has(key)) unique.set(key, card);
    }
  }
  return [...unique.values()];
}

export function heldEffectMods(player = {}, card = null) {
  const mods = { evadeChance: 0, artDamagePct: 0, healPct: 0 };
  for (const held of heldCards(player)) {
    const effect = held.heldEffect;
    if (effect.type === 'evade_percent') {
      mods.evadeChance += Math.max(0, Number(effect.value) || 0) / 100;
    } else if (
      effect.type === 'art_damage_percent' &&
      ART_KEYS.has(effect.statType) &&
      effect.statType === card?.statType
    ) {
      mods.artDamagePct += Math.max(0, Number(effect.value) || 0) / 100;
    } else if (effect.type === 'heal_percent') {
      mods.healPct += Math.max(0, Number(effect.value) || 0) / 100;
    }
  }
  mods.evadeChance = Math.min(0.75, mods.evadeChance);
  return mods;
}

export function applyHeldTurnStart(player = {}) {
  const next = { ...player };
  const logs = [];
  for (const card of heldCards(player)) {
    const effect = card.heldEffect;
    if (effect.type === 'gain_chakra') {
      const amount = Math.max(0, Math.floor(Number(effect.value) || 0));
      if (amount > 0) {
        next.chakra = (Number(next.chakra) || 0) + amount;
        logs.push({ type: 'held_gain_chakra', amount, chakra: next.chakra, card: card.slug });
      }
    } else if (effect.type === 'starting_block') {
      const amount = Math.max(0, Math.floor(Number(effect.value) || 0));
      if (amount > 0) {
        next.block = (Number(next.block) || 0) + amount;
        logs.push({ type: 'held_gain_block', amount, block: next.block, card: card.slug });
      }
    }
  }
  return { player: next, logs };
}
