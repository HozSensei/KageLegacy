/**
 * Shop élargi — packs Kage Coins, cosmétiques, offre Battle Pass.
 * Noms originaux (pas d'IP tierce). Achat coins = stub / Stripe léger.
 */
import { query, getConnection } from '../config/database.js';
import {
  getBattlePassState,
  getUserCosmetics,
  unlockPremium,
  PREMIUM_COST_KAGE_COINS,
} from './battlePassService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/** Packs alignés BATTLE_PASS.md — prix affichés, fulfillment stub MVP. */
export const COIN_PACK_CATALOG = {
  spark: {
    id: 'spark',
    nameFr: 'Éclat de Chakra',
    nameEn: 'Chakra Spark',
    descriptionFr: 'Petite réserve de Kage Coins pour un booster premium.',
    descriptionEn: 'A small Kage Coins stash for one premium scroll.',
    coins: 100,
    bonusCoins: 0,
    priceEur: 1,
    sortOrder: 1,
  },
  ember: {
    id: 'ember',
    nameFr: 'Braise du Village',
    nameEn: 'Village Ember',
    descriptionFr: '500 coins + 50 bonus — idéal pour le Passe premium.',
    descriptionEn: '500 coins + 50 bonus — ideal for the premium Pass.',
    coins: 500,
    bonusCoins: 50,
    priceEur: 5,
    sortOrder: 2,
  },
  forge: {
    id: 'forge',
    nameFr: 'Forge des Ombres',
    nameEn: 'Shadow Forge',
    descriptionFr: '1000 coins + 150 bonus pour stocker et cosmétiques.',
    descriptionEn: '1000 coins + 150 bonus for stockpile and cosmetics.',
    coins: 1000,
    bonusCoins: 150,
    priceEur: 10,
    sortOrder: 3,
  },
  vault: {
    id: 'vault',
    nameFr: 'Coffre du Kage',
    nameEn: "Kage's Vault",
    descriptionFr: '5000 coins + 1000 bonus — réserve de saison.',
    descriptionEn: '5000 coins + 1000 bonus — season reserve.',
    coins: 5000,
    bonusCoins: 1000,
    priceEur: 50,
    sortOrder: 4,
  },
};

export const COIN_PACK_IDS = Object.keys(COIN_PACK_CATALOG);

