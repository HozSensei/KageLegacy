/**
 * Talent Tree Service — Kage Legacy V2 Phase 3
 *
 * Arbre Path of Exile-like : 1 point / niveau, stats = talents + cartes.
 * Respec hybride : 1 gratuit / 10 niveaux, sinon 2000 Ryos.
 */
import { query, getConnection } from '../config/database.js';
import { mergeStatBonuses } from './playerCharacterService.js';

/** Ryos pour un respec payant. */
export const RESPEC_COST_RYOS = 2000;

/** Un respec gratuit tous les N niveaux. */
export const FREE_RESPEC_EVERY_LEVELS = 10;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseJsonSafe(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeNode(row) {
  if (!row) return null;
  return {
    id: row.id,
    nodeId: row.node_id,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    descriptionFr: row.description_fr || null,
    descriptionEn: row.description_en || null,
    type: row.type,
    positionX: row.position_x,
    positionY: row.position_y,
    branch: row.branch,
    statBonus: parseJsonSafe(row.stat_bonus_json, null),
    effectCode: row.effect_code || null,
    requires: parseJsonSafe(row.requires_nodes_json, []) || [],
    icon: row.icon || null,
    color: row.color || null,
  };
}

function buildRespecQuote(level, respecRows) {
  const freeAllowed = Math.floor(Number(level) / FREE_RESPEC_EVERY_LEVELS);
  const freeUsed = respecRows.filter(row => Number(row.cost_ryos) === 0).length;
  const freeRemaining = Math.max(0, freeAllowed - freeUsed);
  const isFree = freeRemaining > 0;
  return {
    free: isFree,
    freeRemaining,
    freeAllowed,
    costRyos: isFree ? 0 : RESPEC_COST_RYOS,
    costDust: 0,
    everyLevels: FREE_RESPEC_EVERY_LEVELS,
  };
}

/**
 * Catalogue complet de l'arbre (statique).
 */
export async function getTalentTree() {
  const rows = await query(
    `SELECT *
     FROM talent_tree_nodes
     ORDER BY branch, position_y, position_x, id`,
  );
  return rows.map(serializeNode);
}

/**
 * Talents débloqués + points disponibles + quote respec.
 */
export async function getUserTalents(userId) {
  const [characterRows, unlockedRows, respecRows] = await Promise.all([
    query(
      `SELECT character_level AS level,
              character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL
       LIMIT 1`,
      [userId],
    ),
    query(
      `SELECT ut.node_id, ut.unlocked_at, n.type, n.effect_code, n.stat_bonus_json,
              n.name_fr, n.name_en, n.branch, n.icon, n.color
       FROM user_talents ut
       JOIN talent_tree_nodes n ON n.node_id = ut.node_id
       WHERE ut.user_id = ?
       ORDER BY ut.unlocked_at ASC`,
      [userId],
    ),
    query(
      `SELECT id, respec_at, cost_ryos, cost_dust, points_refunded
       FROM user_talent_respec_history
       WHERE user_id = ?
       ORDER BY respec_at DESC`,
      [userId],
    ),
  ]);

  const character = characterRows[0];
  if (!character) throw httpError(404, 'Personnage introuvable.');

  const unlockedNodeIds = unlockedRows.map(row => row.node_id);
  const effects = unlockedRows
    .filter(row => row.effect_code)
    .map(row => ({
      nodeId: row.node_id,
      effectCode: row.effect_code,
      type: row.type,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      branch: row.branch,
      icon: row.icon,
      color: row.color,
    }));

  return {
    level: character.level,
    talentPointsAvailable: character.talent_points_available,
    unlockedNodeIds,
    unlockedCount: unlockedNodeIds.length,
    effects,
    respec: buildRespecQuote(character.level, respecRows),
    history: respecRows.map(row => ({
      id: row.id,
      respecAt: row.respec_at,
      costRyos: row.cost_ryos,
      costDust: row.cost_dust,
      pointsRefunded: row.points_refunded,
    })),
  };
}

async function fetchNodeById(nodeId) {
  const rows = await query('SELECT * FROM talent_tree_nodes WHERE node_id = ? LIMIT 1', [nodeId]);
  return rows[0] ? serializeNode(rows[0]) : null;
}

/**
 * Vérifie si un nœud peut être débloqué (points, prérequis, pas déjà unlock).
 */
export async function canUnlock(userId, nodeId) {
  const node = await fetchNodeById(nodeId);
  if (!node) {
    return { ok: false, reason: 'Nœud introuvable.', code: 'NOT_FOUND' };
  }

  const user = await getUserTalents(userId);
  if (user.unlockedNodeIds.includes(nodeId)) {
    return { ok: false, reason: 'Talent déjà débloqué.', code: 'ALREADY_UNLOCKED', node };
  }

  if (user.talentPointsAvailable < 1) {
    return { ok: false, reason: 'Aucun point de talent disponible.', code: 'NO_POINTS', node };
  }

  const missing = (node.requires || []).filter(req => !user.unlockedNodeIds.includes(req));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Prérequis manquants : ${missing.join(', ')}`,
      code: 'MISSING_PREREQS',
      missing,
      node,
    };
  }

  return { ok: true, reason: null, code: 'OK', node, user };
}

/**
 * Débloque un talent (consomme 1 point).
 */
export async function unlockTalent(userId, nodeId) {
  const check = await canUnlock(userId, nodeId);
  if (!check.ok) {
    const status = check.code === 'NOT_FOUND' ? 404 : 400;
    throw httpError(status, check.reason);
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [charRows] = await connection.execute(
      `SELECT id, character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const character = charRows[0];
    if (!character) throw httpError(404, 'Personnage introuvable.');
    if (character.talent_points_available < 1) {
      throw httpError(400, 'Aucun point de talent disponible.');
    }

    const [existing] = await connection.execute(
      'SELECT id FROM user_talents WHERE user_id = ? AND node_id = ? LIMIT 1',
      [userId, nodeId],
    );
    if (existing[0]) throw httpError(400, 'Talent déjà débloqué.');

    await connection.execute('INSERT INTO user_talents (user_id, node_id) VALUES (?, ?)', [
      userId,
      nodeId,
    ]);
    await connection.execute(
      `UPDATE player_profiles
       SET character_talent_points_available = character_talent_points_available - 1,
           character_updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND character_name IS NOT NULL`,
      [userId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [talents, bonuses] = await Promise.all([
    getUserTalents(userId),
    computeTalentBonuses(userId),
  ]);

  try {
    const { onAchievementAction } = await import('./achievementService.js');
    await onAchievementAction(
      userId,
      'talent_spent',
      Number(talents?.unlockedNodeIds?.length) || 0,
    );
  } catch {
    /* exploits optionnels */
  }

  return {
    unlocked: nodeId,
    node: check.node,
    talents,
    bonuses,
  };
}

/**
 * Somme des bonus de stats + effets actifs (notables / keystones).
 * Point d'entrée pour getComputedStats.
 */
export async function computeTalentBonuses(userId) {
  const rows = await query(
    `SELECT n.node_id, n.type, n.stat_bonus_json, n.effect_code,
            n.name_fr, n.name_en, n.branch, n.icon, n.color
     FROM user_talents ut
     JOIN talent_tree_nodes n ON n.node_id = ut.node_id
     WHERE ut.user_id = ?`,
    [userId],
  );

  const stats = mergeStatBonuses(
    ...rows.map(row => parseJsonSafe(row.stat_bonus_json, null)).filter(Boolean),
  );

  const effects = rows
    .filter(row => row.effect_code)
    .map(row => ({
      nodeId: row.node_id,
      effectCode: row.effect_code,
      type: row.type,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      branch: row.branch,
      icon: row.icon,
      color: row.color,
    }));

  return { stats, effects, unlockedCount: rows.length };
}

/**
 * Réinitialise l'arbre (hybride : gratuit 1×/10 niveaux ou 2000 Ryos).
 */
export async function respecTalents(userId) {
  const connection = await getConnection();
  let pointsRefunded = 0;
  let costRyos = 0;

  try {
    await connection.beginTransaction();

    const [charRows] = await connection.execute(
      `SELECT id, character_level AS level,
              character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const character = charRows[0];
    if (!character) throw httpError(404, 'Personnage introuvable.');

    const [unlockedRows] = await connection.execute(
      'SELECT node_id FROM user_talents WHERE user_id = ? FOR UPDATE',
      [userId],
    );
    pointsRefunded = unlockedRows.length;
    if (pointsRefunded === 0) {
      throw httpError(400, 'Aucun talent à réinitialiser.');
    }

    const [respecRows] = await connection.execute(
      'SELECT cost_ryos FROM user_talent_respec_history WHERE user_id = ?',
      [userId],
    );
    const quote = buildRespecQuote(character.level, respecRows);
    costRyos = quote.costRyos;

    if (costRyos > 0) {
      const [profileRows] = await connection.execute(
        'SELECT ryos FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
        [userId],
      );
      if (!profileRows[0]) throw httpError(404, 'Profil joueur introuvable.');
      if (Number(profileRows[0].ryos) < costRyos) {
        throw httpError(400, `Ryos insuffisants (${profileRows[0].ryos}/${costRyos}).`);
      }
      await connection.execute('UPDATE player_profiles SET ryos = ryos - ? WHERE user_id = ?', [
        costRyos,
        userId,
      ]);
    }

    await connection.execute('DELETE FROM user_talents WHERE user_id = ?', [userId]);
    await connection.execute(
      `UPDATE player_profiles
       SET character_talent_points_available = character_talent_points_available + ?,
           character_updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND character_name IS NOT NULL`,
      [pointsRefunded, userId],
    );
    await connection.execute(
      `INSERT INTO user_talent_respec_history
        (user_id, cost_ryos, cost_dust, points_refunded)
       VALUES (?, ?, 0, ?)`,
      [userId, costRyos, pointsRefunded],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [talents, bonuses] = await Promise.all([
    getUserTalents(userId),
    computeTalentBonuses(userId),
  ]);

  return {
    pointsRefunded,
    costPaid: { ryos: costRyos, dust: 0 },
    wasFree: costRyos === 0,
    talents,
    bonuses,
  };
}
