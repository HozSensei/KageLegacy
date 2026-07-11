import { query } from '../../config/database.js';
import { getClockRow } from '../gameClock.js';
import { STARTER_CARD_SLUGS, TACTIC_CARD_MAX_CHARGES } from './tacticCardCatalog.js';

export async function findCardDefinitionBySlug(slug) {
  const rows = await query('SELECT * FROM tactic_card_definitions WHERE slug = ?', [slug]);
  return rows[0] || null;
}

export async function grantTacticCard(userId, slug, charges = TACTIC_CARD_MAX_CHARGES) {
  const def = await findCardDefinitionBySlug(slug);
  if (!def) return null;
  const safeCharges = Math.min(TACTIC_CARD_MAX_CHARGES, Math.max(1, Number(charges) || TACTIC_CARD_MAX_CHARGES));
  const result = await query(
    `INSERT INTO user_tactic_cards (user_id, tactic_card_definition_id, charges_remaining)
     VALUES (?, ?, ?)`,
    [userId, def.id, safeCharges]
  );
  return { userTacticCardId: result.insertId, slug, chargesRemaining: safeCharges };
}

export async function grantStarterTacticCards(userId) {
  const granted = [];
  for (const slug of STARTER_CARD_SLUGS) {
    const row = await grantTacticCard(userId, slug);
    if (row) granted.push(row);
  }
  return granted;
}

const LOOT_POOL_BY_RARITY = {
  common: [
    'tai-parade-ecole',
    'med-pansement-rapide',
    'nin-eclair-discret',
    'katon-mur-braises',
    'raiton-surcharge',
    'gen-illusion-mineure',
    'futon-lame-retour',
  ],
  rare: [
    'gen-kage-bunshin',
    'suiton-cage-aqueuse',
    'med-soin-zone',
    'doton-racines',
  ],
  legendary: ['legende-suiton-dragon'],
};

export async function grantRandomTacticCard(userId, { rarity = 'common' } = {}) {
  const pool = LOOT_POOL_BY_RARITY[rarity] || LOOT_POOL_BY_RARITY.common;
  const slug = pool[Math.floor(Math.random() * pool.length)];
  return grantTacticCard(userId, slug);
}

export async function ensureStarterTacticCards(userId) {
  const rows = await query(
    'SELECT COUNT(*) AS count FROM user_tactic_cards WHERE user_id = ?',
    [userId]
  );
  if (Number(rows[0]?.count) > 0) return false;
  await grantStarterTacticCards(userId);
  return true;
}

function parseJsonField(value) {
  if (!value) return {};
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function mapUserCard(row) {
  if (!row) return null;
  const userTacticCardId = Number(row.user_tactic_card_id);
  return {
    id: userTacticCardId,
    userTacticCardId,
    definitionId: Number(row.tactic_card_definition_id),
    userId: row.user_id,
    chargesRemaining: row.charges_remaining,
    acquiredAt: row.acquired_at,
    slug: row.slug,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    rarity: row.rarity,
    cardType: row.card_type,
    statType: row.stat_type,
    elementAffinity: row.element_affinity,
    triggerKind: row.trigger_kind,
    triggerParams: parseJsonField(row.trigger_params),
    targetKind: row.target_kind,
    targetParams: parseJsonField(row.target_params),
    effectKind: row.effect_kind,
    effectParams: parseJsonField(row.effect_params),
    catalogPrice: row.catalog_price,
    narrativeKey: row.narrative_key,
    equippedNinjaId: row.equipped_ninja_id ?? null,
    equippedNinjaName: row.equipped_ninja_name ?? null,
    listingId: row.listing_id ?? null,
    isListed: Boolean(row.listing_id),
  };
}

function dedupeUserCards(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    if (!card?.userTacticCardId || seen.has(card.userTacticCardId)) return false;
    seen.add(card.userTacticCardId);
    return true;
  });
}

export async function getTacticCardsForUser(userId) {
  const rows = await query(
    `SELECT
       utc.id AS user_tactic_card_id,
       utc.user_id,
       utc.tactic_card_definition_id,
       utc.charges_remaining,
       utc.acquired_at,
       tcd.slug,
       tcd.name_fr,
       tcd.name_en,
       tcd.description_fr,
       tcd.description_en,
       tcd.rarity,
       tcd.card_type,
       tcd.stat_type,
       tcd.element_affinity,
       tcd.trigger_kind,
       tcd.trigger_params,
       tcd.target_kind,
       tcd.target_params,
       tcd.effect_kind,
       tcd.effect_params,
       tcd.catalog_price,
       tcd.narrative_key,
       ntc.ninja_id AS equipped_ninja_id,
       n.name AS equipped_ninja_name,
       pl.id AS listing_id
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     LEFT JOIN ninja_tactic_cards ntc ON ntc.user_tactic_card_id = utc.id
     LEFT JOIN ninjas n ON n.id = ntc.ninja_id
     LEFT JOIN player_listings pl ON pl.user_tactic_card_id = utc.id AND pl.status = 'active'
     WHERE utc.user_id = ? AND utc.charges_remaining > 0
     ORDER BY utc.acquired_at DESC, utc.id DESC`,
    [userId]
  );
  return dedupeUserCards(rows.map(mapUserCard).filter(Boolean));
}

