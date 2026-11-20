/**
 * Synchronise les 5 missions par rang dans schema.sql depuis missionPathConfig.
 * Usage: node scripts/patchMissionEncountersInSchema.js
 *
 * (Ancien script : patchait encounters_json des 16 missions fixes.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RANK_MISSION_DEFINITIONS } from '../src/config/missionPathConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../schema.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const created = '2026-11-20 00:00:00';
const values = RANK_MISSION_DEFINITIONS.map((def, i) => {
  const rewards = JSON.stringify(def.rewards).replace(/"/g, '\\"');
  return `(${i + 1},'${def.slug}','${esc(def.nameFr)}','${esc(def.nameEn)}','${esc(def.descriptionFr)}','${esc(def.descriptionEn)}','${def.rank}','[]','${rewards}',1,${def.sortOrder},'${created}')`;
}).join(',');

const newInsert = `INSERT INTO \`mission_definitions\` VALUES ${values};`;

const next = sql.replace(
  /INSERT INTO `mission_definitions` VALUES [\s\S]*?;/,
  newInsert,
);

if (next === sql || !next.includes('mission-rank-d')) {
  console.error('patchMissionEncountersInSchema: échec de remplacement');
  process.exit(1);
}

fs.writeFileSync(schemaPath, next);
console.log(`patchMissionEncountersInSchema: ${RANK_MISSION_DEFINITIONS.length} missions rang`);
