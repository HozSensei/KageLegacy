import { query } from '../config/database.js';
import { assertSpendingAllowed } from './economyDebt.js';
import { createDojoNotification } from './dojoNotifications.js';
import { getGameClock, getClockRow } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { buildSenseiIdentities } from './senseiIdentityService.js';
import { getUserLanguage } from './narrative/viewerLocale.js';

export const MAX_ACTIVE_LISTINGS = 3;
export const SELLER_COMMISSION_PCT = 5;
export const NOBLE_SELLER_COMMISSION_PCT = 10;
export const PRICE_FLOOR_PCT = 50;
export const PRICE_CEILING_PCT = 200;
export const NINJA_RESALE_MORAL_PENALTY = 3;
export const MARKET_HISTORY_LIMIT = 20;

const MIN_NINJA_LISTING_PRICE = 1;

const LISTING_SELECT = `
  pl.*,
  idf.slug, idf.name_fr, idf.name_en, idf.category, idf.price AS catalog_price,
  n.name AS ninja_name, n.grade, n.age, n.character_trait,
  n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence,
  c.name AS clan_name, c.is_noble AS clan_is_noble,
  ss.name AS seller_name,
  sb.name AS buyer_name,
  (
    SELECT p.division_level
    FROM pool_members pm
    JOIN pools p ON p.id = pm.pool_id AND p.status = 'active'
    WHERE pm.user_id = pl.seller_user_id
    LIMIT 1
  ) AS seller_division_level
`;

const LISTING_JOINS = `
  FROM player_listings pl
  JOIN users u_seller ON u_seller.id = pl.seller_user_id
  JOIN sensei ss ON ss.user_id = pl.seller_user_id
  LEFT JOIN sensei sb ON sb.user_id = pl.buyer_user_id
  LEFT JOIN user_items ui ON ui.id = pl.user_item_id
  LEFT JOIN item_definitions idf ON idf.id = ui.item_definition_id
  LEFT JOIN ninjas n ON n.id = pl.ninja_id
  LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
`;

function assertMarketOpen(clock) {
  if (clock.hour >= 71 || clock.tacticsLocked) {
    const error = new Error('Le marché entre joueurs est fermé (H71+).');
    error.statusCode = 423;
    throw error;
  }
}

function sellerCommissionPct(listingType, isNoble) {
  if (listingType === 'ninja' && isNoble) return NOBLE_SELLER_COMMISSION_PCT;
  return SELLER_COMMISSION_PCT;
}

async function assertHumanPlayer(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  if (rows[0]?.is_bot) {
    const error = new Error('Action non disponible pour les comptes bots.');
    error.statusCode = 403;
    throw error;
  }
}

async function optionalSellerPoolId(userId) {
  const pool = await findUserPool(userId);
  return pool?.id ?? null;
}

function assetLabelFromRow(row) {
  if (row.listing_type === 'ninja') return row.ninja_name || 'Ninja';
  return row.name_fr || row.slug || 'Objet';
}

export async function isNinjaListed(ninjaId) {
  const rows = await query(
    `SELECT id FROM player_listings WHERE ninja_id = ? AND status = 'active'`,
    [ninjaId]
  );
  return rows.length > 0;
}

export async function getListedNinjaIdsForUser(userId) {
  const rows = await query(
    `SELECT ninja_id FROM player_listings
     WHERE seller_user_id = ? AND status = 'active' AND ninja_id IS NOT NULL`,
    [userId]
  );
  return new Set(rows.map((r) => r.ninja_id));
}

async function assertListingCapacity(userId) {
  const activeCount = await query(
    `SELECT COUNT(*) AS c FROM player_listings
     WHERE seller_user_id = ? AND status = 'active'`,
    [userId]
  );
  if (activeCount[0]?.c >= MAX_ACTIVE_LISTINGS) {
    const error = new Error(`Maximum ${MAX_ACTIVE_LISTINGS} annonces actives.`);
    error.statusCode = 409;
    throw error;
  }
}

