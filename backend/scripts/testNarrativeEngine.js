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
      attaquant_name: 'Rei',
      cible_name: 'Haru',
      technique_type: 'Taijutsu',
      degats_pv: 8,
      equipe_attaque: 'away',
    },
    {
      tour: 2,
      attaquant_name: 'Sora',
      cible_name: 'Gen',
      technique_type: 'Ninjutsu',
      degats_pv: 2,
      equipe_attaque: 'home',
    },
  ],
  possession: { homePct: 28, awayPct: 72 },
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
if (!debrief.some((d) => d.code === 'initiative')) throw new Error('debrief initiative');

const denouement = narrative.segments.find((s) => s.block_type === 'denouement');
const denouementFr = resolveSegmentText('fr', denouement);
if (!denouementFr.includes('58%')) throw new Error('denouement score manquant');
if (!denouementFr.includes('possession')) throw new Error('denouement possession manquant');

const actionSeg = narrative.segments.find((s) => s.block_type === 'action' && s.template_index === 1);
const actionFr = resolveSegmentText('fr', actionSeg);
if (!actionFr.includes('→')) throw new Error('momentum tour manquant');

console.log('NARRATIVE_TEST_OK');
console.log('Intro FR:', introFr.slice(0, 120) + '…');
console.log('Intro EN:', introEn.slice(0, 120) + '…');
console.log('Mission EN:', mission.reportText.slice(0, 100) + '…');
