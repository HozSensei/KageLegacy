/**
 * Seed Phase 2 de l'arbre de talents (~150 nœuds).
 * Branches : center + taijutsu + ninjutsu + genjutsu + medicine.
 * Noms ORIGINAUX — pas de références IP.
 *
 * Idempotent via ON DUPLICATE KEY UPDATE.
 * Usage: node scripts/seedTalentTree.js  (ou npm run db:seed-talents)
 */
import { query } from '../src/config/database.js';
import { TALENT_NODE_DEFS } from './data/talentTreeNodes.js';

/**
 * Helper nœud → ligne SQL.
 * @param {object} n
 */
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
    stat_bonus_json: n.bonus ? JSON.stringify(n.bonus) : null,
    effect_code: n.effect || null,
    requires_nodes_json: JSON.stringify(n.requires || []),
    icon: n.icon || null,
    color: n.color || null,
  };
}

const NODES = TALENT_NODE_DEFS.map(node);

/**
 * Valide unicité, prérequis et contraintes type avant upsert.
 * @param {object[]} defs
 */
function validateDefs(defs) {
  const ids = new Set();
  const positions = new Map();
  const byId = new Map();

  for (const n of defs) {
    if (!n.id || typeof n.id !== 'string') throw new Error('Node missing id');
    if (n.id.length > 50) throw new Error(`node_id trop long: ${n.id}`);
    if (ids.has(n.id)) throw new Error(`Duplicate node_id: ${n.id}`);
    ids.add(n.id);
    byId.set(n.id, n);

    const posKey = `${n.x},${n.y}`;
    if (positions.has(posKey)) {
      throw new Error(`Position overlap ${posKey}: ${positions.get(posKey)} vs ${n.id}`);
    }
    positions.set(posKey, n.id);

    if (n.type === 'stat' && !n.bonus) {
      throw new Error(`Stat node ${n.id} missing bonus`);
    }
    if ((n.type === 'notable' || n.type === 'keystone') && !n.effect) {
      throw new Error(`${n.type} node ${n.id} missing effect`);
    }
    // Notables/keystones may also carry bonus (allowed by DB via effect_code).
  }

  for (const n of defs) {
    for (const req of n.requires || []) {
      if (!ids.has(req)) {
        throw new Error(`Node ${n.id} requires unknown ${req}`);
      }
    }
  }

  // Acyclic requires (Kahn-ish)
  const indeg = new Map([...ids].map((id) => [id, 0]));
  for (const n of defs) {
    for (const req of n.requires || []) {
      indeg.set(n.id, (indeg.get(n.id) || 0) + 1);
    }
  }
  const queue = [...ids].filter((id) => indeg.get(id) === 0);
  let seen = 0;
  const adj = new Map([...ids].map((id) => [id, []]));
  for (const n of defs) {
    for (const req of n.requires || []) {
      adj.get(req).push(n.id);
    }
  }
  while (queue.length) {
    const id = queue.shift();
    seen += 1;
    for (const next of adj.get(id) || []) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  if (seen !== ids.size) {
    throw new Error('Cycle détecté dans requires_nodes_json');
  }

  return { byId, ids };
}

async function upsertNode(n) {
  await query(
    `INSERT INTO talent_tree_nodes
      (node_id, name_fr, name_en, description_fr, description_en, type,
       position_x, position_y, branch, stat_bonus_json, effect_code,
       requires_nodes_json, icon, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name_fr = VALUES(name_fr),
       name_en = VALUES(name_en),
       description_fr = VALUES(description_fr),
       description_en = VALUES(description_en),
       type = VALUES(type),
       position_x = VALUES(position_x),
       position_y = VALUES(position_y),
       branch = VALUES(branch),
       stat_bonus_json = VALUES(stat_bonus_json),
       effect_code = VALUES(effect_code),
       requires_nodes_json = VALUES(requires_nodes_json),
       icon = VALUES(icon),
       color = VALUES(color)`,
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
      n.stat_bonus_json,
      n.effect_code,
      n.requires_nodes_json,
      n.icon,
      n.color,
    ],
  );
}

function summarize(defs) {
  const byType = { stat: 0, notable: 0, keystone: 0 };
  const byBranch = {};
  const keystones = [];
  for (const n of defs) {
    byType[n.type] = (byType[n.type] || 0) + 1;
    byBranch[n.branch] = (byBranch[n.branch] || 0) + 1;
    if (n.type === 'keystone') {
      keystones.push(`${n.id} (${n.branch}) — ${n.nameFr}`);
    }
  }
  return { byType, byBranch, keystones };
}

async function main() {
  validateDefs(TALENT_NODE_DEFS);
  const { byType, byBranch, keystones } = summarize(TALENT_NODE_DEFS);

  console.log(`Seeding talent tree (${NODES.length} nodes)…`);
  console.log('By type:', byType);
  console.log('By branch:', byBranch);
  console.log('Keystones:');
  for (const k of keystones) console.log(`  • ${k}`);

  for (const n of NODES) {
    await upsertNode(n);
  }

  console.log('Done.');
  process.exit(0);
}

// Export pour tests / dry-run sans DB
export { NODES, validateDefs, summarize, TALENT_NODE_DEFS };

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seedTalentTree.js') ||
    process.argv[1].includes('seedTalentTree'));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