/** Cosmétiques boutique — frames, dos de carte, titres. */
export const COSMETIC_SHOP_CATALOG = {
  mist_ring: {
    key: 'mist_ring',
    cosmeticType: 'avatar_frame',
    nameFr: 'Anneau de Brume',
    nameEn: 'Mist Ring',
    descriptionFr: 'Cadre d’avatar aux volutes de brume du crépuscule.',
    descriptionEn: 'Avatar frame with twilight mist swirls.',
    cost: { ryos: 2500, kageCoins: 0 },
    rarity: 'common',
  },
  ember_halo: {
    key: 'ember_halo',
    cosmeticType: 'avatar_frame',
    nameFr: 'Halo de Braise',
    nameEn: 'Ember Halo',
    descriptionFr: 'Anneau de braises autour du portrait sensei.',
    descriptionEn: 'A ring of embers around the sensei portrait.',
    cost: { ryos: 0, kageCoins: 120 },
    rarity: 'rare',
  },
  jade_circle: {
    key: 'jade_circle',
    cosmeticType: 'avatar_frame',
    nameFr: 'Cercle de Jade',
    nameEn: 'Jade Circle',
    descriptionFr: 'Cadre jade sculpté — signature des stratèges.',
    descriptionEn: 'Carved jade frame — strategist signature.',
    cost: { ryos: 4000, kageCoins: 80 },
    rarity: 'rare',
  },
  sealed_ink: {
    key: 'sealed_ink',
    cosmeticType: 'card_back',
    nameFr: 'Encre Scellée',
    nameEn: 'Sealed Ink',
    descriptionFr: 'Dos de carte à sceaux d’encre noire.',
    descriptionEn: 'Card back with black ink seals.',
    cost: { ryos: 1800, kageCoins: 0 },
    rarity: 'common',
  },
  night_scroll: {
    key: 'night_scroll',
    cosmeticType: 'card_back',
    nameFr: 'Parchemin Nocturne',
    nameEn: 'Night Scroll',
    descriptionFr: 'Dos de carte aux motifs de parchemin sous la lune.',
    descriptionEn: 'Card back with moonlit scroll motifs.',
    cost: { ryos: 0, kageCoins: 150 },
    rarity: 'rare',
  },
  forge_mark: {
    key: 'forge_mark',
    cosmeticType: 'card_back',
    nameFr: 'Marque du Forgeron',
    nameEn: "Smith's Mark",
    descriptionFr: 'Dos de carte frappé du sceau de la forge villageoise.',
    descriptionEn: 'Card back stamped with the village forge seal.',
    cost: { ryos: 3200, kageCoins: 60 },
    rarity: 'rare',
  },
  pathfinder: {
    key: 'pathfinder',
    cosmeticType: 'title',
    nameFr: 'Éclaireur des Sentiers',
    nameEn: 'Pathfinder',
    descriptionFr: 'Titre affiché sous le nom sensei.',
    descriptionEn: 'Title shown under the sensei name.',
    cost: { ryos: 1500, kageCoins: 0 },
    rarity: 'common',
  },
  scroll_keeper: {
    key: 'scroll_keeper',
    cosmeticType: 'title',
    nameFr: 'Gardien des Parchemins',
    nameEn: 'Scroll Keeper',
    descriptionFr: 'Titre pour collectionneurs de techniques.',
    descriptionEn: 'Title for technique collectors.',
    cost: { ryos: 0, kageCoins: 100 },
    rarity: 'rare',
  },
  dusk_strategist: {
    key: 'dusk_strategist',
    cosmeticType: 'title',
    nameFr: 'Stratège du Crépuscule',
    nameEn: 'Dusk Strategist',
    descriptionFr: 'Titre premium pour les tacticiens confirmés.',
    descriptionEn: 'Premium title for seasoned tacticians.',
    cost: { ryos: 5000, kageCoins: 200 },
    rarity: 'legendary',
  },
};

export const COSMETIC_SHOP_KEYS = Object.keys(COSMETIC_SHOP_CATALOG);

const EQUIPABLE_TYPES = new Set(['avatar_frame', 'card_back', 'title']);

const LOADOUT_COLUMN = {
  avatar_frame: 'avatar_frame_key',
  card_back: 'card_back_key',
  title: 'title_key',
};

export async function getSenseiBalances(userId, connection = null) {
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const rows = await run(
    'SELECT ryos, card_dust, card_essence, kage_coins FROM sensei WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Sensei introuvable.');
  return {
    ryos: Number(rows[0].ryos) || 0,
    dust: Number(rows[0].card_dust) || 0,
    essence: Number(rows[0].card_essence) || 0,
    kageCoins: Number(rows[0].kage_coins) || 0,
  };
}

export function serializeCoinPack(pack) {
  return {
    id: pack.id,
    nameFr: pack.nameFr,
    nameEn: pack.nameEn,
    descriptionFr: pack.descriptionFr,
    descriptionEn: pack.descriptionEn,
    coins: pack.coins,
    bonusCoins: pack.bonusCoins,
    totalCoins: pack.coins + pack.bonusCoins,
    priceEur: pack.priceEur,
    sortOrder: pack.sortOrder,
  };
}

export function listCoinPacks() {
  return Object.values(COIN_PACK_CATALOG)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(serializeCoinPack);
}

export function getCoinPack(packId) {
  const pack = COIN_PACK_CATALOG[packId];
  if (!pack) throw httpError(400, 'Pack de Kage Coins invalide.');
  return pack;
}

/**
 * Achète un pack. MVP : stub (admin / SHOP_COIN_STUB=true / pas de Stripe).
 * Stripe Checkout réel reporté (patterns eliteStripeService).
 */