function mapListing(row, identityMap = null) {
  const base = {
    id: row.id,
    listingType: row.listing_type,
    sellerUserId: row.seller_user_id,
    sellerName: row.seller_name,
    sellerIdentity: identityMap?.get(row.seller_user_id) ?? null,
    sellerDivision: row.seller_division_level ?? null,
    price: row.price,
    createdAt: row.created_at,
  };

  if (row.listing_type === 'ninja') {
    return {
      ...base,
      ninjaId: row.ninja_id,
      ninjaName: row.ninja_name,
      grade: row.grade,
      age: row.age,
      characterTrait: row.character_trait,
      clanName: row.clan_name,
      isNoble: Boolean(row.clan_is_noble),
      stats: {
        taijutsu: row.taijutsu,
        ninjutsu: row.ninjutsu,
        genjutsu: row.genjutsu,
        medecine: row.medecine,
        vitesse: row.vitesse,
        intelligence: row.intelligence,
      },
    };
  }

  return {
    ...base,
    slug: row.slug,
    category: row.category,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    catalogPrice: row.catalog_price,
    userItemId: row.user_item_id,
  };
}

function mapHistoryEntry(row, userId) {
  const asSeller = row.seller_user_id === userId;
  const commissionPct = sellerCommissionPct(row.listing_type, Boolean(row.clan_is_noble));
  const sellerProceeds = Math.floor(row.price * (1 - commissionPct / 100));
  return {
    id: row.id,
    role: asSeller ? 'seller' : 'buyer',
    listingType: row.listing_type,
    assetLabel: assetLabelFromRow(row),
    price: row.price,
    sellerProceeds: asSeller ? sellerProceeds : null,
    commission: asSeller ? row.price - sellerProceeds : null,
    counterpartyName: asSeller ? row.buyer_name : row.seller_name,
    soldAt: row.sold_at,
  };
}

export async function getMarketHistory(userId, limit = MARKET_HISTORY_LIMIT) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || MARKET_HISTORY_LIMIT));
  const rows = await query(
    `SELECT ${LISTING_SELECT}
     ${LISTING_JOINS}
     WHERE pl.status = 'sold'
       AND (pl.seller_user_id = ? OR pl.buyer_user_id = ?)
     ORDER BY pl.sold_at DESC
     LIMIT ${safeLimit}`,
    [userId, userId]
  );
  return rows.map((row) => mapHistoryEntry(row, userId));
}

export async function getPlayerMarketPayload(userId) {
  await assertHumanPlayer(userId);
  const clock = await getGameClock();

  const listings = await query(
    `SELECT ${LISTING_SELECT}
     ${LISTING_JOINS}
     WHERE pl.status = 'active' AND u_seller.is_bot = FALSE
     ORDER BY pl.price ASC, pl.id ASC`
  );

  const myListings = listings.filter((l) => l.seller_user_id === userId);
  const history = await getMarketHistory(userId);

  const locale = await getUserLanguage(userId);
  const sellerIds = [...new Set(listings.map((l) => l.seller_user_id))];
  const identityMap = await buildSenseiIdentities(sellerIds, locale);

  return {
    listings: listings
      .filter((l) => l.seller_user_id !== userId)
      .map((row) => mapListing(row, identityMap)),
    myListings: myListings.map((row) => mapListing(row, identityMap)),
    history,
    maxListings: MAX_ACTIVE_LISTINGS,
    windowOpen: clock.hour < 71,
    commissionPct: SELLER_COMMISSION_PCT,
    nobleCommissionPct: NOBLE_SELLER_COMMISSION_PCT,
    globalMarket: true,
  };
}

