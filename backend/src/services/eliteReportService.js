import {
  COMPOSITION_BEATS,
  compositionLabel,
  detectSquadComposition,
  getCompositionProfile,
  hasCompositionAdvantage,
  hasCompositionDisadvantage,
} from './combat/compositionMeta.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { assertActiveEliteSubscription } from './eliteSubscriptionService.js';
import { loadMatchRow, assertViewerCanAccessMatch, isMatchParticipant } from './matchSpectatorService.js';

const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];

const TECHNIQUE_ICONS = {
  Taijutsu: 'tai',
  Ninjutsu: 'nin',
  Genjutsu: 'gen',
  Medecine: 'med',
  confusion: 'conf',
  skip: 'skip',
  item_event: 'item',
};

/**
 * Ancre dans /rules pour le cercle Assaut / Mur / Flux.
 */
export const ELITE_RULES_COMPOSITION_ANCHOR = 'compositions-d-equipe-meta';

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

function findCircleCounter(comp) {
  return Object.entries(COMPOSITION_BEATS).find(([, beaten]) => beaten === comp)?.[0] ?? null;
}

function describeSpecializedArchetype(comp, lang) {
  const profile = getCompositionProfile(comp);
  if (comp === 'assaut') {
    return lang === 'en'
      ? 'Pure Assault runs three Offensive orders — burst damage and constant pressure.'
      : 'L\'Assaut pur aligne trois consignes Offensive — burst et pression continue.';
  }
  if (comp === 'mur') {
    const reduction = Math.round((1 - profile.damageTaken) * 100);
    return lang === 'en'
      ? `Pure Wall runs three Tank orders — about ${reduction}% less damage taken and stronger defensive targeting.`
      : `Le Mur pur aligne trois consignes Tank — environ ${reduction} % de dégâts en moins et ciblage défensif renforcé.`;
  }
  if (comp === 'flux') {
    return lang === 'en'
      ? 'Pure Flow runs three Protect orders — healing, genjutsu bias, and gradual wear-down.'
      : 'Le Flux pur aligne trois consignes Protect — soins, genjutsu et usure progressive.';
  }
  return null;
}

function describeEquilibrePenalty(lang) {
  return lang === 'en'
    ? 'Your balanced squad stays outside the tactical circle: no matchup bonus, while a pure opponent unlocks its archetype passives.'
    : 'Votre escouade équilibrée reste hors du cercle tactique : aucun bonus de matchup, alors qu\'une compo pure active ses passifs d\'archétype.';
}

function buildOrderAlignmentAdvice(myComposition, orderCounts, lang) {
  if (!orderCounts || myComposition !== 'equilibre') return null;

  const { Offensive = 0, Tank = 0, Protect = 0, Normal = 0 } = orderCounts;
  const mixed = [Offensive, Tank, Protect, Normal].filter((n) => n > 0).length;
  if (mixed < 2) return null;

  return lang === 'en'
    ? `Your orders are split (${Offensive} Off · ${Tank} Tank · ${Protect} Protect${Normal ? ` · ${Normal} Normal` : ''}) — the engine reads this as balanced. To enter the circle, set two or more ninjas to the same consigne before locking the operation.`
    : `Vos consignes sont réparties (${Offensive} Off · ${Tank} Tank · ${Protect} Protect${Normal ? ` · ${Normal} Normal` : ''}) — le moteur lit cela comme équilibré. Pour entrer dans le cercle, alignez au moins deux ninjas sur la même consigne avant de verrouiller l'opération.`;
}

function buildCircleCommitAdvice(opponentComposition, lang) {
  const counter = findCircleCounter(opponentComposition);
  if (!counter) return null;

  return lang === 'en'
    ? `In the tactical circle, ${compositionLabel(counter, lang)} beats ${compositionLabel(opponentComposition, lang)}. Try aligning ${counter === 'assaut' ? 'two Offensive orders' : counter === 'mur' ? 'two Tank orders' : 'two Protect orders'} before the next operation.`
    : `Dans le cercle tactique, ${compositionLabel(counter, lang)} bat ${compositionLabel(opponentComposition, lang)}. Essayez d'aligner ${counter === 'assaut' ? 'deux consignes Offensive' : counter === 'mur' ? 'deux consignes Tank' : 'deux consignes Protect'} avant la prochaine opération.`;
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
  return assertActiveEliteSubscription(userId);
}

function emptyElementMap() {
  return Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
}

