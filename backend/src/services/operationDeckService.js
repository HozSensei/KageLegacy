import { query } from '../config/database.js';
import { isTacticsLocked } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { TECHNIQUE_SLOTS_PER_NINJA, canAssignTechniqueToNinja } from './tacticCards/tacticCardCatalog.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function loadTechniqueCardsByIds(userId, cardIds = []) {
  const ids = [...new Set(cardIds.map(Number).filter(Boolean))];
  if (!ids.length) return {};
  const placeholders = ids.map(() => '?').join(',');
  const rows = await query(
    `SELECT utc.id AS user_tactic_card_id, utc.charges_remaining,
            tcd.slug, tcd.name_fr, tcd.name_en, tcd.stat_type, tcd.pli_secondary_stat,
            tcd.pli_bonus_pct, tcd.card_type, tcd.element_affinity, tcd.rarity
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     WHERE utc.user_id = ? AND utc.id IN (${placeholders}) AND utc.charges_remaining > 0`,
    [userId, ...ids]
  );
  const byId = {};
  for (const row of rows) {
    byId[Number(row.user_tactic_card_id)] = {
      userTacticCardId: Number(row.user_tactic_card_id),
      slug: row.slug,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      statType: row.stat_type,
      pliSecondaryStat: row.pli_secondary_stat,
      pliBonusPct: Number(row.pli_bonus_pct),
      cardType: row.card_type,
      elementAffinity: row.element_affinity,
      rarity: row.rarity,
      chargesRemaining: row.charges_remaining,
    };
  }
  return byId;
}

async function resolveSeasonCycle(userId, seasonCycle = null) {
  if (seasonCycle != null) return seasonCycle;
  const pool = await findUserPool(userId);
  return pool?.current_cycle ?? 1;
}

async function loadActiveNinjas(userId) {
  return query(
    `SELECT id, name, element_affinity FROM ninjas
     WHERE user_id = ? AND squad_position IS NOT NULL
     ORDER BY squad_position`,
    [userId]
  );
}

function normalizeSlotIds(rawIds = []) {
  return rawIds
    .slice(0, TECHNIQUE_SLOTS_PER_NINJA)
    .map(Number)
    .filter(Boolean);
}

export function filterTechniqueSlotsForActiveSquad(slotsJson, activeNinjaIds) {
  const active = new Set(activeNinjaIds.map((id) => String(id)));
  const out = {};
  for (const [key, value] of Object.entries(slotsJson || {})) {
    if (!active.has(String(key))) continue;
    const ids = normalizeSlotIds(Array.isArray(value) ? value : []);
    if (ids.length) out[key] = ids;
  }
  return out;
}