export async function purchaseCoinPack(userId, packId, { method = 'stub', isAdmin = false } = {}) {
  const pack = getCoinPack(packId);
  const mode = method === 'stripe' ? 'stripe' : 'stub';
  const totalCoins = pack.coins + pack.bonusCoins;

  if (mode === 'stripe') {
    throw httpError(
      501,
      'Stripe Checkout packs Kage Coins non branché — utiliser method=stub (admin/dev, SHOP_COIN_STUB=true).',
    );
  }

  if (!isAdmin && process.env.SHOP_COIN_STUB !== 'true') {
    throw httpError(
      403,
      'Achat stub réservé admin/dev (SHOP_COIN_STUB=true ou compte admin). Stripe Checkout à venir.',
    );
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE sensei SET kage_coins = kage_coins + ? WHERE user_id = ?', [
      totalCoins,
      userId,
    ]);
    await connection.execute(
      `INSERT INTO shop_coin_pack_purchases (user_id, pack_id, coins_granted, method)
       VALUES (?, ?, ?, 'stub')`,
      [userId, pack.id, totalCoins],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const balances = await getSenseiBalances(userId);
  return {
    pack: serializeCoinPack(pack),
    coinsGranted: totalCoins,
    method: 'stub',
    note: 'Pack crédité via stub admin/dev. Intégration Stripe Checkout prévue (réutiliser eliteStripeService).',
    balances,
  };
}

export function serializeCosmetic(item, { owned = false, equipped = false } = {}) {
  return {
    key: item.key,
    cosmeticType: item.cosmeticType,
    nameFr: item.nameFr,
    nameEn: item.nameEn,
    descriptionFr: item.descriptionFr,
    descriptionEn: item.descriptionEn,
    cost: { ...item.cost },
    rarity: item.rarity,
    owned,
    equipped,
  };
}