function buildElementHeatmap(logs, mySide, match) {
  if (!mySide) return null;

  const mine = { dealt: emptyElementMap(), taken: emptyElementMap() };
  const opponent = { dealt: emptyElementMap(), taken: emptyElementMap() };
  const circle = { mineAdvantage: 0, mineDisadvantage: 0, opponentAdvantage: 0, opponentDisadvantage: 0 };
  let hasElementData = false;

  for (const log of logs) {
    const dmg = log.degats_pv ?? 0;
    if (!dmg || !log.attaquant_element) continue;

    hasElementData = true;
    const mineAtk = isMyAction(log, mySide, match);
    const atkEl = log.attaquant_element;
    const defEl = log.cible_element;
    const bucket = mineAtk ? mine : opponent;
    const recv = mineAtk ? opponent : mine;

    bucket.dealt[atkEl] = (bucket.dealt[atkEl] || 0) + dmg;
    if (defEl) recv.taken[defEl] = (recv.taken[defEl] || 0) + dmg;

    if (log.element_effect === 'advantage') {
      if (mineAtk) circle.mineAdvantage += 1;
      else circle.opponentAdvantage += 1;
    } else if (log.element_effect === 'disadvantage') {
      if (mineAtk) circle.mineDisadvantage += 1;
      else circle.opponentDisadvantage += 1;
    }
  }

  if (!hasElementData) return null;

  return { elements: ELEMENTS, mine, opponent, circle };
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
    elementHeatmap: buildElementHeatmap(logs, mySide, match),
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

/**
 * Synthèse lisible d'une simulation de matchup (outils Élite).
 */
export function buildSimulationVerdict({
  winPct,
  matchup,
  myComposition,
  opponentComposition,
  locale = 'fr',
  squadContext = null,
}) {
  const lang = normalizeLocale(locale);
  const myLabel = compositionLabel(myComposition, lang);
  const oppLabel = compositionLabel(opponentComposition, lang);
  const factors = [];
  const advice = [];

  if (matchup.myAdvantage) {
    factors.push(
      lang === 'en'
        ? `Your ${myLabel} has circle advantage over ${oppLabel} (+damage / less damage taken).`
        : `Votre ${myLabel} a l'avantage du cercle face à ${oppLabel} (+dégâts / moins de dégâts subis).`
    );
  } else if (matchup.myDisadvantage) {
    factors.push(
      lang === 'en'
        ? `${oppLabel} counters your ${myLabel} in the composition circle.`
        : `${oppLabel} contrecarre votre ${myLabel} dans le cercle des compositions.`
    );
    const counter = findCircleCounter(opponentComposition);
    if (counter === myComposition) {
      advice.push(
        lang === 'en'
          ? `You already play ${myLabel}, which is the circle answer — if you still lose, raise combat stats, morale, or form before the operation lock.`
          : `Vous jouez déjà ${myLabel}, la réponse du cercle — si vous perdez quand même, renforcez stats de combat, moral ou forme avant le verrouillage.`
      );
    } else {
      const circleTip = buildCircleCommitAdvice(opponentComposition, lang);
      if (circleTip) advice.push(circleTip);
    }
  } else if (myComposition === 'equilibre' && opponentComposition !== 'equilibre') {
    factors.push(describeEquilibrePenalty(lang));
    const archetype = describeSpecializedArchetype(opponentComposition, lang);
    if (archetype) factors.push(archetype);

    const alignTip = buildOrderAlignmentAdvice(myComposition, squadContext?.orderCounts, lang);
    if (alignTip) advice.push(alignTip);

    const circleTip = buildCircleCommitAdvice(opponentComposition, lang);
    if (circleTip) advice.push(circleTip);

    if (winPct <= 42) {
      advice.push(
        lang === 'en'
          ? 'Staying balanced trades matchup power for flexibility — against pure comps at equal stats, the specialist usually edges out.'
          : 'Rester équilibré échange la puissance de matchup contre la polyvalence — à stats égales, la compo spécialisée prend souvent l\'avantage.'
      );
    }
  } else {
    factors.push(
      lang === 'en'
        ? 'No composition circle bonus (balanced squad or neutral pairing).'
        : 'Pas de bonus de cercle (escouade équilibrée ou duel neutre).'
    );
  }

  factors.push(
    lang === 'en'
      ? `Reference opponent: same level, pure ${oppLabel} roles — not a real player roster.`
      : `Adversaire de référence : même niveau, rôles purs ${oppLabel} — pas un vrai roster adverse.`
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
        ? 'Trend is positive — keep training your focus stat and lock orders that preserve this matchup.'
        : 'La tendance est bonne — continuez l\'entraînement sur votre stat focus et verrouillez des consignes qui préservent ce matchup.'
    );
  } else if (winPct <= 42) {
    tone = 'unfavorable';
    headline = lang === 'en' ? 'Tough matchup' : 'Matchup difficile';
  } else {
    headline = lang === 'en' ? 'Close matchup' : 'Match serré';
    advice.push(
      lang === 'en'
        ? 'Small changes (one consigne swap, one training cycle, or morale recovery) can flip this trend.'
        : 'De petits ajustements (une consigne, un cycle d\'entraînement ou du moral) peuvent renverser la tendance.'
    );
  }

  if (matchup.myAdvantage && winPct < 45) {
    factors.push(
      lang === 'en'
        ? 'Despite circle advantage, your squad stats or morale trail this reference opponent.'
        : "Malgré l'avantage de cercle, vos stats ou le moral restent en retrait face à cette référence."
    );
    advice.push(
      lang === 'en'
        ? 'The circle helps, but raw power still matters — prioritize training on your weakest combat stat.'
        : 'Le cercle aide, mais la puissance brute compte — priorisez l\'entraînement sur votre stat de combat la plus faible.'
    );
  } else if (matchup.myDisadvantage && winPct > 55) {
    factors.push(
      lang === 'en'
        ? 'Your raw stats compensate for the composition disadvantage.'
        : 'Vos stats brutes compensent le désavantage de composition.'
    );
  }

  if (!advice.length && tone === 'unfavorable') {
    advice.push(
      lang === 'en'
        ? 'Review combat orders and training ROI in the panel above, then re-run the simulator.'
        : 'Revoyez les consignes de combat et le ROI entraînement ci-dessus, puis relancez la simulation.'
    );
  }

  return {
    tone,
    headline,
    factors,
    advice,
    myLabel,
    oppLabel,
    rulesAnchor: ELITE_RULES_COMPOSITION_ANCHOR,
  };
}
