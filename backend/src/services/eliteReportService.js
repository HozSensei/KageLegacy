import { getUserLanguage } from './narrative/viewerLocale.js';
import { assertActiveEliteSubscription } from './eliteSubscriptionService.js';
import { loadMatchRow, assertViewerCanAccessMatch, isMatchParticipant } from './matchSpectatorService.js';
import {
  isPliLog,
  pliDamageTotal,
  plisMetrics,
  pliWinnerSide,
  winningTechniqueLabel,
} from './combat/pli/combatLogMetrics.js';
import { MAX_PLIS } from './combat/pli/constants.js';
import {
  buildDeckComparison,
  buildDomainPliWins,
  buildRelaisStats,
} from './eliteMatchAnalytics.js';
import { OPPONENT_DECK_PROFILE_LABELS } from './eliteDeckSimulation.js';

const TECHNIQUE_ICONS = {
  Taijutsu: 'tai',
  Ninjutsu: 'nin',
  Genjutsu: 'gen',
  Medecine: 'med',
  confusion: 'conf',
  skip: 'skip',
  item_event: 'item',
};

/** Ancre dans /rules pour les cartes tactiques et consignes. */
export const ELITE_RULES_COMPOSITION_ANCHOR = 'cartes-tactiques';

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

function parseCombatLog(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function viewerSide(match, userId) {
  if (match.home_user_id === userId) return 'home';
  if (match.away_user_id === userId) return 'away';
  return null;
}

function sideFromAttackLabel(label, match) {
  if (label === 'home' || label === match.home_sensei) return 'home';
  if (label === 'away' || label === match.away_sensei) return 'away';
  return null;
}

function isMyAction(log, mySide, match) {
  const pliSide = pliWinnerSide(log);
  if (pliSide) return pliSide === mySide;
  const atk = log.equipe_attaque;
  if (!atk) return false;
  if (atk === mySide) return true;
  if (atk === 'home' || atk === 'away') return atk === mySide;
  return sideFromAttackLabel(atk, match) === mySide;
}

function summarizeLogAction(log, locale) {
  const lang = normalizeLocale(locale);
  if (isPliLog(log)) {
    const home = log.carte_home || '—';
    const away = log.carte_away || '—';
    if (log.type === 'relais') {
      return lang === 'en' ? `Relay — ${home} vs ${away}` : `Relais — ${home} vs ${away}`;
    }
    if (log.type === 'element') {
      return lang === 'en' ? `Deck element — ${home} vs ${away}` : `Élément deck — ${home} vs ${away}`;
    }
    const domain = winningTechniqueLabel(log) || '—';
    return lang === 'en'
      ? `Pli — ${home} vs ${away} (${domain})`
      : `Pli — ${home} vs ${away} (${domain})`;
  }
  if (log.type === 'confusion') {
    return lang === 'en'
      ? `${log.attaquant_name} hits ally ${log.cible_name}`
      : `${log.attaquant_name} frappe l'allié ${log.cible_name}`;
  }
  if (log.type === 'skip') {
    return lang === 'en' ? `${log.ninja} paralyzed` : `${log.ninja} paralysé`;
  }
  if (log.type === 'item_event') {
    return lang === 'en' ? `${log.ninja_name} — item` : `${log.ninja_name} — objet`;
  }
  if (log.type === 'tactic_card') {
    const targets = (log.card_targets || []).join(', ');
    if (log.card_healed > 0) {
      return lang === 'en'
        ? `${log.ninja_name} — tactic card (+${log.card_healed} HP)`
        : `${log.ninja_name} — carte tactique (+${log.card_healed} PV)`;
    }
    if (log.card_damage > 0) {
      return lang === 'en'
        ? `${log.ninja_name} — tactic card → ${targets} (${log.card_damage} dmg)`
        : `${log.ninja_name} — carte tactique → ${targets} (${log.card_damage} dégâts)`;
    }
    return lang === 'en'
      ? `${log.ninja_name} — tactic card`
      : `${log.ninja_name} — carte tactique`;
  }
  if (log.technique_type === 'Medecine' || log.soins_pv) {
    return lang === 'en'
      ? `${log.attaquant_name} heals ${log.cible_name} (+${log.soins_pv})`
      : `${log.attaquant_name} soigne ${log.cible_name} (+${log.soins_pv})`;
  }
  const dmg = log.degats_pv ?? 0;
  return lang === 'en'
    ? `${log.attaquant_name} → ${log.cible_name} (${log.technique_type}, ${dmg} PV)`
    : `${log.attaquant_name} → ${log.cible_name} (${log.technique_type}, ${dmg} PV)`;
}

function buildTimeline(logs, mySide, match, locale) {
  const byTour = new Map();
  for (const log of logs) {
    if (!log.tour) continue;
    if (!byTour.has(log.tour)) {
      byTour.set(log.tour, { tour: log.tour, pliWinner: null, events: [] });
    }
    const bucket = byTour.get(log.tour);
    const winner = pliWinnerSide(log);
    if (winner) bucket.pliWinner = winner;
    bucket.events.push({
      side: isMyAction(log, mySide, match) ? 'mine' : 'opponent',
      technique: winningTechniqueLabel(log) || log.technique_type || log.type || 'action',
      icon: TECHNIQUE_ICONS[winningTechniqueLabel(log)] || TECHNIQUE_ICONS[log.type] || 'action',
      summary: summarizeLogAction(log, locale),
      damage: pliDamageTotal(log),
      heal: log.soins_pv ?? 0,
    });
  }

  return [...byTour.values()]
    .sort((a, b) => a.tour - b.tour)
    .map((row) => ({
      tour: row.tour,
      pliWinner: row.pliWinner,
      initiativeHomePct: row.pliWinner === 'home' ? 100 : row.pliWinner === 'away' ? 0 : null,
      events: row.events,
    }));
}

function buildTechniqueBreakdown(logs, mySide, match) {
  const mine = { Taijutsu: 0, Ninjutsu: 0, Genjutsu: 0, Medecine: 0, received: 0 };
  const opp = { Taijutsu: 0, Ninjutsu: 0, Genjutsu: 0, Medecine: 0, received: 0 };

  for (const log of logs) {
    const dmg = isPliLog(log) ? pliDamageTotal(log) : Number(log.degats_pv ?? 0);
    if (!dmg) continue;
    const winner = pliWinnerSide(log);
    const mineAtk = winner ? winner === mySide : isMyAction(log, mySide, match);
    const bucket = mineAtk ? mine : opp;
    const recv = mineAtk ? opp : mine;
    const rawTech = isPliLog(log) ? winningTechniqueLabel(log) : log.technique_type;
    const tech = rawTech === 'Médecine' ? 'Medecine' : rawTech;
    if (tech && bucket[tech] != null) bucket[tech] += dmg;
    recv.received += dmg;
  }

  return { mine, opponent: opp };
}

function scoreDecisiveMoment(log, mySide, match, locale) {
  let score = isPliLog(log) ? pliDamageTotal(log) : Number(log.degats_pv ?? 0);
  if (log.sensei_interception) score += 40;
  if (log.item_smoke_save) score += 25;
  if (log.altruiste_sacrifice) score += 20;
  if (log.critique) score += 15;
  if (log.type === 'relais') score += 10;
  if (log.type === 'element') score += 8;
  return {
    score,
    tour: log.tour,
    label: summarizeLogAction(log, locale),
    side: isMyAction(log, mySide, match) ? 'mine' : 'opponent',
    tags: [
      log.type === 'relais' ? 'relais' : null,
      log.type === 'element' ? 'element' : null,
      log.sensei_interception ? 'interception' : null,
      log.item_smoke_save ? 'smoke' : null,
      log.critique ? 'crit' : null,
      score >= 30 ? 'heavy' : null,
    ].filter(Boolean),
  };
}

function buildDecisiveMoments(logs, mySide, match, locale) {
  return logs
    .filter((log) => log.type !== 'item_event' && log.type !== 'skip')
    .map((log) => scoreDecisiveMoment(log, mySide, match, locale))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function assertEliteToolsAccess(userId) {
  return assertActiveEliteSubscription(userId);
}

/**
 * Rapport analytique privé post-match (Pack Élite).
 */
export async function buildEliteMatchReport(matchId, viewerUserId, locale = 'fr') {
  await assertEliteToolsAccess(viewerUserId);

  const match = await loadMatchRow(matchId);
  if (!match) {
    const error = new Error('Match introuvable.');
    error.statusCode = 404;
    throw error;
  }

  await assertViewerCanAccessMatch(viewerUserId, match);

  const combatLog = parseCombatLog(match.combat_log);
  if (!combatLog?.logs?.length) {
    const error = new Error('Rapport indisponible — match non simulé.');
    error.statusCode = 404;
    throw error;
  }

  const mySide = viewerSide(match, viewerUserId);
  const lang = normalizeLocale(locale);
  const plis = plisMetrics(combatLog);
  const myPossessionPct =
    mySide === 'home' ? plis.homePct : mySide === 'away' ? plis.awayPct : null;

  const logs = combatLog.logs;
  const techniqueBreakdown = mySide
    ? buildTechniqueBreakdown(logs, mySide, match)
    : { mine: null, opponent: null };

  const report = {
    matchId: match.id,
    seasonCycle: match.season_cycle,
    result: match.result,
    endingTour: match.ending_tour,
    viewerSide: mySide,
    viewerRole: isMatchParticipant(match, viewerUserId) ? 'participant' : 'spectator',
    summary: {
      possession: {
        home: plis.homePct ?? null,
        away: plis.awayPct ?? null,
        mine: myPossessionPct,
        opponent: myPossessionPct != null ? 100 - myPossessionPct : null,
      },
      plisWon: {
        home: plis.homePlis,
        away: plis.awayPlis,
      },
      remainingPower: {
        home: combatLog.homeScorePct,
        away: combatLog.awayScorePct,
      },
      environment: combatLog.environment?.slug ?? match.environment_slug ?? null,
      endReason: combatLog.endReason ?? null,
      koCount: {
        home: (combatLog.koNinjaIds || []).filter((k) => k.side === 'home').length,
        away: (combatLog.koNinjaIds || []).filter((k) => k.side === 'away').length,
      },
      maxPlis: MAX_PLIS,
    },
    timeline: mySide ? buildTimeline(logs, mySide, match, lang) : [],
    techniqueBreakdown,
    decisiveMoments: mySide ? buildDecisiveMoments(logs, mySide, match, lang) : [],
    domainPliWins: buildDomainPliWins(logs, mySide),
    deckComparison: buildDeckComparison(combatLog, mySide, lang),
    relaisStats: buildRelaisStats(logs, mySide),
    equipment: combatLog.equipmentSummary || [],
  };

  return report;
}

export function buildOrdersAdvice(deckOrCounts, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const tips = [];
  const deck = deckOrCounts?.deck ?? deckOrCounts;
  const techniqueCount = deck?.techniqueCount ?? Object.values(deck?.techniqueSlotsByNinjaId || {}).reduce(
    (sum, ids) => sum + (ids?.length || 0),
    0
  );
  const maxTechniques = 3;

  if (techniqueCount < maxTechniques) {
    tips.push(
      lang === 'en'
        ? `Deck has ${techniqueCount}/${maxTechniques} inventory technique cards — assign one per ninja before H71.`
        : `Deck : ${techniqueCount}/${maxTechniques} cartes technique inventaire — assignez-en une par ninja avant H71.`
    );
  } else {
    tips.push(
      lang === 'en'
        ? 'Full 9-pli shuffle — 1 inventory card + 2 stat cards per active ninja.'
        : 'Mélange complet à 9 plis — 1 carte inventaire + 2 cartes stat par ninja actif.'
    );
  }

  const configuredNinjas = Object.values(deck?.techniqueSlotsByNinjaId || {}).filter(
    (ids) => (ids?.length || 0) >= 1
  ).length;
  if (configuredNinjas < 3) {
    tips.push(
      lang === 'en'
        ? 'Assign 1 inventory technique card on each active ninja.'
        : 'Assignez 1 carte technique inventaire sur chaque ninja actif.'
    );
  }

  return {
    techniqueCount,
    label:
      lang === 'en'
        ? `${techniqueCount}/${maxTechniques} technique cards`
        : `${techniqueCount}/${maxTechniques} cartes technique`,
    tips,
  };
}

/**
 * Synthèse lisible d'une simulation de matchup (outils Élite).
 */
export function buildSimulationVerdict({
  winPct,
  opponentProfile = 'complete',
  opponentProfileLabel = null,
  opponentLevel = 'similar',
  locale = 'fr',
  squadContext = null,
}) {
  const lang = normalizeLocale(locale);
  const profileLabels = OPPONENT_DECK_PROFILE_LABELS[lang] || OPPONENT_DECK_PROFILE_LABELS.fr;
  const oppLabel = opponentProfileLabel || profileLabels[opponentProfile] || opponentProfile;
  const factors = [];
  const advice = [];

  factors.push(
    lang === 'en'
      ? `Reference opponent uses a ${oppLabel.toLowerCase()} at your power level (${opponentLevel}).`
      : `Adversaire de référence avec un profil « ${oppLabel} », calibré sur votre puissance (${opponentLevel}).`
  );

  if (squadContext?.deckElements != null && squadContext.deckElements < 5) {
    factors.push(
      lang === 'en'
        ? `Only ${squadContext.deckElements}/5 deck elements selected on your side.`
        : `Seulement ${squadContext.deckElements}/5 éléments de deck choisis de votre côté.`
    );
  }

  if (squadContext?.opponentDeckElements != null && squadContext.opponentDeckElements < 5) {
    factors.push(
      lang === 'en'
        ? `Reference opponent uses ${squadContext.opponentDeckElements}/5 element cards — relay plis expected.`
        : `L'adversaire de référence n'a que ${squadContext.opponentDeckElements}/5 éléments — relais probables.`
    );
  }

  if (squadContext?.opponentTechniquesConfigured != null && squadContext.opponentTechniquesConfigured < 3) {
    factors.push(
      lang === 'en'
        ? `Only ${squadContext.opponentTechniquesConfigured}/3 opponent ninjas have configured techniques.`
        : `Seulement ${squadContext.opponentTechniquesConfigured}/3 ninjas adverses ont des techniques configurées.`
    );
  }

  const levelDescriptions = {
    fr: {
      weaker: 'adversaire calibré ~15 % en dessous de votre escouade',
      slightly_weaker: 'adversaire légèrement en dessous de votre puissance',
      similar: 'adversaire calibré sur la puissance de votre escouade',
      slightly_stronger: 'adversaire légèrement au-dessus de votre puissance',
      stronger: 'adversaire calibré ~15 % au-dessus de votre escouade',
    },
    en: {
      weaker: 'opponent tuned ~15% below your squad',
      slightly_weaker: 'opponent slightly below your power',
      similar: 'opponent tuned to your squad power',
      slightly_stronger: 'opponent slightly above your power',
      stronger: 'opponent tuned ~15% above your squad',
    },
  };

  const levelKey = levelDescriptions[lang][opponentLevel]
    ? opponentLevel
    : 'similar';

  factors.push(
    lang === 'en'
      ? `Synthetic opponent deck — ${levelDescriptions[lang][levelKey]}, not a real player roster.`
      : `Deck adverse synthétique — ${levelDescriptions.fr[levelKey]}, pas un vrai roster joueur.`
  );

  if (squadContext?.avgMoral != null && squadContext.avgMoral < 12 && winPct < 50) {
    factors.push(
      lang === 'en'
        ? `Low squad morale (avg ${squadContext.avgMoral.toFixed(1)}/20) drags performance in long fights.`
        : `Moral d'escouade bas (moy. ${squadContext.avgMoral.toFixed(1)}/20) pénalise les combats longs.`
    );
    advice.push(
      lang === 'en'
        ? 'Raise morale via Chakra Seals, dispensary, or bench rotation before committing to the operation.'
        : 'Remontez le moral via sceaux chakra, dispensaire ou rotation du banc avant de verrouiller l\'opération.'
    );
  }

  let tone = 'even';
  let headline;
  if (winPct >= 58) {
    tone = 'favorable';
    headline = lang === 'en' ? 'Favorable outlook' : 'Tendance favorable';
    advice.push(
      lang === 'en'
        ? 'Trend is positive — keep refining your operation deck and training focus.'
        : 'La tendance est bonne — continuez à affiner votre deck d\'opération et votre entraînement.'
    );
  } else if (winPct <= 42) {
    tone = 'unfavorable';
    headline = lang === 'en' ? 'Tough matchup' : 'Matchup difficile';
  } else {
    headline = lang === 'en' ? 'Close matchup' : 'Match serré';
    advice.push(
      lang === 'en'
        ? 'Small changes (one technique swap, one element card, or morale recovery) can flip this trend.'
        : 'De petits ajustements (une technique, une carte élément ou du moral) peuvent renverser la tendance.'
    );
  }

  if (winPct <= 42) {
    advice.push(
      lang === 'en'
        ? 'Complete your 5 deck elements and set primary/secondary techniques on every active ninja before H71.'
        : 'Complétez vos 5 éléments de deck et définissez les techniques principal/secondaire sur chaque ninja actif avant H71.'
    );
  }

  if (!advice.length && tone === 'unfavorable') {
    advice.push(
      lang === 'en'
        ? 'Review your deck checklist and training ROI above, then re-run the simulator.'
        : 'Revoyez la checklist deck et le ROI entraînement ci-dessus, puis relancez la simulation.'
    );
  }

  return {
    tone,
    headline,
    factors,
    advice,
    oppLabel,
    rulesAnchor: ELITE_RULES_COMPOSITION_ANCHOR,
  };
}
