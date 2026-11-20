/**
 * Lore missions — vignettes par rang + attach sans brief liste.
 */
import assert from 'node:assert/strict';
import {
  RANK_VIGNETTES,
  MISSION_LORE,
  attachMissionLore,
  pickRankVignette,
  getMissionChapter,
} from './data/missionLore.js';
import { RANK_MISSION_SLUGS } from '../src/config/missionPathConfig.js';

for (const rank of ['D', 'C', 'B', 'A', 'S']) {
  const list = RANK_VIGNETTES[rank];
  assert.ok(list?.length >= 3, `rang ${rank}: ≥3 vignettes`);
  for (const v of list) {
    assert.ok(v.briefFr && v.briefEn, `brief bilingue ${rank}`);
    assert.ok(v.epilogueFr && v.epilogueEn, `épilogue bilingue ${rank}`);
  }
  assert.ok(getMissionChapter(rank)?.fr, `chapitre ${rank}`);
}

for (const slug of RANK_MISSION_SLUGS) {
  assert.ok(MISSION_LORE[slug], `fallback lore slug ${slug}`);
}

const picked = pickRankVignette('D', () => 0);
assert.equal(picked.briefFr, RANK_VIGNETTES.D[0].briefFr);

const m = attachMissionLore({
  slug: 'mission-rank-d',
  rank: 'D',
  descriptionFr: 'desc',
  descriptionEn: 'desc',
});
assert.equal(m.briefFr, null, 'liste: pas de brief');
assert.equal(m.epilogueFr, null, 'liste: pas d’épilogue');
assert.ok(m.chapterFr, 'liste: chapitre ok');

console.log(
  `testMissionLore: OK (${Object.values(RANK_VIGNETTES).reduce((n, a) => n + a.length, 0)} vignettes, ${RANK_MISSION_SLUGS.length} slugs)`,
);
