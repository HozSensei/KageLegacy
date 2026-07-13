import { query } from '../../config/database.js';
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
  return {
    userTacticCardId: result.insertId,
    slug,
    chargesRemaining: safeCharges,
    nameFr: def.name_fr,
    nameEn: def.name_en,
  };
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
    'tai-lame-chakras',
    'nin-afflux-chakra',
    'gen-mirage-simple',
    'med-scalpel-chakra',
    'tai-coup-poing-leon',
    'nin-katon-boule',
    'nin-raiton-eclair',
    'nin-futon-lame',
    'gen-brume-mentale',
    'med-paume-mystique',
  ],
  rare: [
    'tai-lame-futon',
    'nin-clone-ombre',
    'gen-dango-cuisiniere',
    'nin-doton-seisme',
    'tai-frappe-ombre',
    'tai-lame-suiton',
  ],
  legendary: ['nin-suiton-dragon', 'nin-chidori'],
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
    pliSecondaryStat: row.pli_secondary_stat,
    pliBonusPct: row.pli_bonus_pct != null ? Number(row.pli_bonus_pct) : null,
    elementAffinity: row.element_affinity,
    triggerKind: row.trigger_kind,
    triggerParams: parseJsonField(row.trigger_params),
    targetKind: row.target_kind,
    targetParams: parseJsonField(row.target_params),
    effectKind: row.effect_kind,
    effectParams: parseJsonField(row.effect_params),
    catalogPrice: row.catalog_price,
    narrativeKey: row.narrative_key,
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
       tcd.pli_secondary_stat,
       tcd.pli_bonus_pct,
       tcd.element_affinity,
       tcd.trigger_kind,
       tcd.trigger_params,
       tcd.target_kind,
       tcd.target_params,
       tcd.effect_kind,
       tcd.effect_params,
       tcd.catalog_price,
       tcd.narrative_key,
       pl.id AS listing_id
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     LEFT JOIN player_listings pl ON pl.user_tactic_card_id = utc.id AND pl.status = 'active'
     WHERE utc.user_id = ? AND utc.charges_remaining > 0
     ORDER BY utc.acquired_at DESC, utc.id DESC`,
    [userId]
  );
  return dedupeUserCards(rows.map(mapUserCard).filter(Boolean));
}

export async function consumeTacticCardCharge(userTacticCardId) {
  const rows = await query('SELECT charges_remaining FROM user_tactic_cards WHERE id = ?', [
    userTacticCardId,
  ]);
  const current = Number(rows[0]?.charges_remaining ?? 0);
  if (current <= 0) return { deleted: true };

  const next = current - 1;
  if (next <= 0) {
    await query('DELETE FROM user_tactic_cards WHERE id = ?', [userTacticCardId]);
    return { deleted: true, chargesRemaining: 0 };
  }

  await query('UPDATE user_tactic_cards SET charges_remaining = ? WHERE id = ?', [
    next,
    userTacticCardId,
  ]);
  return { deleted: false, chargesRemaining: next };
}
