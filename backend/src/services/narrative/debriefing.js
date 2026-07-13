import {
  createNarrativeRng,
  normalizeLocale,
  pickFromPool,
  pickTemplateEntry,
} from './narrativeI18n.js';

const ELEMENT_WEAKNESS_THRESHOLD = 3;
const KO_THRESHOLD = 2;

function userSide(match, userId) {
  if (match.home_user_id === userId) return 'home';
  if (match.away_user_id === userId) return 'away';
  return null;
}

function pickDebriefVariant(locale, code, rng, vars = {}) {
  const picked = pickFromPool(normalizeLocale(locale), `debrief.${code}`, rng, vars);
  return picked.text;
}

/**
 * Génère jusqu'à 4 alertes pédagogiques à partir du combat_log pli.
 */
export function buildDebriefing(match, userId, combatLog, locale = 'fr') {
  if (!combatLog) return [];

  const side = userSide(match, userId);
  if (!side) return [];

  const lang = normalizeLocale(locale);
  const rng = createNarrativeRng(match.id ?? match.home_user_id, userId);
  const alerts = [];
  const envSlug = combatLog.environment?.slug;

  if (envSlug) {
    const text = pickTemplateEntry(lang, `debrief.environment.${envSlug}`, 0);
    if (text) alerts.push({ code: 'environment', text });
  }

  const plisWon = combatLog.plisWon || {};
  const myPlis = side === 'home' ? plisWon.home : plisWon.away;
  const theirPlis = side === 'home' ? plisWon.away : plisWon.home;

  if (myPlis !== undefined && theirPlis !== undefined && myPlis < theirPlis - 2) {
    alerts.push({
      code: 'plis_lost',
      text: pickDebriefVariant(lang, 'plis_lost', rng.fork(1)),
    });
  }

  const logs = combatLog.logs || [];
  let ninHits = 0;
  for (const log of logs) {
    const hurtsMe =
      (side === 'home' && log.gagnant === 'away') || (side === 'away' && log.gagnant === 'home');
    if (hurtsMe && log.domaine === 'ninjutsu' && (log.degats_pv > 0 || log.degats_pv_away > 0)) {
      ninHits += 1;
    }
  }

  if (ninHits > ELEMENT_WEAKNESS_THRESHOLD) {
    alerts.push({
      code: 'element',
      text: pickDebriefVariant(lang, 'element', rng.fork(2)),
    });
  }

  const koOnSide = (combatLog.koNinjaIds || []).filter((k) => k.side === side);
  if (koOnSide.length >= KO_THRESHOLD) {
    alerts.push({
      code: 'ko',
      text: pickDebriefVariant(lang, 'chakra', rng.fork(3)),
    });
  }

  return alerts.slice(0, 4);
}

export function pickSuspenseLine(locale = 'fr', seed = Date.now()) {
  const rng = createNarrativeRng(seed, 77);
  return pickFromPool(normalizeLocale(locale), 'suspense', rng).text;
}
