/**
 * Catalogue objets partagé — colporteur (run), boutique, inventaire coffre/poche.
 */

function shopPriceFromRun(priceRun) {
  return Math.round((Number(priceRun) || 0) * 2 / 5) * 5;
}

function item(def) {
  const priceRun = Number(def.priceRun ?? def.price) || 0;
  return Object.freeze({
    ...def,
    priceRun,
    priceShop: def.priceShop != null ? Number(def.priceShop) : shopPriceFromRun(priceRun),
    /** Compat colporteur / code legacy */
    price: priceRun,
  });
}

/**
 * kind:
 *  - consumable → inventaire run / poche, usable hors combat ou mods de combat
 *  - pending_card → scellé, révélation depuis le coffre
 *  - booster → ouverture depuis le coffre (BP/quête)
 */
export const ITEM_CATALOG = Object.freeze([
  item({
    id: 'heal_bandage',
    kind: 'consumable',
    priceRun: 40,
    nameFr: 'Bandage',
    nameEn: 'Bandage',
    descriptionFr: 'Soigne 25 % des PV max (hors combat).',
    descriptionEn: 'Heals 25% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.25 }),
  }),
  item({
    id: 'heal_tonic',
    kind: 'consumable',
    priceRun: 75,
    nameFr: 'Tonique',
    nameEn: 'Tonic',
    descriptionFr: 'Soigne 50 % des PV max (hors combat).',
    descriptionEn: 'Heals 50% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.5 }),
  }),
  item({
    id: 'heal_elixir',
    kind: 'consumable',
    priceRun: 110,
    nameFr: 'Élixir vital',
    nameEn: 'Vital Elixir',
    descriptionFr: 'Soigne 75 % des PV max (hors combat).',
    descriptionEn: 'Heals 75% of max HP (out of combat).',
    effect: Object.freeze({ type: 'heal_percent', value: 0.75 }),
  }),
  item({
    id: 'card_mystery_common',
    kind: 'pending_card',
    rarity: 'common',
    priceRun: 55,
    nameFr: 'Parchemin scellé (commun)',
    nameEn: 'Sealed scroll (common)',
    descriptionFr: 'Carte normale — révéler depuis le coffre.',
    descriptionEn: 'Normal card — reveal from the chest.',
  }),
  item({
    id: 'card_mystery_rare',
    kind: 'pending_card',
    rarity: 'rare',
    priceRun: 130,
    nameFr: 'Parchemin scellé (rare)',
    nameEn: 'Sealed scroll (rare)',
    descriptionFr: 'Carte rare — révéler depuis le coffre.',
    descriptionEn: 'Rare card — reveal from the chest.',
  }),
  item({
    id: 'card_mystery_legendary',
    kind: 'pending_card',
    rarity: 'legendary',
    priceRun: 210,
    nameFr: 'Parchemin scellé (légendaire)',
    nameEn: 'Sealed scroll (legendary)',
    descriptionFr: 'Carte légendaire — révéler depuis le coffre.',
    descriptionEn: 'Legendary card — reveal from the chest.',
  }),
  item({
    id: 'run_boost_damage',
    kind: 'consumable',
    priceRun: 70,
    nameFr: 'Sceau de frappe',
    nameEn: 'Strike Seal',
    descriptionFr: '+10 % dégâts pour le reste du parcours.',
    descriptionEn: '+10% damage for the rest of the run.',
    effect: Object.freeze({ type: 'run_damage_pct', value: 10 }),
  }),
  item({
    id: 'next_block',
    kind: 'consumable',
    priceRun: 50,
    nameFr: 'Talisman d’armure',
    nameEn: 'Armor Talisman',
    descriptionFr: '+8 armure au début du prochain combat.',
    descriptionEn: '+8 armor at the start of the next fight.',
    effect: Object.freeze({ type: 'next_combat_block', value: 8 }),
  }),
  item({
    id: 'next_chakra',
    kind: 'consumable',
    priceRun: 55,
    nameFr: 'Pilule de chakra',
    nameEn: 'Chakra Pill',
    descriptionFr: '+1 Chakra au début du prochain combat.',
    descriptionEn: '+1 Chakra at the start of the next fight.',
    effect: Object.freeze({ type: 'next_combat_chakra', value: 1 }),
  }),
  item({
    id: 'next_damage',
    kind: 'consumable',
    priceRun: 65,
    nameFr: 'Encens de rage',
    nameEn: 'Rage Incense',
    descriptionFr: '+15 % dégâts pendant le prochain combat.',
    descriptionEn: '+15% damage during the next fight.',
    effect: Object.freeze({ type: 'next_combat_damage_pct', value: 15 }),
  }),
  item({
    id: 'run_xp_scroll',
    kind: 'consumable',
    priceRun: 90,
    nameFr: 'Parchemin d’étude',
    nameEn: 'Study Scroll',
    descriptionFr: '×1.25 XP à la fin du parcours.',
    descriptionEn: '×1.25 XP at the end of the run.',
    effect: Object.freeze({ type: 'run_xp_mult', value: 1.25 }),
  }),
  item({
    id: 'run_purse_charm',
    kind: 'consumable',
    priceRun: 80,
    nameFr: 'Charme du colporteur',
    nameEn: 'Peddler Charm',
    descriptionFr: '+25 % gains de bourse de mission (nœuds et combats).',
    descriptionEn: '+25% mission purse gains (nodes and fights).',
    effect: Object.freeze({ type: 'run_purse_mult', value: 1.25 }),
  }),
  item({
    id: 'run_card_omen',
    kind: 'consumable',
    priceRun: 100,
    nameFr: 'Augure de butin',
    nameEn: 'Loot Omen',
    descriptionFr: '+15 % de chance de carte bonus à la fin du parcours.',
    descriptionEn: '+15 percentage points bonus card chance at run end.',
    effect: Object.freeze({ type: 'run_card_chance', value: 15 }),
  }),
  item({
    id: 'run_second_wind',
    kind: 'consumable',
    priceRun: 150,
    nameFr: 'Second souffle',
    nameEn: 'Second Wind',
    descriptionFr: 'Une fois : revive à 30 % PV max si vous tombez (hors dernier combat).',
    descriptionEn: 'Once: revive at 30% max HP if you fall (not the final fight).',
    effect: Object.freeze({ type: 'run_second_wind', value: 0.3 }),
  }),
  item({
    id: 'next_draw',
    kind: 'consumable',
    priceRun: 60,
    nameFr: 'Fils de mémoire',
    nameEn: 'Memory Threads',
    descriptionFr: 'Total de cartes en main +1 pour le prochain combat.',
    descriptionEn: 'Hand size +1 for the next combat.',
    effect: Object.freeze({ type: 'next_combat_draw', value: 1 }),
  }),
  item({
    id: 'run_armor_oil',
    kind: 'consumable',
    priceRun: 120,
    nameFr: 'Huile d’armure',
    nameEn: 'Armor Oil',
    descriptionFr: '+20 armure au début de chaque combat du parcours.',
    descriptionEn: '+20 armor at the start of every fight in the run.',
    effect: Object.freeze({ type: 'run_start_block', value: 20 }),
  }),
  item({
    id: 'booster_standard',
    kind: 'booster',
    boosterType: 'standard',
    priceRun: 0,
    priceShop: 0,
    nameFr: 'Parchemin standard',
    nameEn: 'Standard scroll',
    descriptionFr: 'Booster à ouvrir depuis le coffre.',
    descriptionEn: 'Booster to open from the chest.',
  }),
  item({
    id: 'booster_premium',
    kind: 'booster',
    boosterType: 'premium',
    priceRun: 0,
    priceShop: 0,
    nameFr: 'Parchemin premium',
    nameEn: 'Premium scroll',
    descriptionFr: 'Booster premium à ouvrir depuis le coffre.',
    descriptionEn: 'Premium booster to open from the chest.',
  }),
  item({
    id: 'booster_legendary',
    kind: 'booster',
    boosterType: 'legendary',
    priceRun: 0,
    priceShop: 0,
    nameFr: 'Parchemin légendaire',
    nameEn: 'Legendary scroll',
    descriptionFr: 'Booster légendaire à ouvrir depuis le coffre.',
    descriptionEn: 'Legendary booster to open from the chest.',
  }),
]);

