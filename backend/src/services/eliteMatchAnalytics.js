import {
  isPliLog,
  pliWinnerSide,
  winningTechniqueLabel,
} from './combat/pli/combatLogMetrics.js';
import { MAX_PLIS } from './combat/pli/constants.js';

const DOMAIN_KEYS = ['Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine'];

const DOMAIN_LABELS = {
  fr: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Médecine',
  },
  en: {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Medicine',
  },
};

function normalizeDomainKey(raw) {
  if (!raw) return null;
  if (raw === 'Médecine') return 'Medecine';
  return DOMAIN_KEYS.includes(raw) ? raw : null;
}

function summarizeSnapshot(snapshot, lang) {
  if (!snapshot) return null;
  const labels = DOMAIN_LABELS[lang] || DOMAIN_LABELS.fr;
  const domains = snapshot.primaryDomains || {};
  const domainLines = Object.entries(domains)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${count}× ${labels[key] || key}`);

  return {
    elementCount: snapshot.elementCount ?? 0,
    elementSlugs: snapshot.elementSlugs ?? [],
    primaryDomains: domains,
    domainSummary: domainLines.join(', ') || null,
  };
}

/**
 * Comparaison des decks figés au match (snapshots combat_log).
 */
export function buildDeckComparison(combatLog, mySide, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const snaps = combatLog?.deckSnapshots;
  if (!snaps || !mySide) return null;

  const mine = mySide === 'home' ? snaps.home : snaps.away;
  const opponent = mySide === 'home' ? snaps.away : snaps.home;
  if (!mine && !opponent) return null;

  return {
    mine: summarizeSnapshot(mine, lang),
    opponent: summarizeSnapshot(opponent, lang),
  };
}

/**
 * Statistiques relais / plis élément sur le match.
 */
export function buildRelaisStats(logs, mySide) {
  if (!mySide || !logs?.length) return null;

  const mine = { relais: 0, element: 0, technique: 0 };
  const opponent = { relais: 0, element: 0, technique: 0 };
  let totalPlis = 0;

  for (const log of logs) {
    if (!isPliLog(log)) continue;
    totalPlis += 1;
    const winner = pliWinnerSide(log);
    if (!winner) continue;
    const bucket = winner === mySide ? mine : opponent;
    if (log.type === 'relais') bucket.relais += 1;
    else if (log.type === 'element') bucket.element += 1;
    else bucket.technique += 1;
  }

  return {
    mine,
    opponent,
    totalPlis,
    maxPlis: MAX_PLIS,
    mineRelaisPct: totalPlis ? Math.round((mine.relais / totalPlis) * 100) : 0,
    opponentRelaisPct: totalPlis ? Math.round((opponent.relais / totalPlis) * 100) : 0,
  };
}

/**
 * Plis remportés par domaine technique (remplace l'ancienne heatmap élémentaire legacy).
 */
export function buildDomainPliWins(logs, mySide) {
  if (!mySide || !logs?.length) return null;

  const mine = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  const opponent = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  let hasData = false;

  for (const log of logs) {
    if (!isPliLog(log) || log.type === 'relais') continue;
    const winner = pliWinnerSide(log);
    if (!winner) continue;
    const domain = normalizeDomainKey(winningTechniqueLabel(log));
    if (!domain) continue;
    hasData = true;
    if (winner === mySide) mine[domain] += 1;
    else opponent[domain] += 1;
  }

  if (!hasData) return null;
  return { domains: DOMAIN_KEYS, mine, opponent };
}
