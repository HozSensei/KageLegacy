#!/usr/bin/env node
/**
 * Smoke test moteur narratif : seed, i18n, composites.
 */
import { createNarrativeRng } from '../src/services/narrative/narrativeRng.js';
import { assembleNarrative } from '../src/services/narrative/narrativeAssembler.js';
import { buildMissionReportPayload } from '../src/services/missionNarrative.js';
import { buildDebriefing } from '../src/services/narrative/debriefing.js';
import { resolveSegmentText } from '../src/services/narrative/narrativeI18n.js';

const combatLog = {
  logs: [
    {
      tour: 1,
      type: 'pli',
      carte_home: 'Taijutsu',
      carte_away: 'Genjutsu',
      technique_type_home: 'Taijutsu',
      technique_type_away: 'Genjutsu',
      pli_winner: 'away',
      degats_pv: 8,
      degats_pv_away: 0,
    },
    {
      tour: 2,
      type: 'pli',
      carte_home: 'Ninjutsu',
      carte_away: 'Taijutsu',
      technique_type_home: 'Ninjutsu',
      technique_type_away: 'Taijutsu',
      pli_winner: 'home',
      degats_pv: 0,
      degats_pv_away: 2,
    },
  ],
  plisWon: { home: 1, away: 1 },
  homeScorePct: 41,
  awayScorePct: 58,
  environment: { slug: 'brouillard' },
  koNinjaIds: [],
  equipmentSummary: [],
};

const narrative = assembleNarrative({
  matchId: 145,
  homeSensei: 'Kakashi',
  awaySensei: 'Baki',
  homeNinjas: [{ name: 'Haru' }, { name: 'Sora' }],
  awayNinjas: [{ name: 'Rei' }, { name: 'Gen' }],
  combatLog,
  winner: 'away',
  endReason: 'points',
  endingTour: 2,
  environmentSlug: 'brouillard',
});

const intro = narrative.segments.find((s) => s.block_type === 'intro');
const introFr = resolveSegmentText('fr', intro);
const introEn = resolveSegmentText('en', intro);

if (!introFr.includes('Kakashi')) throw new Error('intro FR manquante');
if (!introEn.includes('Kakashi')) throw new Error('intro EN manquante');
if (introFr === introEn) throw new Error('intro FR/EN identiques');

const rng1 = createNarrativeRng(145, 1);
const rng2 = createNarrativeRng(145, 1);
const a = rng1.nextInt(10);
const b = rng2.nextInt(10);
if (a !== b) throw new Error('seed non reproductible');

const mission = buildMissionReportPayload({
  missionId: 42,
  locale: 'en',
  tier: 'D',
  ninjaName: 'Haru',
  status: 'completed',
  lootResult: { narrative: 'medical_kit', baseRyos: 50 },
  injuryType: 'none',
});
if (!mission.reportText.includes('Haru')) throw new Error('mission EN');

const debrief = buildDebriefing(
  { home_user_id: 1, away_user_id: 2 },
  1,
  combatLog,
  'fr'
);
if (!debrief.some((d) => d.code === 'environment')) throw new Error('debrief environment');

const denouement = narrative.segments.find((s) => s.block_type === 'denouement');
const denouementFr = resolveSegmentText('fr', denouement);
if (!denouementFr.includes('58%')) throw new Error('denouement score manquant');
if (!denouementFr.includes('plis')) throw new Error('denouement plis manquant');

const actionSeg = narrative.segments.find((s) => s.block_type === 'action' && s.template_key === 'chronicle.pli');
const actionFr = resolveSegmentText('fr', actionSeg);
if (!actionFr.includes('→')) throw new Error('résultat pli manquant');
if (!actionFr.includes('Taijutsu')) throw new Error('carte pli manquante dans la chronique');
if (!actionFr.includes('contre') && !actionFr.includes('face à')) throw new Error('affrontement cartes manquant');

console.log('NARRATIVE_TEST_OK');
console.log('Intro FR:', introFr.slice(0, 120) + '…');
console.log('Intro EN:', introEn.slice(0, 120) + '…');
console.log('Mission EN:', mission.reportText.slice(0, 100) + '…');
