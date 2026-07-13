import { DOMAINS } from './combat/pli/constants.js';
import { getGameClock } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { getUserMatchForCycle } from './matchService.js';
import { generateScoutReport } from './scouting.js';
import { getSimulatorElementOptions } from './eliteDeckSimulation.js';

const DOMAIN_STUB_PRIORITY = {
  ninjutsu: ['nin-eclair-discret', 'raiton-surcharge', 'doton-racines'],
  taijutsu: ['tai-parade-ecole', 'futon-lame-retour'],
  genjutsu: ['gen-kage-bunshin', 'futon-lame-retour'],
  medecine: ['med-pansement-rapide', 'med-soin-zone'],
};

const FALLBACK_ELEMENT_SLUGS = [
  'nin-eclair-discret',
  'tai-parade-ecole',
  'med-pansement-rapide',
  'raiton-surcharge',
  'futon-lame-retour',
];

function pickSecondary(primary, domainCounts = {}) {
  const alt = DOMAINS.find((d) => d !== primary && (domainCounts[d] || 0) > 0);
  if (alt) return alt;
  if (primary === 'medecine') return 'taijutsu';
  if (primary === 'genjutsu') return 'ninjutsu';
  return 'ninjutsu';
}

function mapElementSlugs(deckReport) {
  const known = new Set(getSimulatorElementOptions('fr').map((o) => o.slug));
  const fromCards = (deckReport?.elementCards || [])
    .map((card) => card.slug)
    .filter((slug) => slug && known.has(slug));
  if (fromCards.length) return fromCards.slice(0, 5);

  const count = Number(deckReport?.elementCount) || 0;
  if (!count) return [];

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

  for (const stub of FALLBACK_ELEMENT_SLUGS) {
    if (picked.length >= count) break;
    if (!picked.includes(stub) && known.has(stub)) picked.push(stub);
  }

  return picked.slice(0, count);
}

function buildSummary(scoutReport, deckReport, config, lang) {
  const opponent = scoutReport?.opponentName || '—';
  const tier = deckReport?.tier || scoutReport?.tier;
  const configured = config.slots.filter((s) => s.configured).length;
  const elements = config.elementSlugs.length;

  if (lang === 'en') {
    if (tier === 'full') {
      return `Filled from full scout report on ${opponent} (${configured}/3 techniques · ${elements} elements).`;
    }
    return `Filled from partial scout on ${opponent} — estimated techniques (${configured}/3 · ${elements} elements).`;
  }

  if (tier === 'full') {
    return `Pré-rempli depuis le rapport complet sur ${opponent} (${configured}/3 techniques · ${elements} éléments).`;
  }
  return `Pré-rempli depuis le scout partiel sur ${opponent} — techniques estimées (${configured}/3 · ${elements} éléments).`;
}

/**
 * Transforme le rapport d'espionnage gratuit du cycle en config simulateur Élite.
 * Ne donne pas plus d'intel que le scout — copie seulement dans le formulaire.
 */
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

/** Export test / réutilisation sans requête scout. */
export function buildScoutMatchupConfigFromReport(scoutReport, deckReport) {
  return {
    slots: buildSlotsFromScout(scoutReport, deckReport),
    elementSlugs: mapElementSlugs(deckReport),
  };
}