export async function getOrCreateLoadout(userId) {
  const rows = await query('SELECT * FROM user_cosmetic_loadout WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
  if (rows[0]) {
    return {
      avatarFrameKey: rows[0].avatar_frame_key || null,
      cardBackKey: rows[0].card_back_key || null,
      titleKey: rows[0].title_key || null,
    };
  }
  await query('INSERT INTO user_cosmetic_loadout (user_id) VALUES (?)', [userId]);
  return { avatarFrameKey: null, cardBackKey: null, titleKey: null };
}

export async function listShopCosmetics(userId) {
  const owned = await getUserCosmetics(userId);
  const ownedKeys = new Set(owned.map((c) => `${c.cosmeticType}:${c.cosmeticKey}`));
  const loadout = await getOrCreateLoadout(userId);
  const equippedByType = {
    avatar_frame: loadout.avatarFrameKey,
    card_back: loadout.cardBackKey,
    title: loadout.titleKey,
  };

  const items = Object.values(COSMETIC_SHOP_CATALOG).map((item) => {
    const ownedFlag = ownedKeys.has(`${item.cosmeticType}:${item.key}`);
    const equipped = ownedFlag && equippedByType[item.cosmeticType] === item.key;
    return serializeCosmetic(item, { owned: ownedFlag, equipped });
  });

  return { items, loadout, balances: await getSenseiBalances(userId) };
}

export function getCosmeticDefinition(key) {
  const item = COSMETIC_SHOP_CATALOG[key];
  if (!item) throw httpError(400, 'Cosmétique invalide.');
  return item;
}

export async function purchaseCosmetic(userId, key) {
  const item = getCosmeticDefinition(key);
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [ownedRows] = await connection.execute(
      `SELECT id FROM user_cosmetics
       WHERE user_id = ? AND cosmetic_type = ? AND cosmetic_key = ? LIMIT 1`,
      [userId, item.cosmeticType, item.key],
    );
    if (ownedRows[0]) {
      throw httpError(409, 'Cosmétique déjà possédé.');
    }

    const [senseiRows] = await connection.execute(
      'SELECT ryos, kage_coins FROM sensei WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!senseiRows[0]) throw httpError(404, 'Sensei introuvable.');

    const ryos = Number(senseiRows[0].ryos) || 0;
    const kageCoins = Number(senseiRows[0].kage_coins) || 0;
    const costRyos = item.cost.ryos || 0;
    const costCoins = item.cost.kageCoins || 0;

    if (ryos < costRyos) throw httpError(400, 'Ryos insuffisants.');
    if (kageCoins < costCoins) throw httpError(400, 'Kage Coins insuffisants.');

    await connection.execute(
      'UPDATE sensei SET ryos = ryos - ?, kage_coins = kage_coins - ? WHERE user_id = ?',
      [costRyos, costCoins, userId],
    );
    await connection.execute(
      `INSERT INTO user_cosmetics (user_id, cosmetic_type, cosmetic_key, season_obtained)
       VALUES (?, ?, ?, NULL)`,
      [userId, item.cosmeticType, item.key],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const catalog = await listShopCosmetics(userId);
  return {
    purchased: serializeCosmetic(item, { owned: true, equipped: false }),
    costPaid: { ...item.cost },
    ...catalog,
  };
}

export async function equipCosmetic(userId, key) {
  const item = getCosmeticDefinition(key);
  if (!EQUIPABLE_TYPES.has(item.cosmeticType)) {
    throw httpError(400, 'Ce type de cosmétique ne peut pas être équipé ici.');
  }

  const owned = await query(
    `SELECT id FROM user_cosmetics
     WHERE user_id = ? AND cosmetic_type = ? AND cosmetic_key = ? LIMIT 1`,
    [userId, item.cosmeticType, item.key],
  );
  if (!owned[0]) throw httpError(403, 'Cosmétique non possédé.');

  const column = LOADOUT_COLUMN[item.cosmeticType];
  await query(
    `INSERT INTO user_cosmetic_loadout (user_id, ${column})
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
    [userId, item.key],
  );

  const catalog = await listShopCosmetics(userId);
  return { equipped: serializeCosmetic(item, { owned: true, equipped: true }), ...catalog };
}

export async function unequipCosmeticType(userId, cosmeticType) {
  if (!EQUIPABLE_TYPES.has(cosmeticType)) {
    throw httpError(400, 'Type cosmétique invalide.');
  }
  const column = LOADOUT_COLUMN[cosmeticType];
  await query(
    `INSERT INTO user_cosmetic_loadout (user_id, ${column})
     VALUES (?, NULL)
     ON DUPLICATE KEY UPDATE ${column} = NULL`,
    [userId],
  );
  return listShopCosmetics(userId);
}

/**
 * Offre Battle Pass premium exposée dans le shop.
 */
export async function getBattlePassShopOffer(userId) {
  const state = await getBattlePassState(userId);
  const balances = await getSenseiBalances(userId);

  if (!state.season) {
    return {
      available: false,
      reason: 'no_active_season',
      premiumCostKageCoins: PREMIUM_COST_KAGE_COINS,
      href: '/battle-pass',
      balances,
    };
  }

  const season = state.season;
  return {
    available: true,
    isPremium: Boolean(state.progress?.isPremium),
    premiumCostKageCoins: PREMIUM_COST_KAGE_COINS,
    season: {
      id: season.id,
      seasonNumber: season.seasonNumber,
      name: season.name,
      theme: season.theme,
    },
    href: '/battle-pass',
    unlockMethods: ['kage_coins', 'stub'],
    stripeNote:
      'Stripe Checkout Battle Pass non branché — unlock via Kage Coins ou stub admin depuis le shop / Battle Pass.',
    balances,
  };
}

/**
 * Débloque le premium depuis le shop (délègue à battlePassService.unlockPremium).
 */
export async function unlockBattlePassFromShop(userId, { method = 'kage_coins', isAdmin = false } = {}) {
  const result = await unlockPremium(userId, { method, isAdmin });
  const offer = await getBattlePassShopOffer(userId);
  return { ...result, offer };
}

export async function getShopOverview(userId) {
  const [balances, cosmetics, battlePass] = await Promise.all([
    getSenseiBalances(userId),
    listShopCosmetics(userId),
    getBattlePassShopOffer(userId),
  ]);
  return {
    balances,
    coinPacks: listCoinPacks(),
    cosmetics: cosmetics.items,
    loadout: cosmetics.loadout,
    battlePass,
  };
}

