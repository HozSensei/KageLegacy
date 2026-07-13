#!/usr/bin/env node
/**
 * Smoke test moteur narratif : seed, i18n, composites.
 */
import { createNarrativeRng } from '../src/services/narrative/narrativeRng.js';
import { assembleNarrative } from '../src/services/narrative/narrativeAssembler.js';
import { buildMissionReportPayload } from '../src/services/missionNarrative.js';
import { buildDebriefing } from '../src/services/narrative/debriefing.js';
import { resolveSegmentText, formatPliImpactDetail, buildPliImpactLog } from '../src/services/narrative/narrativeI18n.js';
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { buildTeamDeck } from '../src/services/combat/pli/deckBuilder.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';

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
if (!actionFr.includes('joue')) throw new Error('action de jeu manquante dans la chronique');
if (!actionFr.includes('Taijutsu') && !actionFr.includes('Genjutsu')) throw new Error('domaine carte manquant');
if (actionFr.includes('contre') && actionFr.includes('·')) {
  throw new Error('format carte legacy encore présent');
}

const domainLog = {
  logs: [
    {
      tour: 1,
      pli: 1,
      type: 'pli',
      carte_home: 'Noa Tachibana · Taijutsu',
      carte_away: 'Kenta Amagiri · Médecine',
      technique_type_home: 'Taijutsu',
      technique_type_away: 'Médecine',
      pli_winner: 'home',
      degats_pv: 9,
      degats_pv_away: 9,
      cible_name: 'Kenta Amagiri',
      cible_name_away: 'Kenta Amagiri',
    },
  ],
  plisWon: { home: 1, away: 0 },
  homeScorePct: 50,
  awayScorePct: 40,
  koNinjaIds: [],
};

const domainNarrative = assembleNarrative({
  matchId: 146,
  homeSensei: 'HozÉlite',
  awaySensei: 'Baki',
  homeNinjas: [{ name: 'Noa Tachibana' }],
  awayNinjas: [{ name: 'Kenta Amagiri' }],
  combatLog: domainLog,
  winner: 'home',
  endReason: 'points',
  endingTour: 1,
});

const domainSeg = domainNarrative.segments.find((s) => s.template_key === 'chronicle.pli');
const domainFr = resolveSegmentText('fr', domainSeg);
if (!domainFr.includes('Noa Tachibana')) throw new Error('chronique domaine : ninja manquant');
if (!domainFr.includes('Taijutsu')) throw new Error('chronique domaine : domaine manquant');
if (domainFr.includes('n\'ayant pas de technique configurée')) {
  throw new Error('chronique domaine : relais inventaire à tort');
}
const impactDup = formatPliImpactDetail(buildPliImpactLog(domainLog.logs[0]), 'fr');
if (impactDup.split('Kenta Amagiri').length > 2) {
  throw new Error('chronique : dégâts dupliqués sur même cible');
}

const relaisLog = {
  logs: [
    {
      tour: 1,
      pli: 1,
      type: 'relais',
      carte_home: 'Relais · Noa Tachibana',
      carte_away: 'Relais · Kenta Amagiri',
      technique_type_home: 'Genjutsu',
      technique_type_away: 'Médecine',
      pli_winner: 'home',
      relais_home: true,
      relais_away: true,
      relais_padding_home: true,
      relais_padding_away: true,
      relais_reason_home: 'missing_technique',
      relais_reason_away: 'missing_technique',
      proxy_home: 'Eiji Tsukimori',
      proxy_away: 'Kenta Amagiri',
      degats_pv: 2,
      cible_name: 'Kenta Amagiri',
    },
  ],
  plisWon: { home: 1, away: 0 },
  homeScorePct: 50,
  awayScorePct: 48,
  koNinjaIds: [],
};

const relaisNarrative = assembleNarrative({
  matchId: 147,
  homeSensei: 'HozÉlite',
  awaySensei: 'Baki',
  homeNinjas: [{ name: 'Noa Tachibana' }, { name: 'Eiji Tsukimori' }],
  awayNinjas: [{ name: 'Kenta Amagiri' }],
  combatLog: relaisLog,
  winner: 'home',
  endReason: 'points',
  endingTour: 1,
});
const relaisSeg = relaisNarrative.segments.find((s) => s.template_key === 'chronicle.pli');
const relaisFr = resolveSegmentText('fr', relaisSeg);
if (!relaisFr.includes('carte technique inventaire')) {
  throw new Error('chronique relais : libellé inventaire manquant');
}

function buildTeam(ninjas, label) {
  const fighters = ninjas.map((ninja, index) => {
    const stats = applyFormeToStats(ninja);
    const maxPv = computeMatchPvFromRating(stats);
    return {
      id: ninja.id,
      name: ninja.name,
      side: label,
      element_affinity: ninja.element_affinity,
      stats,
      pv: maxPv,
      maxPv,
      ko: false,
      slot: index + 1,
    };
  });
  return { label, fighters, sensei: { name: label } };
}

const squad = createBalancedSquad('Med', 0, 1.0);
squad[0].medecine = 40;
const home = buildTeam(squad, 'home');
const away = buildTeam(createBalancedSquad('Away', 5, 1.0), 'away');
const deck = {
  techniquesByNinjaId: Object.fromEntries(
    home.fighters.map((f) => [f.id, { primary: 'taijutsu', secondary: 'ninjutsu' }])
  ),
  rawTechniquesByNinjaId: Object.fromEntries(
    home.fighters.map((f) => [f.id, { primary: 'taijutsu', secondary: 'ninjutsu' }])
  ),
  techniqueSlotsByNinjaId: {},
  techniqueCardsById: {},
};
const medDeck = {
  ...deck,
  techniquesByNinjaId: Object.fromEntries(
    away.fighters.map((f) => [f.id, { primary: 'medecine', secondary: 'taijutsu' }])
  ),
  rawTechniquesByNinjaId: Object.fromEntries(
    away.fighters.map((f) => [f.id, { primary: 'medecine', secondary: 'taijutsu' }])
  ),
};
const medFight = simulatePliCombat(home, away, { homeDeck: deck, awayDeck: medDeck });
const medWinLog = medFight.logs.find((log) => log.pli_winner === 'home' && log.technique_type_away === 'Médecine');
if (medWinLog && medWinLog.degats_pv > 0 && medWinLog.degats_pv_away > 0) {
  throw new Error('combat med : double application des dégâts');
}

console.log('NARRATIVE_TEST_OK');
console.log('Intro FR:', introFr.slice(0, 120) + '…');
console.log('Intro EN:', introEn.slice(0, 120) + '…');
console.log('Mission EN:', mission.reportText.slice(0, 100) + '…');
