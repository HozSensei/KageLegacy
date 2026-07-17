/**
 * Causal debrief unit smoke test — no DB required.
 */
import { buildCausalDebrief } from '../src/services/combat/pli/causalDebrief.js';
import { buildDeckMatchupPreview } from '../src/services/deckMatchupPreview.js';

const match = { home_user_id: 1, away_user_id: 2 };
const combatLog = {
  endReason: 'points',
  plisWon: { home: 11, away: 7 },
  homeScorePct: 120,
  awayScorePct: 80,
  squadSnapshots: {
    home: [{ name: 'A', weekly_forme: 'Lamentable', speed: 10 }],
    away: [{ name: 'B', weekly_forme: 'Excellent', speed: 14 }],
  },
  logs: [
    {
      type: 'pli',
      pli_winner: 'away',
      technique_type_home: 'Genjutsu',
      technique_type_away: 'Taijutsu',
      type_advantage_away: true,
      carte_home: 'Gen · A',
      carte_away: 'Tai · B',
      puissance_home: 10,
      puissance_away: 18,
    },
    {
      type: 'pli',
      pli_winner: 'away',
      technique_type_home: 'Genjutsu',
      technique_type_away: 'Taijutsu',
      type_advantage_away: true,
      carte_home: 'Gen · A',
      carte_away: 'Tai · B',
      puissance_home: 9,
      puissance_away: 17,
    },
    {
      type: 'pli',
      pli_winner: 'home',
      technique_type_home: 'Ninjutsu',
      technique_type_away: 'Taijutsu',
      technique_card_home: true,
      carte_home: 'Lame de chakra',
      carte_away: 'Tai · B',
      puissance_home: 22,
      puissance_away: 12,
    },
  ],
};

const debrief = buildCausalDebrief(match, 1, combatLog, 'fr');
console.assert(debrief.causes.length >= 1, 'causes expected');
console.assert(
  debrief.causes.some((c) => c.code.includes('domain') || c.code.includes('forme') || c.code === 'technique_card'),
  'expected domain/forme/tech cause'
);

const preview = buildDeckMatchupPreview(
  {
    members: [
      { primaryDomain: 'taijutsu', secondaryDomain: 'genjutsu' },
      { primaryDomain: 'taijutsu', secondaryDomain: 'ninjutsu' },
      { primaryDomain: 'medecine', secondaryDomain: 'genjutsu' },
    ],
    techniqueCount: 2,
    maxTechniques: 3,
    relaisPadding: 1,
  },
  { domainCounts: { taijutsu: 1, ninjutsu: 0, genjutsu: 4, medecine: 1 } },
  'fr'
);
console.assert(preview?.lines?.length >= 1, 'matchup lines');
console.assert(preview.scoreHint, 'score hint');

console.log('✅ causal debrief + matchup preview OK');
console.log(
  'causes:',
  debrief.causes.map((c) => c.code).join(', ')
);
console.log('matchup:', preview.scoreHint);
