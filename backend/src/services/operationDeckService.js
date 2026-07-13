import { query } from '../config/database.js';
import { isTacticsLocked } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { DECK_ELEMENTS_COUNT } from './combat/pli/constants.js';
import { defaultTechniquesForFighter } from './combat/pli/deckBuilder.js';
import { applyFormeToStats } from './combat/forme.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function loadUserElementCards(userId, cardIds = []) {
  if (!cardIds.length) return [];
  const placeholders = cardIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT utc.id AS user_tactic_card_id, utc.charges_remaining,
            tcd.slug, tcd.name_fr, tcd.name_en, tcd.stat_type, tcd.card_type,
            tcd.element_affinity, tcd.effect_kind, tcd.effect_params
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     WHERE utc.user_id = ? AND utc.id IN (${placeholders}) AND utc.charges_remaining > 0`,
    [userId, ...cardIds]
  );
  const byId = Object.fromEntries(rows.map((r) => [Number(r.user_tactic_card_id), r]));
  return cardIds.map((id) => byId[Number(id)]).filter(Boolean);
}

async function defaultElementCardIds(userId) {
  const rows = await query(
    `SELECT utc.id
     FROM user_tactic_cards utc
     WHERE utc.user_id = ? AND utc.charges_remaining > 0
     ORDER BY utc.id ASC
     LIMIT ${DECK_ELEMENTS_COUNT}`,
    [userId]
  );
  return rows.map((r) => Number(r.id));
}

async function resolveSeasonCycle(userId, seasonCycle = null) {
  if (seasonCycle != null) return seasonCycle;
  const pool = await findUserPool(userId);
  return pool?.current_cycle ?? 1;
}

export async function getOperationDeck(userId, seasonCycle = null) {
  const cycle = await resolveSeasonCycle(userId, seasonCycle);
  const rows = await query(
    'SELECT * FROM operation_decks WHERE user_id = ? AND season_cycle = ?',
    [userId, cycle]
  );
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );

  const techniques = parseJson(rows[0]?.techniques_json, {});
  let elementCardIds = parseJson(rows[0]?.element_card_ids_json, []);

  if (!elementCardIds.length) {
    elementCardIds = await defaultElementCardIds(userId);
  }

  const techniquesByNinjaId = {};
  for (const ninja of ninjas) {
    const stats = applyFormeToStats(ninja);
    const defaults = defaultTechniquesForFighter({ stats });
    const saved = techniques[String(ninja.id)] || techniques[ninja.id] || {};
    techniquesByNinjaId[ninja.id] = {
      primary: saved.primary || defaults.primary,
      secondary: saved.secondary || defaults.secondary,
    };
  }

  const elementCards = await loadUserElementCards(userId, elementCardIds.slice(0, DECK_ELEMENTS_COUNT));

  return {
    seasonCycle: cycle,
    techniquesByNinjaId,
    elementCardIds: elementCardIds.slice(0, DECK_ELEMENTS_COUNT),
    elementCards: elementCards.map((row) => ({
      userTacticCardId: Number(row.user_tactic_card_id),
      slug: row.slug,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      statType: row.stat_type,
      cardType: row.card_type,
      chargesRemaining: row.charges_remaining,
    })),
    tacticsLocked: await isTacticsLocked(),
  };
}

export async function saveOperationDeck(userId, { techniquesByNinjaId, elementCardIds }) {
  if (await isTacticsLocked()) {
    const error = new Error('Deck verrouillé pour ce cycle (H71+).');
    error.status = 403;
    throw error;
  }

  const ids = (elementCardIds || []).slice(0, DECK_ELEMENTS_COUNT).map(Number);
  if (ids.length > DECK_ELEMENTS_COUNT) {
    const error = new Error(`Maximum ${DECK_ELEMENTS_COUNT} éléments de deck.`);
    error.status = 400;
    throw error;
  }

  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const owned = await query(
      `SELECT id FROM user_tactic_cards WHERE user_id = ? AND id IN (${placeholders}) AND charges_remaining > 0`,
      [userId, ...ids]
    );
    if (owned.length !== ids.length) {
      const error = new Error('Élément de deck invalide ou épuisé.');
      error.status = 400;
      throw error;
    }
  }

  const techniques = techniquesByNinjaId || {};
  const cycle = await resolveSeasonCycle(userId);
  await query(
    `INSERT INTO operation_decks (user_id, season_cycle, techniques_json, element_card_ids_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       techniques_json = VALUES(techniques_json),
       element_card_ids_json = VALUES(element_card_ids_json)`,
    [userId, cycle, JSON.stringify(techniques), JSON.stringify(ids)]
  );

  return getOperationDeck(userId, cycle);
}

export function deckConfigForCombat(deck) {
  return {
    techniquesByNinjaId: deck.techniquesByNinjaId,
    elementCards: deck.elementCards,
  };
}
