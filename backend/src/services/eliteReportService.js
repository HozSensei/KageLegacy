import {
  COMPOSITION_BEATS,
  compositionLabel,
  detectSquadComposition,
  hasCompositionAdvantage,
  hasCompositionDisadvantage,
} from './combat/compositionMeta.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { findUserPool } from './poolService.js';
import { getActiveEliteSubscription } from './eliteSubscriptionService.js';
import { loadMatchRow, assertViewerCanAccessMatch, isMatchParticipant } from './matchSpectatorService.js';

const TECHNIQUE_ICONS = {
  Taijutsu: 'tai',
  Ninjutsu: 'nin',
  Genjutsu: 'gen',
  Medecine: 'med',
  confusion: 'conf',
  skip: 'skip',
  item_event: 'item',
};

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
  const atk = log.equipe_attaque;
  if (!atk) return false;
  if (atk === mySide) return true;
  if (atk === 'home' || atk === 'away') return atk === mySide;
  return sideFromAttackLabel(atk, match) === mySide;
}

function summarizeLogAction(log, locale) {
  const lang = normalizeLocale(locale);
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
      byTour.set(log.tour, { tour: log.tour, homePctSamples: [], events: [] });
    }
    const bucket = byTour.get(log.tour);
    if (log.initiative_chance_home != null) {
      bucket.homePctSamples.push(log.initiative_chance_home);
    }
    bucket.events.push({
      side: isMyAction(log, mySide, match) ? 'mine' : 'opponent',
      technique: log.technique_type || log.type || 'action',
      icon: TECHNIQUE_ICONS[log.technique_type] || TECHNIQUE_ICONS[log.type] || 'action',
      summary: summarizeLogAction(log, locale),
      damage: log.degats_pv ?? 0,
      heal: log.soins_pv ?? 0,
    });
  }

  return [...byTour.values()]
    .sort((a, b) => a.tour - b.tour)
    .map((row) => ({
      tour: row.tour,
      initiativeHomePct:
        row.homePctSamples.length > 0
          ? Math.round(
              row.homePctSamples.reduce((s, v) => s + v, 0) / row.homePctSamples.length
            )
          : null,
      events: row.events,
    }));
}

function buildTechniqueBreakdown(logs, mySide, match) {
  const mine = { Taijutsu: 0, Ninjutsu: 0, Genjutsu: 0, Medecine: 0, received: 0 };
  const opp = { Taijutsu: 0, Ninjutsu: 0, Genjutsu: 0, Medecine: 0, received: 0 };

  for (const log of logs) {
    const dmg = log.degats_pv ?? 0;
    if (!dmg) continue;
    const mineAtk = isMyAction(log, mySide, match);
    const bucket = mineAtk ? mine : opp;
    const recv = mineAtk ? opp : mine;
    const tech = log.technique_type;
    if (tech && bucket[tech] != null) bucket[tech] += dmg;
    recv.received += dmg;
  }

  return { mine, opponent: opp };
}

function scoreDecisiveMoment(log, mySide, match, locale) {
  let score = log.degats_pv ?? 0;
  if (log.sensei_interception) score += 40;
  if (log.item_smoke_save) score += 25;
  if (log.altruiste_sacrifice) score += 20;
  if (log.critique) score += 15;
  return {
    score,
    tour: log.tour,
    label: summarizeLogAction(log, locale),
    side: isMyAction(log, mySide, match) ? 'mine' : 'opponent',
    tags: [
      log.sensei_interception ? 'interception' : null,
      log.item_smoke_save ? 'smoke' : null,
      log.critique ? 'crit' : null,
      (log.degats_pv ?? 0) >= 30 ? 'heavy' : null,
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
  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 404;
    throw error;
  }
  const subscription = await getActiveEliteSubscription(userId, pool);
  if (!subscription) {
    const error = new Error('Pack Élite requis.');
    error.statusCode = 403;
    throw error;
  }
  return { pool, subscription };
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
  const possession = combatLog.possession || {};
  const myPossessionPct =
    mySide === 'home' ? possession.homePct : mySide === 'away' ? possession.awayPct : null;

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
        mine: myPossessionPct,
        opponent: myPossessionPct != null ? 100 - myPossessionPct : null,
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
    },
    timeline: mySide ? buildTimeline(logs, mySide, match, lang) : [],
    techniqueBreakdown,
    decisiveMoments: mySide ? buildDecisiveMoments(logs, mySide, match, lang) : [],
    equipment: combatLog.equipmentSummary || [],
  };

  return report;
}

export function buildCompositionAdvice(myComposition, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const beats = COMPOSITION_BEATS[myComposition];
  const beatenBy = Object.entries(COMPOSITION_BEATS).find(([, v]) => v === myComposition)?.[0];

  const tips = [];
  if (myComposition === 'equilibre') {
    tips.push(
      lang === 'en'
        ? 'Balanced squad — no triangle bonus, but flexible against all comps.'
        : 'Escouade équilibrée — pas de bonus triangle, mais polyvalente.'
    );
  } else {
    if (beats) {
      tips.push(
        lang === 'en'
          ? `Your comp pressures ${compositionLabel(beats, lang)}.`
          : `Votre compo fait pression sur ${compositionLabel(beats, lang)}.`
      );
    }
    if (beatenBy) {
      tips.push(
        lang === 'en'
          ? `Watch out vs ${compositionLabel(beatenBy, lang)} — disadvantage in the circle.`
          : `Attention face à ${compositionLabel(beatenBy, lang)} — désavantage dans le cercle.`
      );
    }
  }

  return {
    myComposition,
    label: compositionLabel(myComposition, lang),
    beats: beats ? compositionLabel(beats, lang) : null,
    weakAgainst: beatenBy ? compositionLabel(beatenBy, lang) : null,
    tips,
  };
}

export function compareCompositions(myComp, opponentComp) {
  return {
    myAdvantage: hasCompositionAdvantage(myComp, opponentComp),
    myDisadvantage: hasCompositionDisadvantage(myComp, opponentComp),
    neutral: myComp === 'equilibre' || opponentComp === 'equilibre',
  };
}
