/**
 * Réécrit encounters_json des missions dans schema.sql depuis missionEncounterDifficulties.
 * Usage: node scripts/patchMissionEncountersInSchema.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MISSION_ENCOUNTER_DIFFICULTIES } from '../src/config/missionEncounterDifficulties.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../schema.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

function mysqlEscapeJson(value) {
  return JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let patched = 0;
for (const [slug, encounters] of Object.entries(MISSION_ENCOUNTER_DIFFICULTIES)) {
  const slugLit = `'${slug}'`;
  const slugIdx = sql.indexOf(slugLit);
  if (slugIdx < 0) {
    console.warn('slug manquant:', slug);
    continue;
  }
  // Après le slug : name_fr, name_en, desc_fr, desc_en, rank, encounters_json
  // Cherche le premier tableau JSON d’encounters après le slug dans ce tuple.
  const slice = sql.slice(slugIdx, slugIdx + 8000);
  const match = slice.match(/,'((?:\\.|[^'\\])*)'/g);
  // Plus robuste : localiser `,'D','[{` ou C/B/A/S
  const rankJson = slice.match(/,'([DCBAS])','(\[\{[\s\S]*?\}\])'/);
  if (!rankJson) {
    console.warn('encounters introuvables pour', slug);
    continue;
  }
  const oldBlock = `,'${rankJson[1]}','${rankJson[2]}'`;
  const newBlock = `,'${rankJson[1]}','${mysqlEscapeJson(encounters)}'`;
  const absoluteOld = sql.slice(slugIdx, slugIdx + rankJson.index + oldBlock.length);
  if (!absoluteOld.includes(oldBlock)) {
    console.warn('bloc non aligné', slug);
    continue;
  }
  sql =
    sql.slice(0, slugIdx + rankJson.index) + newBlock + sql.slice(slugIdx + rankJson.index + oldBlock.length);
  patched += 1;
}

fs.writeFileSync(schemaPath, sql);
console.log(`patchMissionEncountersInSchema: ${patched} missions`);
