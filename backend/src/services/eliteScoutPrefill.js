import { getGameClock } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { getUserMatchForCycle } from './matchService.js';
import { generateScoutReport } from './scouting.js';
import { getSimulatorTechniqueOptions } from './eliteDeckSimulation.js';

const DOMAIN_STUB_PRIORITY = {
  ninjutsu: ['nin-afflux-chakra', 'nin-katon-boule', 'nin-raiton-eclair'],
  taijutsu: ['tai-lame-chakras', 'tai-coup-poing-leon'],
  genjutsu: ['gen-mirage-simple', 'gen-brume-mentale'],
  medecine: ['med-scalpel-chakra', 'med-paume-mystique'],
};

const FALLBACK_TECHNIQUE_SLUGS = [
  'tai-lame-chakras',
  'nin-afflux-chakra',
  'gen-mirage-simple',
  'med-scalpel-chakra',
];

function mapTechniqueSlugsByNinja(deckReport) {
  const known = new Set(getSimulatorTechniqueOptions('fr').map((o) => o.slug));
  const fromSlots = (deckReport?.slots || []).map((slot) =>
    (slot.techniques || [])
      .map((t) => t.slug)
      .filter((slug) => slug && known.has(slug))
      .slice(0, 1)
  );
  if (fromSlots.some((row) => row.length)) return fromSlots;

  const count = Number(deckReport?.techniqueCount) || 0;
  if (!count) return [[], [], []];

  const picked = [];
  const ranked = Object.entries(deckReport?.domainCounts || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [domain] of ranked) {
    for (const stub of DOMAIN_STUB_PRIORITY[domain] || []) {
      if (picked.length >= count) break;
      if (!picked.includes(stub) && known.has(stub)) picked.push(stub);
    }
  }
  for (const stub of FALLBACK_TECHNIQUE_SLUGS) {
    if (picked.length >= count) break;
    if (!picked.includes(stub) && known.has(stub)) picked.push(stub);
  }

  const rows = [[], [], []];
  for (let i = 0; i < picked.length; i += 1) {
    rows[i % 3].push(picked[i]);
  }
  return rows;
}

function buildSummary(scoutReport, deckReport, config, lang) {
  const opponent = scoutReport?.opponentName || '—';
  const tier = deckReport?.tier || scoutReport?.tier;
  const techniques = (config.techniqueSlugsByNinja || []).reduce((sum, row) => sum + row.length, 0);

  if (lang === 'en') {
    if (tier === 'full') {
      return `Filled from full scout report on ${opponent} (${techniques}/3 inventory technique cards).`;
    }
    return `Filled from partial scout on ${opponent} — estimated techniques (${techniques}/3 cards).`;
  }

  if (tier === 'full') {
    return `Pré-rempli depuis le rapport complet sur ${opponent} (${techniques}/3 cartes technique inventaire).`;
  }
  return `Pré-rempli depuis le scout partiel sur ${opponent} — techniques estimées (${techniques}/3 cartes).`;
}

export async function getScoutMatchupPrefill(userId, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const pool = await findUserPool(userId);
  if (!pool) {
    return { available: false, reason: 'no_pool' };
  }

  const match = await getUserMatchForCycle(userId, pool.current_cycle);
  if (!match) {
    return { available: false, reason: 'no_match' };
  }

  const clock = await getGameClock();
  const hour = clock.hour ?? 0;

  if (hour < 36) {
    return {
      available: false,
      reason: 'before_h36',
      opponentName: null,
    };
  }

  const scoutReport = await generateScoutReport(userId, pool.current_cycle, lang);
  if (!scoutReport) {
    return { available: false, reason: 'no_scout' };
  }

  if (scoutReport.lockReason === 'no_recon') {
    return {
      available: false,
      reason: 'no_recon',
      opponentName: scoutReport.opponentName,
    };
  }

  if (hour < 54 || scoutReport.rosterPending) {
    return {
      available: false,
      reason: 'before_h54',
      opponentName: scoutReport.opponentName,
      historicalTendencies: scoutReport.historicalTendencies?.lines?.slice(0, 2) ?? [],
    };
  }

  const deckReport = scoutReport.deckReport;
  if (!deckReport) {
    return {
      available: false,
      reason: 'deck_pending',
      opponentName: scoutReport.opponentName,
    };
  }

  const config = buildScoutMatchupConfigFromReport(scoutReport, deckReport);

  return {
    available: true,
    opponentName: scoutReport.opponentName,
    tier: deckReport.tier || scoutReport.tier,
    reconOutcome: scoutReport.reconOutcome ?? scoutReport.rosterReport?.reconOutcome,
    deckFrozen: Boolean(scoutReport.deckFrozen),
    config,
    summary: buildSummary(scoutReport, deckReport, config, lang),
  };
}

export function buildScoutMatchupConfigFromReport(scoutReport, deckReport) {
  return {
    techniqueSlugsByNinja: mapTechniqueSlugsByNinja(deckReport),
  };
}
