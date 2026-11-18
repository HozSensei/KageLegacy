/**
 * Arbre de talents V3 : rangs, paliers et quatre piliers verticaux.
 * Les points restent liés à l'utilisateur ; le respec rembourse chaque rang.
 */
import { query, getConnection } from '../config/database.js';
import { mergeStatBonuses } from './playerCharacterService.js';

export const RESPEC_COST_RYOS = 2000;
export const FREE_RESPEC_EVERY_LEVELS = 10;
const CURRENT_BRANCHES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

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
    positionX: Number(row.position_x),
    positionY: Number(row.position_y),
    branch: row.branch,
    tier: Number(row.tier) || 0,
    maxRank: Number(row.max_rank) || 1,
    requiredBranchPoints: Number(row.required_branch_points) || 0,
    statBonus: parseJsonSafe(row.stat_bonus_json, null),
    effectCode: row.effect_code || null,
    requires: parseJsonSafe(row.requires_nodes_json, []) || [],
    icon: row.icon || null,
    color: row.color || null,
  };
}

function multiplyBonus(bonus, rank) {
  if (!bonus) return null;
  return Object.fromEntries(
    Object.entries(bonus).map(([key, value]) => [key, Number(value) * rank]),
  );
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

export async function getTalentTree() {
  const rows = await query(
    `SELECT *
     FROM talent_tree_nodes
     WHERE tier > 0 AND branch IN ('taijutsu','ninjutsu','genjutsu','medicine')
     ORDER BY branch, tier, position_x, id`,
  );
  return rows.map(serializeNode);
}

export async function getUserTalents(userId) {
  const [characterRows, unlockedRows, respecRows] = await Promise.all([
    query(
      `SELECT character_level AS level,
              character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL LIMIT 1`,
      [userId],
    ),
    query(
      `SELECT ut.node_id, ut.points_spent, ut.unlocked_at, n.type, n.effect_code,
              n.stat_bonus_json, n.name_fr, n.name_en, n.branch, n.icon, n.color
       FROM user_talents ut
       JOIN talent_tree_nodes n ON n.node_id = ut.node_id
       WHERE ut.user_id = ?
       ORDER BY ut.unlocked_at ASC`,
      [userId],
    ),
    query(
      `SELECT id, respec_at, cost_ryos, cost_dust, points_refunded
       FROM user_talent_respec_history
       WHERE user_id = ? ORDER BY respec_at DESC`,
      [userId],
    ),
  ]);

  const character = characterRows[0];
  if (!character) throw httpError(404, 'Personnage introuvable.');

  const nodeRanks = {};
  const branchPoints = Object.fromEntries(CURRENT_BRANCHES.map(branch => [branch, 0]));
  let spentPoints = 0;
  for (const row of unlockedRows) {
    const rank = Math.max(0, Number(row.points_spent) || 1);
    nodeRanks[row.node_id] = rank;
    spentPoints += rank;
    if (row.branch in branchPoints) branchPoints[row.branch] += rank;
  }

  const effects = unlockedRows
    .filter(row => row.effect_code)
    .map(row => ({
      nodeId: row.node_id,
      rank: Number(row.points_spent) || 1,
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
    unlockedNodeIds: Object.keys(nodeRanks),
    nodeRanks,
    branchPoints,
    spentPoints,
    unlockedCount: Object.keys(nodeRanks).length,
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

export async function canUnlock(userId, nodeId) {
  const node = await fetchNodeById(nodeId);
  if (!node || node.tier === 0)
    return { ok: false, reason: 'Nœud introuvable.', code: 'NOT_FOUND' };

  const user = await getUserTalents(userId);
  const rank = Number(user.nodeRanks[nodeId]) || 0;
  if (rank >= node.maxRank) {
    return { ok: false, reason: 'Rang maximum atteint.', code: 'MAX_RANK', node };
  }
  if (user.talentPointsAvailable < 1) {
    return { ok: false, reason: 'Aucun point de talent disponible.', code: 'NO_POINTS', node };
  }

  const branchPoints = Number(user.branchPoints[node.branch]) || 0;
  if (branchPoints < node.requiredBranchPoints) {
    return {
      ok: false,
      reason: `${node.requiredBranchPoints} points requis dans ${node.branch}.`,
      code: 'TIER_LOCKED',
      missingBranchPoints: node.requiredBranchPoints - branchPoints,
      node,
    };
  }

  const missing = (node.requires || []).filter(req => !user.nodeRanks[req]);
  if (missing.length) {
    return {
      ok: false,
      reason: `Prérequis manquants : ${missing.join(', ')}`,
      code: 'MISSING_PREREQS',
      missing,
      node,
    };
  }
  return { ok: true, reason: null, code: 'OK', node, rank, user };
}

export async function unlockTalent(userId, nodeId) {
  const check = await canUnlock(userId, nodeId);
  if (!check.ok) throw httpError(check.code === 'NOT_FOUND' ? 404 : 400, check.reason);

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [charRows] = await connection.execute(
      `SELECT id, character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const character = charRows[0];
    if (!character) throw httpError(404, 'Personnage introuvable.');
    if (Number(character.talent_points_available) < 1)
      throw httpError(400, 'Aucun point de talent disponible.');

    const [existing] = await connection.execute(
      'SELECT points_spent FROM user_talents WHERE user_id = ? AND node_id = ? LIMIT 1',
      [userId, nodeId],
    );
    const currentRank = Number(existing[0]?.points_spent) || 0;
    if (currentRank >= check.node.maxRank) throw httpError(400, 'Rang maximum atteint.');

    if (existing.length) {
      await connection.execute(
        'UPDATE user_talents SET points_spent = points_spent + 1 WHERE user_id = ? AND node_id = ?',
        [userId, nodeId],
      );
    } else {
      await connection.execute(
        'INSERT INTO user_talents (user_id, node_id, points_spent) VALUES (?, ?, 1)',
        [userId, nodeId],
      );
    }
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
    await onAchievementAction(userId, 'talent_spent', talents.spentPoints);
  } catch {
    // Les succès restent optionnels.
  }
  return {
    unlocked: nodeId,
    rank: talents.nodeRanks[nodeId] || 1,
    node: check.node,
    talents,
    bonuses,
  };
}

export async function commitTalentInvestments(userId, nodeIds) {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw httpError(400, 'Aucun investissement à valider.');
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [charRows] = await connection.execute(
      `SELECT character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const character = charRows[0];
    if (!character) throw httpError(404, 'Personnage introuvable.');
    if (Number(character.talent_points_available) < nodeIds.length) {
      throw httpError(400, 'Points de talent insuffisants.');
    }

    const [nodeRows] = await connection.execute(
      `SELECT * FROM talent_tree_nodes WHERE tier > 0
       AND branch IN ('taijutsu','ninjutsu','genjutsu','medicine')`,
    );
    const nodesById = new Map(nodeRows.map(row => [row.node_id, serializeNode(row)]));
    const [ownedRows] = await connection.execute(
      `SELECT ut.node_id, ut.points_spent, n.branch
       FROM user_talents ut
       JOIN talent_tree_nodes n ON n.node_id = ut.node_id
       WHERE ut.user_id = ? FOR UPDATE`,
      [userId],
    );

    const ranks = Object.fromEntries(
      ownedRows.map(row => [row.node_id, Number(row.points_spent) || 1]),
    );
    const branchPoints = Object.fromEntries(CURRENT_BRANCHES.map(branch => [branch, 0]));
    for (const row of ownedRows) {
      branchPoints[row.branch] = (branchPoints[row.branch] || 0) + (Number(row.points_spent) || 1);
    }

    const additions = {};
    for (const nodeId of nodeIds) {
      const node = nodesById.get(nodeId);
      if (!node) throw httpError(400, 'Talent invalide.');
      const currentRank = Number(ranks[nodeId]) || 0;
      if (currentRank >= node.maxRank)
        throw httpError(400, `Rang maximum atteint : ${node.nameFr}.`);
      if ((branchPoints[node.branch] || 0) < node.requiredBranchPoints) {
        throw httpError(
          400,
          `${node.requiredBranchPoints} points requis dans la voie ${node.branch}.`,
        );
      }
      const missing = (node.requires || []).filter(required => !(Number(ranks[required]) > 0));
      if (missing.length > 0) {
        throw httpError(400, `Prérequis manquants pour ${node.nameFr}.`);
      }
      ranks[nodeId] = currentRank + 1;
      branchPoints[node.branch] += 1;
      additions[nodeId] = (additions[nodeId] || 0) + 1;
    }

    for (const [nodeId, amount] of Object.entries(additions)) {
      const hadRank = ownedRows.some(row => row.node_id === nodeId);
      if (hadRank) {
        await connection.execute(
          'UPDATE user_talents SET points_spent = points_spent + ? WHERE user_id = ? AND node_id = ?',
          [amount, userId, nodeId],
        );
      } else {
        await connection.execute(
          'INSERT INTO user_talents (user_id, node_id, points_spent) VALUES (?, ?, ?)',
          [userId, nodeId, amount],
        );
      }
    }
    await connection.execute(
      `UPDATE player_profiles
       SET character_talent_points_available = character_talent_points_available - ?,
           character_updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND character_name IS NOT NULL`,
      [nodeIds.length, userId],
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
    await onAchievementAction(userId, 'talent_spent', talents.spentPoints);
  } catch {
    // Les succès restent optionnels.
  }
  return { committed: nodeIds.length, talents, bonuses };
}

export async function computeTalentBonuses(userId) {
  const rows = await query(
    `SELECT n.node_id, n.type, n.stat_bonus_json, n.effect_code,
            n.name_fr, n.name_en, n.branch, n.icon, n.color, ut.points_spent
     FROM user_talents ut
     JOIN talent_tree_nodes n ON n.node_id = ut.node_id
     WHERE ut.user_id = ?`,
    [userId],
  );

  const stats = mergeStatBonuses(
    ...rows
      .map(row =>
        multiplyBonus(parseJsonSafe(row.stat_bonus_json, null), Number(row.points_spent) || 1),
      )
      .filter(Boolean),
  );
  const effects = rows
    .filter(row => row.effect_code)
    .map(row => ({
      nodeId: row.node_id,
      rank: Number(row.points_spent) || 1,
      effectCode: row.effect_code,
      type: row.type,
      nameFr: row.name_fr,
      nameEn: row.name_en,
      branch: row.branch,
      icon: row.icon,
      color: row.color,
    }));
  return {
    stats,
    effects,
    unlockedCount: rows.length,
    spentPoints: rows.reduce((sum, row) => sum + (Number(row.points_spent) || 1), 0),
  };
}

export async function respecTalents(userId) {
  const connection = await getConnection();
  let pointsRefunded = 0;
  let costRyos = 0;
  try {
    await connection.beginTransaction();
    const [charRows] = await connection.execute(
      `SELECT id, character_level AS level, character_talent_points_available AS talent_points_available
       FROM player_profiles
       WHERE user_id = ? AND character_name IS NOT NULL LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const character = charRows[0];
    if (!character) throw httpError(404, 'Personnage introuvable.');

    const [unlockedRows] = await connection.execute(
      'SELECT points_spent FROM user_talents WHERE user_id = ? FOR UPDATE',
      [userId],
    );
    pointsRefunded = unlockedRows.reduce((sum, row) => sum + (Number(row.points_spent) || 1), 0);
    if (!pointsRefunded) throw httpError(400, 'Aucun talent à réinitialiser.');

    const [respecRows] = await connection.execute(
      'SELECT cost_ryos FROM user_talent_respec_history WHERE user_id = ?',
      [userId],
    );
    costRyos = buildRespecQuote(character.level, respecRows).costRyos;
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
      `INSERT INTO user_talent_respec_history (user_id, cost_ryos, cost_dust, points_refunded)
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
