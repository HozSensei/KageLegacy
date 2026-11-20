/**
 * Lore missions — couverture des slugs + champs.
 * Usage: node scripts/testMissionLore.js
 */
import assert from 'node:assert/strict';
import {
  MISSION_LORE,
  attachMissionLore,
  getMissionChapter,
} from './data/missionLore.js';
import { MISSION_ENCOUNTER_DIFFICULTIES } from '../src/config/missionEncounterDifficulties.js';

const slugs = Object.keys(MISSION_ENCOUNTER_DIFFICULTIES);
assert.equal(Object.keys(MISSION_LORE).length, slugs.length);
for (const slug of slugs) {
  assert.ok(MISSION_LORE[slug], `lore manquant: ${slug}`);
  const L = MISSION_LORE[slug];
  assert.ok(L.briefFr && L.briefEn && L.epilogueFr && L.epilogueEn, slug);
}

assert.ok(getMissionChapter('D')?.fr);
const m = attachMissionLore({
  slug: 'patrol-mist-road',
  rank: 'D',
  descriptionFr: 'desc',
  descriptionEn: 'desc',
});
assert.ok(m.briefFr.includes('Brumes') || m.briefFr.includes('rônin'));
assert.ok(m.chapterFr);

console.log(`testMissionLore: OK (${slugs.length} missions)`);
