/**
 * Appartenance faction du player_character (V2).
 */
import { query } from '../config/database.js';
import {
  FACTION_IDS,
  assignFactionFromSeed,
  getFaction,
  isValidFactionId,
  listFactions,
} from './factionCatalog.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export { FACTION_IDS, getFaction, isValidFactionId, listFactions, assignFactionFromSeed };

export async function getPlayerFaction(userId) {
  const rows = await query(
    `SELECT faction_id, faction_retake_used
     FROM player_character
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  const factionId = rows[0].faction_id || null;
  return {
    factionId,
    faction: factionId ? getFaction(factionId) : null,
    retakeUsed: Boolean(rows[0].faction_retake_used),
    canRetake: !rows[0].faction_retake_used && Boolean(factionId),
  };
}

/**
 * Première affiliation (création ou personnages existants sans faction).
 */
export async function setFaction(userId, factionId) {
  if (!isValidFactionId(factionId)) {
    throw httpError(400, 'Faction invalide.');
  }

  const rows = await query(
    `SELECT id, faction_id, faction_retake_used
     FROM player_character
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Personnage introuvable.');

  if (rows[0].faction_id) {
    throw httpError(409, 'Faction déjà choisie. Utilisez le retake si disponible.');
  }

  await query(`UPDATE player_character SET faction_id = ? WHERE user_id = ?`, [
    factionId,
    userId,
  ]);

  return getPlayerFaction(userId);
}

/**
 * Un seul changement de faction (retake early), sans bonus combat.
 */
export async function retakeFaction(userId, factionId) {
  if (!isValidFactionId(factionId)) {
    throw httpError(400, 'Faction invalide.');
  }

  const rows = await query(
    `SELECT id, faction_id, faction_retake_used
     FROM player_character
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Personnage introuvable.');
  if (!rows[0].faction_id) {
    throw httpError(400, 'Aucune faction actuelle — choisissez-en une d’abord.');
  }
  if (rows[0].faction_retake_used) {
    throw httpError(403, 'Changement de faction déjà utilisé.');
  }
  if (rows[0].faction_id === factionId) {
    throw httpError(400, 'Vous êtes déjà dans cette faction.');
  }

  await query(
    `UPDATE player_character
     SET faction_id = ?, faction_retake_used = 1
     WHERE user_id = ?`,
    [factionId, userId],
  );

  return getPlayerFaction(userId);
}
