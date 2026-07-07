import {
  createNarrativeRng,
  normalizeLocale,
  pickFromPool,
  pickTemplateEntry,
} from './narrativeI18n.js';

const INITIATIVE_THRESHOLD = 35;
const ELEMENT_WEAKNESS_THRESHOLD = 3;
const CHAKRA_KO_THRESHOLD = 2;

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
 * Génère jusqu'à 4 alertes pédagogiques à partir du combat_log (ton analytique).
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

  const possession = combatLog.possession || {};
  const myPct = side === 'home' ? possession.homePct : possession.awayPct;

  if (myPct !== undefined && myPct < INITIATIVE_THRESHOLD) {
    alerts.push({
      code: 'initiative',
      text: pickDebriefVariant(lang, 'initiative', rng.fork(1)),
    });
  }

  const logs = combatLog.logs || [];
  let elementalHits = 0;
  for (const log of logs) {
    const attackingAway = log.equipe_attaque === 'away';
    const attackingHome = log.equipe_attaque === 'home';
    const hurtsMe =
      (side === 'home' && attackingAway) || (side === 'away' && attackingHome);
    if (hurtsMe && log.technique_type === 'Ninjutsu' && log.degats_pv > 0) {
      elementalHits += 1;
    }
  }

  if (elementalHits > ELEMENT_WEAKNESS_THRESHOLD) {
    alerts.push({
      code: 'element',
      text: pickDebriefVariant(lang, 'element', rng.fork(2)),
    });
  }

  const koOnSide = (combatLog.koNinjaIds || []).filter((k) => k.side === side);
  if (koOnSide.length >= CHAKRA_KO_THRESHOLD) {
    alerts.push({
      code: 'chakra',
      text: pickDebriefVariant(lang, 'chakra', rng.fork(3)),
    });
  }

  const summary = combatLog.equipmentSummary || [];
  for (const entry of summary) {
    if (entry.side !== side) continue;
    const unused = entry.equippedSlugs.filter((s) => !entry.consumedSlugs.includes(s));
    if (!unused.length) continue;
    const labels = unused
      .map((slug) => pickTemplateEntry(lang, `debrief.item_labels.${slug}`, 0) || slug)
      .join(', ');
    alerts.push({
      code: 'item_unused',
      text: pickTemplateEntry(lang, 'debrief.item_unused', 0, {
        ninja_name: entry.ninjaName,
        items: labels,
      }),
    });
  }

  return alerts.slice(0, 4);
}

export function pickSuspenseLine(locale = 'fr', seed = Date.now()) {
  const rng = createNarrativeRng(seed, 77);
  return pickFromPool(normalizeLocale(locale), 'suspense', rng).text;
}