export async function getTacticCardsForNinjas(userId) {
  return query(
    `SELECT ntc.ninja_id, utc.id AS user_tactic_card_id, utc.charges_remaining,
            tcd.slug, tcd.name_fr, tcd.name_en, tcd.rarity, tcd.card_type, tcd.stat_type,
            tcd.element_affinity, tcd.trigger_kind, tcd.trigger_params,
            tcd.target_kind, tcd.target_params, tcd.effect_kind, tcd.effect_params,
            tcd.narrative_key, tcd.catalog_price
     FROM ninja_tactic_cards ntc
     JOIN user_tactic_cards utc ON utc.id = ntc.user_tactic_card_id
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     JOIN ninjas n ON n.id = ntc.ninja_id
     WHERE n.user_id = ? AND utc.charges_remaining > 0`,
    [userId]
  );
}

function assertElementCompatible(ninja, cardDef) {
  if (!cardDef.element_affinity) return;
  if (ninja.element_affinity !== cardDef.element_affinity) {
    const error = new Error(
      `Affinité incompatible : ${cardDef.element_affinity} requis, ninja ${ninja.element_affinity}.`
    );
    error.statusCode = 400;
    throw error;
  }
}

async function assertNinjaAvailableForEquip(userId, ninjaId) {
  const ninjaRows = await query('SELECT * FROM ninjas WHERE id = ? AND user_id = ?', [ninjaId, userId]);
  const ninja = ninjaRows[0];
  if (!ninja) {
    const error = new Error('Ninja introuvable.');
    error.statusCode = 404;
    throw error;
  }

  const cycleRow = await getClockRow();
  if (cycleRow?.cycle_start_at) {
    const missionRows = await query(
      `SELECT id FROM idle_missions
       WHERE ninja_id = ? AND cycle_start_at = ? AND status = 'active'`,
      [ninjaId, cycleRow.cycle_start_at]
    );
    if (missionRows.length) {
      const error = new Error('Ce ninja est en mission et ne peut pas être équipé.');
      error.statusCode = 423;
      throw error;
    }
  }
  return ninja;
}

export async function equipTacticCard(userId, ninjaId, userTacticCardId) {
  const ninja = await assertNinjaAvailableForEquip(userId, ninjaId);

  const cardRows = await query(
    `SELECT utc.*, tcd.element_affinity
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     WHERE utc.id = ? AND utc.user_id = ? AND utc.charges_remaining > 0`,
    [userTacticCardId, userId]
  );
  const card = cardRows[0];
  if (!card) {
    const error = new Error('Carte introuvable ou épuisée.');
    error.statusCode = 404;
    throw error;
  }

  const listed = await query(
    `SELECT id FROM player_listings WHERE user_tactic_card_id = ? AND status = 'active'`,
    [userTacticCardId]
  );
  if (listed.length) {
    const error = new Error('Retirez la carte de la vente avant de l\'équiper.');
    error.statusCode = 400;
    throw error;
  }

  assertElementCompatible(ninja, card);

  await query('DELETE FROM ninja_tactic_cards WHERE ninja_id = ?', [ninjaId]);
  await query('DELETE FROM ninja_tactic_cards WHERE user_tactic_card_id = ?', [userTacticCardId]);
  await query(
    'INSERT INTO ninja_tactic_cards (ninja_id, user_tactic_card_id) VALUES (?, ?)',
    [ninjaId, userTacticCardId]
  );

  return { ninjaId, userTacticCardId };
}

export async function unequipTacticCard(userId, ninjaId) {
  const rows = await query(
    `SELECT ntc.user_tactic_card_id
     FROM ninja_tactic_cards ntc
     JOIN ninjas n ON n.id = ntc.ninja_id
     WHERE ntc.ninja_id = ? AND n.user_id = ?`,
    [ninjaId, userId]
  );
  if (!rows.length) {
    const error = new Error('Aucune carte équipée sur ce ninja.');
    error.statusCode = 404;
    throw error;
  }
  await query('DELETE FROM ninja_tactic_cards WHERE ninja_id = ?', [ninjaId]);
  return { ninjaId };
}

export async function consumeTacticCardCharge(userTacticCardId) {
  const rows = await query('SELECT charges_remaining FROM user_tactic_cards WHERE id = ?', [
    userTacticCardId,
  ]);
  const current = Number(rows[0]?.charges_remaining ?? 0);
  if (current <= 0) return { deleted: true };

  const next = current - 1;
  if (next <= 0) {
    await query('DELETE FROM ninja_tactic_cards WHERE user_tactic_card_id = ?', [userTacticCardId]);
    await query('DELETE FROM user_tactic_cards WHERE id = ?', [userTacticCardId]);
    return { deleted: true, chargesRemaining: 0 };
  }

  await query('UPDATE user_tactic_cards SET charges_remaining = ? WHERE id = ?', [
    next,
    userTacticCardId,
  ]);
  return { deleted: false, chargesRemaining: next };
}

export async function isTacticCardListed(userTacticCardId) {
  const rows = await query(
    `SELECT id FROM player_listings WHERE user_tactic_card_id = ? AND status = 'active'`,
    [userTacticCardId]
  );
  return rows.length > 0;
}