export async function createItemListing(userId, userItemId, price) {
  const clock = await getGameClock();
  assertMarketOpen(clock);
  await assertHumanPlayer(userId);
  await assertListingCapacity(userId);

  const poolId = await optionalSellerPoolId(userId);

  const itemRows = await query(
    `SELECT ui.*, idf.price AS catalog_price, idf.slug, idf.name_fr, idf.non_vendable,
            ne.ninja_id AS equipped_ninja_id
     FROM user_items ui
     JOIN item_definitions idf ON idf.id = ui.item_definition_id
     LEFT JOIN ninja_equipment ne ON ne.user_item_id = ui.id
     WHERE ui.id = ? AND ui.user_id = ? AND ui.consumed = FALSE`,
    [userItemId, userId]
  );
  const item = itemRows[0];
  if (!item) {
    const error = new Error('Objet introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (item.non_vendable) {
    const error = new Error('Cet objet ne peut pas être vendé sur le marché.');
    error.statusCode = 400;
    throw error;
  }
  if (item.equipped_ninja_id) {
    const error = new Error('Retirez l\'objet de l\'équipement avant de le vendre.');
    error.statusCode = 400;
    throw error;
  }

  const listed = await query(
    `SELECT id FROM player_listings WHERE user_item_id = ? AND status = 'active'`,
    [userItemId]
  );
  if (listed.length) {
    const error = new Error('Cet objet est déjà en vente.');
    error.statusCode = 409;
    throw error;
  }

  const numericPrice = Number(price);
  const floor = Math.floor((item.catalog_price * PRICE_FLOOR_PCT) / 100);
  const ceiling = Math.ceil((item.catalog_price * PRICE_CEILING_PCT) / 100);
  if (!numericPrice || numericPrice < floor || numericPrice > ceiling) {
    const error = new Error(`Prix invalide (${floor}–${ceiling} Ryos).`);
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `INSERT INTO player_listings (pool_id, seller_user_id, listing_type, user_item_id, price)
     VALUES (?, ?, 'item', ?, ?)`,
    [poolId, userId, userItemId, numericPrice]
  );

  return { listingId: result.insertId, price: numericPrice };
}

export async function createNinjaListing(userId, ninjaId, price) {
  const clock = await getGameClock();
  assertMarketOpen(clock);
  await assertHumanPlayer(userId);
  await assertListingCapacity(userId);

  const poolId = await optionalSellerPoolId(userId);
  const cycleRow = await getClockRow();
  const cycleStartAt = cycleRow?.cycle_start_at;

  const ninjaRows = await query(
    `SELECT n.*, c.is_noble AS clan_is_noble,
            ne_match.ninja_id AS match_equipped,
            ne_cycle.ninja_id AS cycle_equipped
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     LEFT JOIN ninja_equipment ne_match ON ne_match.ninja_id = n.id AND ne_match.slot = 'match'
     LEFT JOIN ninja_equipment ne_cycle ON ne_cycle.ninja_id = n.id AND ne_cycle.slot = 'cycle'
     WHERE n.id = ? AND n.user_id = ?`,
    [ninjaId, userId]
  );
  const ninja = ninjaRows[0];
  if (!ninja) {
    const error = new Error('Ninja introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (ninja.squad_position !== null) {
    const error = new Error('Seuls les ninjas du banc peuvent être mis en vente.');
    error.statusCode = 400;
    throw error;
  }
  if (ninja.chunin_exam_requested || ninja.bird_flight_requested) {
    const error = new Error('Retirez ce ninja des examens avant de le vendre.');
    error.statusCode = 409;
    throw error;
  }
  if (ninja.match_equipped || ninja.cycle_equipped) {
    const error = new Error('Retirez l\'équipement du ninja avant de le vendre.');
    error.statusCode = 400;
    throw error;
  }

  if (cycleStartAt) {
    const missionRows = await query(
      `SELECT id FROM idle_missions
       WHERE ninja_id = ? AND cycle_start_at = ? AND status IN ('active', 'completed')`,
      [ninjaId, cycleStartAt]
    );
    if (missionRows.length) {
      const error = new Error('Ce ninja est en mission ou a une récompense à collecter.');
      error.statusCode = 409;
      throw error;
    }
  }

  if (await isNinjaListed(ninjaId)) {
    const error = new Error('Ce ninja est déjà en vente.');
    error.statusCode = 409;
    throw error;
  }

  const numericPrice = Number(price);
  if (!Number.isInteger(numericPrice) || numericPrice < MIN_NINJA_LISTING_PRICE) {
    const error = new Error(`Prix invalide (minimum ${MIN_NINJA_LISTING_PRICE} Ryos).`);
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `INSERT INTO player_listings (pool_id, seller_user_id, listing_type, ninja_id, price)
     VALUES (?, ?, 'ninja', ?, ?)`,
    [poolId, userId, ninjaId, numericPrice]
  );

  return { listingId: result.insertId, price: numericPrice };
}

export async function cancelListing(userId, listingId) {
  await assertHumanPlayer(userId);
  const rows = await query(
    `SELECT * FROM player_listings WHERE id = ? AND seller_user_id = ? AND status = 'active'`,
    [listingId, userId]
  );
  if (!rows[0]) {
    const error = new Error('Annonce introuvable.');
    error.statusCode = 404;
    throw error;
  }
  await query(`UPDATE player_listings SET status = 'cancelled' WHERE id = ?`, [listingId]);
  return { listingId };
}

async function notifySellerOfSale(listing, buyerUserId, sellerProceeds, commissionPct) {
  const buyerRows = await query('SELECT name FROM sensei WHERE user_id = ?', [buyerUserId]);
  const assetRows = await query(
    `SELECT pl.listing_type, n.name AS ninja_name, idf.name_fr, idf.slug
     FROM player_listings pl
     LEFT JOIN ninjas n ON n.id = pl.ninja_id
     LEFT JOIN user_items ui ON ui.id = pl.user_item_id
     LEFT JOIN item_definitions idf ON idf.id = ui.item_definition_id
     WHERE pl.id = ?`,
    [listing.id]
  );
  const asset = assetRows[0];
  await createDojoNotification(listing.seller_user_id, 'market_sale', {
    listingId: listing.id,
    listingType: listing.listing_type,
    assetLabel: assetLabelFromRow(asset || listing),
    price: listing.price,
    sellerProceeds,
    commissionPct,
    buyerName: buyerRows[0]?.name || 'Sensei',
  });
}

export async function buyListing(userId, listingId) {
  const clock = await getGameClock();
  assertMarketOpen(clock);
  await assertHumanPlayer(userId);

  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'acheter sur le marché entre joueurs.'
  );

  const rows = await query(
    `SELECT pl.*, s_buyer.ryos AS buyer_ryos, u_seller.is_bot AS seller_is_bot,
            c.is_noble AS ninja_is_noble, n.name AS ninja_name,
            idf.name_fr AS item_name_fr, idf.slug AS item_slug
     FROM player_listings pl
     JOIN users u_seller ON u_seller.id = pl.seller_user_id
     JOIN sensei s_buyer ON s_buyer.user_id = ?
     LEFT JOIN ninjas n ON n.id = pl.ninja_id
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     LEFT JOIN user_items ui ON ui.id = pl.user_item_id
     LEFT JOIN item_definitions idf ON idf.id = ui.item_definition_id
     WHERE pl.id = ? AND pl.status = 'active'`,
    [userId, listingId]
  );
  const listing = rows[0];
  if (!listing) {
    const error = new Error('Annonce introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (listing.seller_user_id === userId) {
    const error = new Error('Vous ne pouvez pas acheter votre propre annonce.');
    error.statusCode = 400;
    throw error;
  }
  if (listing.seller_is_bot) {
    const error = new Error('Annonce indisponible.');
    error.statusCode = 400;
    throw error;
  }

  if (listing.buyer_ryos < listing.price) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const commissionPct = sellerCommissionPct(listing.listing_type, Boolean(listing.ninja_is_noble));
  const sellerProceeds = Math.floor(listing.price * (1 - commissionPct / 100));

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [listing.price, userId]);
  await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [
    sellerProceeds,
    listing.seller_user_id,
  ]);

  if (listing.listing_type === 'ninja') {
    await query(
      `UPDATE ninjas
       SET user_id = ?, squad_position = NULL,
           moral = GREATEST(1, moral - ?)
       WHERE id = ?`,
      [userId, NINJA_RESALE_MORAL_PENALTY, listing.ninja_id]
    );
  } else {
    await query('UPDATE user_items SET user_id = ? WHERE id = ?', [userId, listing.user_item_id]);
  }

  await query(
    `UPDATE player_listings
     SET status = 'sold', buyer_user_id = ?, sold_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [userId, listingId]
  );

  await notifySellerOfSale(listing, userId, sellerProceeds, commissionPct);

  return {
    listingId,
    listingType: listing.listing_type,
    pricePaid: listing.price,
    sellerProceeds,
    commission: listing.price - sellerProceeds,
    commissionPct,
  };
}