/** Catalogue colporteur / run (exclut les boosters hors-run). */
export const RUN_SHOP_CATALOG = Object.freeze(
  ITEM_CATALOG.filter(i => i.kind === 'consumable' || i.kind === 'pending_card'),
);

export const RUN_SHOP_OFFER_COUNT = 4;
export const ACCOUNT_SHOP_OFFER_COUNT = 6;

export function getItem(itemId) {
  return ITEM_CATALOG.find(i => i.id === itemId) || null;
}

/** Alias historique */
export function getShopItem(itemId) {
  return getItem(itemId);
}

export function boosterItemKey(boosterType) {
  const t = String(boosterType || 'standard');
  if (t === 'premium' || t === 'elemental') return 'booster_premium';
  if (t === 'legendary' || t === 'elite' || t === 'ascendant') return 'booster_legendary';
  return 'booster_standard';
}

/**
 * Tire une offre shop run (stock 1, sans doublon).
 * Garantit au moins un soin bas de gamme quand possible.
 */
export function rollShopOffer(rng = Math.random) {
  const pool = [...RUN_SHOP_CATALOG];
  const offer = [];
  const bandage = pool.find(i => i.id === 'heal_bandage');
  if (bandage) {
    offer.push({ ...bandage, stock: 1, price: bandage.priceRun });
    pool.splice(
      pool.findIndex(i => i.id === bandage.id),
      1,
    );
  }
  while (offer.length < RUN_SHOP_OFFER_COUNT && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    const [entry] = pool.splice(idx, 1);
    offer.push({ ...entry, stock: 1, price: entry.priceRun });
  }
  return offer;
}

/** PRNG déterministe (mulberry32) pour l’offre journalière. */
function dayRng(dayKey) {
  let h = 2166136261;
  const s = String(dayKey || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Offre journalière boutique compte (prix shop, stock 1–2).
 * Seed déterministe par dayKey.
 */
export function rollAccountDailyOffer(dayKey, rng = null) {
  const rand = typeof rng === 'function' ? rng : dayRng(dayKey);
  const pool = RUN_SHOP_CATALOG.map(i => ({ ...i }));
  const offer = [];
  while (offer.length < ACCOUNT_SHOP_OFFER_COUNT && pool.length) {
    const idx = Math.floor(rand() * pool.length);
    const [entry] = pool.splice(idx, 1);
    const stock = rand() < 0.35 ? 2 : 1;
    offer.push({
      id: entry.id,
      kind: entry.kind,
      rarity: entry.rarity || null,
      nameFr: entry.nameFr,
      nameEn: entry.nameEn,
      descriptionFr: entry.descriptionFr,
      descriptionEn: entry.descriptionEn,
      price: entry.priceShop,
      priceShop: entry.priceShop,
      stock,
      stockMax: stock,
    });
  }
  return { dayKey, offers: offer };
}

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
