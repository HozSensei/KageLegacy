/**
 * Seed de l'arbre V3 : quatre piliers, paliers verticaux et rangs multiples.
 * Les anciens investissements sont conservés et convertis dans les nouveaux nœuds.
 */
import { query } from '../src/config/database.js';
import { TALENT_NODE_DEFS } from './data/talentTreeNodes.js';

const BRANCHES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

function node(n) {
  return {
    node_id: n.id,
    name_fr: n.nameFr,
    name_en: n.nameEn,
    description_fr: n.descFr || null,
    description_en: n.descEn || null,
    type: n.type,
    position_x: n.x,
    position_y: n.y,
    branch: n.branch,
    tier: n.tier,
    max_rank: n.maxRank,
    required_branch_points: n.requiredBranchPoints,
    stat_bonus_json: n.bonus ? JSON.stringify(n.bonus) : null,
    effect_code: n.effect || null,
    requires_nodes_json: JSON.stringify(n.requires || []),
    icon: n.icon || null,
    color: n.color || null,
  };
}

const NODES = TALENT_NODE_DEFS.map(node);
const NODE_IDS = new Set(TALENT_NODE_DEFS.map(n => n.id));

async function ensureColumn(table, column, definition) {
  const rows = await query(
    `SELECT 1 AS present
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  if (!rows.length) await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureSchema() {
  await ensureColumn(
    'talent_tree_nodes',
    'tier',
    "TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = legacy archivé'",
  );
  await ensureColumn('talent_tree_nodes', 'max_rank', 'TINYINT UNSIGNED NOT NULL DEFAULT 1');
  await ensureColumn(
    'talent_tree_nodes',
    'required_branch_points',
    'INT UNSIGNED NOT NULL DEFAULT 0',
  );
  await ensureColumn('user_talents', 'points_spent', 'TINYINT UNSIGNED NOT NULL DEFAULT 1');
}

function validateDefs(defs) {
  const ids = new Set();
  const positions = new Map();
  const byId = new Map();

  for (const n of defs) {
    if (!n.id || typeof n.id !== 'string' || n.id.length > 50)
      throw new Error(`Node id invalide: ${n.id}`);
    if (ids.has(n.id)) throw new Error(`Duplicate node_id: ${n.id}`);
    if (!BRANCHES.includes(n.branch)) throw new Error(`Branch invalide: ${n.branch}`);
    if (!Number.isInteger(n.tier) || n.tier < 1 || n.tier > 6)
      throw new Error(`Tier invalide: ${n.id}`);
    if (!Number.isInteger(n.maxRank) || n.maxRank < 1 || n.maxRank > 3)
      throw new Error(`Rang invalide: ${n.id}`);
    if (n.effect && !n.bonus && n.type !== 'notable') throw new Error(`Type invalide: ${n.id}`);
    if (!n.effect && !n.bonus) throw new Error(`Talent vide: ${n.id}`);
    ids.add(n.id);
    byId.set(n.id, n);
    const posKey = `${n.x},${n.y}`;
    if (positions.has(posKey))
      throw new Error(`Position overlap ${positions.get(posKey)} / ${n.id}`);
    positions.set(posKey, n.id);
  }

  for (const n of defs) {
    for (const req of n.requires || []) {
      if (!ids.has(req)) throw new Error(`Node ${n.id} requires unknown ${req}`);
    }
  }
  for (const branch of BRANCHES) {
    const rows = defs.filter(n => n.branch === branch);
    if (rows.length < 18) throw new Error(`${branch}: au moins 18 talents attendus`);
    if (new Set(rows.map(n => n.tier)).size !== 6)
      throw new Error(`${branch}: six paliers attendus`);
  }
  for (const n of defs) {
    if (n.bonus?.maxChakra) throw new Error(`${n.id}: Chakra interdit dans les talents`);
  }
  return { byId, ids };
}

async function upsertNode(n) {
  await query(
    `INSERT INTO talent_tree_nodes
      (node_id, name_fr, name_en, description_fr, description_en, type,
       position_x, position_y, branch, tier, max_rank, required_branch_points,
       stat_bonus_json, effect_code, requires_nodes_json, icon, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name_fr = VALUES(name_fr), name_en = VALUES(name_en),
       description_fr = VALUES(description_fr), description_en = VALUES(description_en),
       type = VALUES(type), position_x = VALUES(position_x), position_y = VALUES(position_y),
       branch = VALUES(branch), tier = VALUES(tier), max_rank = VALUES(max_rank),
       required_branch_points = VALUES(required_branch_points),
       stat_bonus_json = VALUES(stat_bonus_json), effect_code = VALUES(effect_code),
       requires_nodes_json = VALUES(requires_nodes_json), icon = VALUES(icon), color = VALUES(color)`,
    [
      n.node_id,
      n.name_fr,
      n.name_en,
      n.description_fr,
      n.description_en,
      n.type,
      n.position_x,
      n.position_y,
      n.branch,
      n.tier,
      n.max_rank,
      n.required_branch_points,
      n.stat_bonus_json,
      n.effect_code,
      n.requires_nodes_json,
      n.icon,
      n.color,
    ],
  );
}

/** Convertit chaque point legacy vers un rang du nouveau pilier, sans le perdre. */
async function migrateLegacyInvestments() {
  const oldRows = await query(
    `SELECT ut.user_id, ut.node_id, ut.points_spent, n.branch
     FROM user_talents ut
     JOIN talent_tree_nodes n ON n.node_id = ut.node_id
     WHERE ut.node_id NOT IN (${[...NODE_IDS].map(() => '?').join(',')})`,
    [...NODE_IDS],
  );
  if (!oldRows.length) return 0;

  const perUser = new Map();
  for (const row of oldRows) {
    if (!perUser.has(row.user_id)) perUser.set(row.user_id, []);
    perUser.get(row.user_id).push(row);
  }

  let migratedPoints = 0;
  for (const [userId, rows] of perUser) {
    for (const source of rows) {
      const preferred = BRANCHES.includes(source.branch) ? source.branch : BRANCHES[0];
      const orderedBranches = [preferred, ...BRANCHES.filter(b => b !== preferred)];
      let remaining = Number(source.points_spent) || 1;
      migratedPoints += remaining;

      while (remaining > 0) {
        let assigned = false;
        for (const branch of orderedBranches) {
          const current = await query(
            `SELECT n.node_id, n.max_rank, COALESCE(ut.points_spent, 0) AS points_spent
             FROM talent_tree_nodes n
             LEFT JOIN user_talents ut ON ut.node_id = n.node_id AND ut.user_id = ?
             WHERE n.branch = ? AND n.tier > 0
             ORDER BY n.tier, n.position_x`,
            [userId, branch],
          );
          const target = current.find(row => Number(row.points_spent) < Number(row.max_rank));
          if (!target) continue;
          await query(
            `INSERT INTO user_talents (user_id, node_id, points_spent)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE points_spent = points_spent + 1`,
            [userId, target.node_id],
          );
          remaining -= 1;
          assigned = true;
          break;
        }
        if (!assigned)
          throw new Error(`Impossible de convertir tous les points de l'utilisateur ${userId}`);
      }
      await query('DELETE FROM user_talents WHERE user_id = ? AND node_id = ?', [
        userId,
        source.node_id,
      ]);
    }
  }
  return migratedPoints;
}

function summarize(defs) {
  const byType = {};
  const byBranch = {};
  let points = 0;
  for (const n of defs) {
    byType[n.type] = (byType[n.type] || 0) + 1;
    byBranch[n.branch] = (byBranch[n.branch] || 0) + 1;
    points += n.maxRank;
  }
  return { byType, byBranch, points, keystones: [] };
}

async function main() {
  validateDefs(TALENT_NODE_DEFS);
  await ensureSchema();
  const { byType, byBranch, points } = summarize(TALENT_NODE_DEFS);
  for (const n of NODES) await upsertNode(n);
  const migratedPoints = await migrateLegacyInvestments();
  console.log(
    `Talent tree V3: ${NODES.length} nodes, ${points} points (${migratedPoints} legacy points converted)`,
  );
  console.log('By type:', byType);
  console.log('By branch:', byBranch);
}

export { NODES, validateDefs, summarize, TALENT_NODE_DEFS };

const isDirectRun = process.argv[1] && /seedTalentTree\.js$/.test(process.argv[1]);
if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
