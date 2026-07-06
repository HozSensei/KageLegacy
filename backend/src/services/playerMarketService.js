import { query } from '../config/database.js';
import { assertSpendingAllowed, getDebtStatus } from './economyDebt.js';
import { getGameClock, getClockRow } from './gameClock.js';
import { findUserPool } from './poolService.js';

export const MAX_ACTIVE_LISTINGS = 3;
export const SELLER_COMMISSION_PCT = 5;
export const NOBLE_SELLER_COMMISSION_PCT = 10;
export const PRICE_FLOOR_PCT = 50;
export const PRICE_CEILING_PCT = 200;
export const NINJA_RESALE_MORAL_PENALTY = 3;

function assertMarketOpen(clock) {
  if (clock.hour >= 71 || clock.tacticsLocked) {
    const error = new Error('Le marché entre joueurs est fermé (H71+).');
    error.statusCode = 423;
    throw error;
  }
}

const MIN_NINJA_LISTING_PRICE = 1;

function sellerCommissionPct(listingType, isNoble) {
  if (listingType === 'ninja' && isNoble) return NOBLE_SELLER_COMMISSION_PCT;
  return SELLER_COMMISSION_PCT;
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

export async function getPlayerMarketPayload(userId) {
  const pool = await findUserPool(userId);
  if (!pool) {
    return {
      listings: [],
      myListings: [],
      maxListings: MAX_ACTIVE_LISTINGS,
      windowOpen: true,
      commissionPct: SELLER_COMMISSION_PCT,
      nobleCommissionPct: NOBLE_SELLER_COMMISSION_PCT,
    };
  }

  const clock = await getGameClock();
  const listings = await query(
    `SELECT pl.*,
            idf.slug, idf.name_fr, idf.name_en, idf.category, idf.price AS catalog_price,
            n.name AS ninja_name, n.grade, n.age, n.character_trait,
            n.taijutsu, n.ninjutsu, n.genjutsu, n.medecine, n.vitesse, n.intelligence,
            c.name AS clan_name, c.is_noble AS clan_is_noble,
            ss.name AS seller_name
     FROM player_listings pl
     JOIN sensei ss ON ss.user_id = pl.seller_user_id
     LEFT JOIN user_items ui ON ui.id = pl.user_item_id
     LEFT JOIN item_definitions idf ON idf.id = ui.item_definition_id
     LEFT JOIN ninjas n ON n.id = pl.ninja_id
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE pl.pool_id = ? AND pl.status = 'active'
     ORDER BY pl.price ASC, pl.id ASC`,
    [pool.id]
  );

  const myListings = listings.filter((l) => l.seller_user_id === userId);

  return {
    listings: listings
      .filter((l) => l.seller_user_id !== userId)
      .map(mapListing),
    myListings: myListings.map(mapListing),
    maxListings: MAX_ACTIVE_LISTINGS,
    windowOpen: clock.hour < 71,
    commissionPct: SELLER_COMMISSION_PCT,
    nobleCommissionPct: NOBLE_SELLER_COMMISSION_PCT,
  };
}

function mapListing(row) {
  if (row.listing_type === 'ninja') {
    return {
      id: row.id,
      listingType: 'ninja',
      sellerUserId: row.seller_user_id,
      sellerName: row.seller_name,
      price: row.price,
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
      createdAt: row.created_at,
    };
  }

  return {
    id: row.id,
    listingType: 'item',
    sellerUserId: row.seller_user_id,
    sellerName: row.seller_name,
    price: row.price,
    slug: row.slug,
    category: row.category,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    catalogPrice: row.catalog_price,
    userItemId: row.user_item_id,
    createdAt: row.created_at,
  };
}

export async function createItemListing(userId, userItemId, price) {
  const clock = await getGameClock();
  assertMarketOpen(clock);

  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 400;
    throw error;
  }

  await assertListingCapacity(userId);

  const itemRows = await query(
    `SELECT ui.*, idf.price AS catalog_price, idf.slug,
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
    [pool.id, userId, userItemId, numericPrice]
  );

  return { listingId: result.insertId, price: numericPrice };
}

export async function createNinjaListing(userId, ninjaId, price) {
  const clock = await getGameClock();
  assertMarketOpen(clock);

  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 400;
    throw error;
  }

  await assertListingCapacity(userId);

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
    [pool.id, userId, ninjaId, numericPrice]
  );

  return { listingId: result.insertId, price: numericPrice };
}

export async function cancelListing(userId, listingId) {
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

export async function buyListing(userId, listingId) {
  const clock = await getGameClock();
  assertMarketOpen(clock);

  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant d\'acheter sur le marché entre joueurs.'
  );

  const rows = await query(
    `SELECT pl.*, s_buyer.ryos AS buyer_ryos,
            c.is_noble AS ninja_is_noble
     FROM player_listings pl
     JOIN sensei s_buyer ON s_buyer.user_id = ?
     LEFT JOIN ninjas n ON n.id = pl.ninja_id
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
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

  const pool = await findUserPool(userId);
  if (!pool || pool.id !== listing.pool_id) {
    const error = new Error('Annonce hors de votre ligue.');
    error.statusCode = 403;
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

  return {
    listingId,
    listingType: listing.listing_type,
    pricePaid: listing.price,
    sellerProceeds,
    commission: listing.price - sellerProceeds,
    commissionPct,
  };
}