async function filterValidTechniqueSlots(userId, slotsJson, ninjas) {
  const ninjaById = Object.fromEntries(ninjas.map((n) => [String(n.id), n]));
  const allIds = [];
  for (const ids of Object.values(slotsJson || {})) {
    for (const id of normalizeSlotIds(Array.isArray(ids) ? ids : [])) {
      allIds.push(id);
    }
  }
  const uniqueIds = [...new Set(allIds)];
  if (!uniqueIds.length) return {};

  const placeholders = uniqueIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT utc.id, tcd.element_affinity
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     WHERE utc.user_id = ? AND utc.id IN (${placeholders}) AND utc.charges_remaining > 0`,
    [userId, ...uniqueIds]
  );
  const validCards = Object.fromEntries(rows.map((r) => [Number(r.id), r]));

  const used = new Set();
  const out = {};
  for (const [ninjaKey, rawIds] of Object.entries(slotsJson || {})) {
    const ninja = ninjaById[String(ninjaKey)];
    if (!ninja) continue;
    const kept = [];
    for (const id of normalizeSlotIds(Array.isArray(rawIds) ? rawIds : [])) {
      const card = validCards[id];
      if (!card || used.has(id)) continue;
      if (!canAssignTechniqueToNinja({ element_affinity: card.element_affinity }, ninja)) continue;
      kept.push(id);
      used.add(id);
    }
    if (kept.length) out[ninjaKey] = kept;
  }
  return out;
}

/**
 * Recopie le deck du cycle précédent (cartes avec charges, ninjas encore actifs).
 */
export async function ensureOperationDeckFromPreviousCycle(userId, targetCycle) {
  if (!targetCycle || targetCycle <= 1) return null;

  const existing = await query(
    'SELECT user_id FROM operation_decks WHERE user_id = ? AND season_cycle = ?',
    [userId, targetCycle]
  );
  if (existing[0]) return null;

  const prevRows = await query(
    'SELECT technique_slots_json FROM operation_decks WHERE user_id = ? AND season_cycle = ?',
    [userId, targetCycle - 1]
  );
  if (!prevRows[0]) return null;

  const prevSlots = parseJson(prevRows[0].technique_slots_json, {});
  const ninjas = await loadActiveNinjas(userId);
  const activeIds = ninjas.map((n) => n.id);
  const filtered = filterTechniqueSlotsForActiveSquad(prevSlots, activeIds);
  const techniqueSlots = await filterValidTechniqueSlots(userId, filtered, ninjas);

  await query(
    `INSERT INTO operation_decks (user_id, season_cycle, techniques_json, element_card_ids_json, technique_slots_json)
     VALUES (?, ?, '{}', '[]', ?)`,
    [userId, targetCycle, JSON.stringify(techniqueSlots)]
  );

  const cardCount = Object.values(techniqueSlots).reduce((sum, ids) => sum + ids.length, 0);
  return {
    fromCycle: targetCycle - 1,
    techniqueCount: cardCount,
    ninjaCount: Object.keys(techniqueSlots).length,
  };
}

export async function carryOperationDecksForPool(poolId, newCycle) {
  if (!newCycle || newCycle <= 1) return [];
  const members = await query('SELECT user_id FROM pool_members WHERE pool_id = ?', [poolId]);
  const results = [];
  for (const row of members) {
    const carried = await ensureOperationDeckFromPreviousCycle(row.user_id, newCycle);
    if (carried) results.push({ userId: row.user_id, ...carried });
  }
  return results;
}

function countAssignedCards(slotsJson) {
  return Object.values(slotsJson || {}).reduce(
    (sum, ids) => sum + normalizeSlotIds(Array.isArray(ids) ? ids : []).length,
    0
  );
}

export async function getOperationDeck(userId, seasonCycle = null) {
  const cycle = await resolveSeasonCycle(userId, seasonCycle);
  let rows = await query(
    'SELECT * FROM operation_decks WHERE user_id = ? AND season_cycle = ?',
    [userId, cycle]
  );
  if (!rows[0] && cycle > 1) {
    await ensureOperationDeckFromPreviousCycle(userId, cycle);
    rows = await query(
      'SELECT * FROM operation_decks WHERE user_id = ? AND season_cycle = ?',
      [userId, cycle]
    );
  }

  const ninjas = await loadActiveNinjas(userId);
  const rawSlots = parseJson(rows[0]?.technique_slots_json, {});
  const techniqueSlotsByNinjaId = {};
  const allCardIds = [];

  for (const ninja of ninjas) {
    const ids = normalizeSlotIds(rawSlots[String(ninja.id)] || rawSlots[ninja.id] || []);
    techniqueSlotsByNinjaId[ninja.id] = ids;
    allCardIds.push(...ids);
  }

  const cardsById = await loadTechniqueCardsByIds(userId, allCardIds);
  const techniqueCards = allCardIds.map((id) => cardsById[id]).filter(Boolean);

  return {
    seasonCycle: cycle,
    techniqueSlotsByNinjaId,
    rawTechniqueSlotsByNinjaId: rawSlots,
    techniqueCards,
    techniqueCount: countAssignedCards(techniqueSlotsByNinjaId),
    tacticsLocked: await isTacticsLocked(),
  };
}

export async function saveOperationDeck(userId, { techniqueSlotsByNinjaId }) {
  if (await isTacticsLocked()) {
    const error = new Error('Deck verrouillé pour ce cycle (H71+).');
    error.status = 403;
    throw error;
  }

  const ninjas = await loadActiveNinjas(userId);
  const ninjaById = Object.fromEntries(ninjas.map((n) => [String(n.id), n]));
  const input = techniqueSlotsByNinjaId || {};
  const used = new Set();
  const sanitized = {};

  for (const [ninjaKey, rawIds] of Object.entries(input)) {
    const ninja = ninjaById[String(ninjaKey)];
    if (!ninja) continue;
    const ids = normalizeSlotIds(Array.isArray(rawIds) ? rawIds : []);
    if (!ids.length) continue;

    const placeholders = ids.map(() => '?').join(',');
    const rows = await query(
      `SELECT utc.id, tcd.element_affinity
       FROM user_tactic_cards utc
       JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
       WHERE utc.user_id = ? AND utc.id IN (${placeholders}) AND utc.charges_remaining > 0`,
      [userId, ...ids]
    );
    if (rows.length !== ids.length) {
      const error = new Error('Carte technique invalide ou épuisée.');
      error.status = 400;
      throw error;
    }

    const kept = [];
    for (const id of ids) {
      if (used.has(id)) {
        const error = new Error('Une carte ne peut être assignée qu\'à un seul ninja.');
        error.status = 400;
        throw error;
      }
      const row = rows.find((r) => Number(r.id) === id);
      if (!canAssignTechniqueToNinja({ element_affinity: row.element_affinity }, ninja)) {
        const error = new Error(`La carte n'est pas compatible avec l'élément de ${ninja.name}.`);
        error.status = 400;
        throw error;
      }
      kept.push(id);
      used.add(id);
    }
    sanitized[String(ninja.id)] = kept;
  }

  const cycle = await resolveSeasonCycle(userId);
  await query(
    `INSERT INTO operation_decks (user_id, season_cycle, techniques_json, element_card_ids_json, technique_slots_json)
     VALUES (?, ?, '{}', '[]', ?)
     ON DUPLICATE KEY UPDATE technique_slots_json = VALUES(technique_slots_json)`,
    [userId, cycle, JSON.stringify(sanitized)]
  );

  return getOperationDeck(userId, cycle);
}

export function deckConfigForCombat(deck) {
  const techniqueSlotsByNinjaId = deck.techniqueSlotsByNinjaId || {};
  const allIds = Object.values(techniqueSlotsByNinjaId).flat();
  const techniqueCardsById = Object.fromEntries(
    (deck.techniqueCards || []).map((card) => [card.userTacticCardId, card])
  );

  return {
    techniqueSlotsByNinjaId,
    techniqueCardsById,
  };
}
