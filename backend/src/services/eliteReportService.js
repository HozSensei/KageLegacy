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
        home: possession.homePct ?? null,
        away: possession.awayPct ?? null,
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

export function buildOrdersAdvice(orderCounts, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const tips = [];
  const off = orderCounts?.Offensive ?? 0;
  const tank = orderCounts?.Tank ?? 0;
  const prot = orderCounts?.Protect ?? 0;
  const normal = orderCounts?.Normal ?? 0;

  if (off + tank + prot === 0) {
    tips.push(
      lang === 'en'
        ? 'All Normal orders — attackers are picked at random. Set Offensive / Defensive / Protection roles.'
        : 'Toutes consignes Normal — les attaquants sont tirés au sort. Définissez Offensive / Défensive / Protection.'
    );
  } else {
    if (tank === 0) {
      tips.push(
        lang === 'en'
          ? 'No Defensive order — your line may crumble under focused assault.'
          : 'Aucune consigne Défensive — votre ligne peut céder sous une pression ciblée.'
      );
    }
    if (prot === 0) {
      tips.push(
        lang === 'en'
          ? 'No Protection order — no dedicated healer behavior under 50% HP.'
          : 'Aucune consigne Protection — pas de soin dédié sous 50 % PV.'
      );
    }
    if (off === 0) {
      tips.push(
        lang === 'en'
          ? 'No Offensive — burst damage may be inconsistent.'
          : 'Aucun Offensive — le burst peut manquer de régularité.'
      );
    }
    tips.push(
      lang === 'en'
        ? 'Equip tactic cards on each ninja — they proc when their built-in condition is met.'
        : 'Équipez des cartes tactiques sur chaque ninja — elles se déclenchent selon leur condition.'
    );
  }

  return {
    orderCounts: { Offensive: off, Tank: tank, Protect: prot, Normal: normal },
    label:
      lang === 'en'
        ? `${off} Off · ${tank} Def · ${prot} Prot · ${normal} Normal`
        : `${off} Offensive · ${tank} Défensive · ${prot} Protection · ${normal} Normal`,
    tips,
  };
}

/**
 * Synthèse lisible d'une simulation de matchup (outils Élite).
 */
export function buildSimulationVerdict({
  winPct,
  opponentStyle = 'mixed',
  opponentLevel = 'similar',
  locale = 'fr',
  squadContext = null,
}) {
  const lang = normalizeLocale(locale);
  const styleLabels = {
    fr: { offensive: 'Offensive', tank: 'Défensive', protect: 'Protection', mixed: 'Mixte' },
    en: { offensive: 'Offensive', tank: 'Defensive', protect: 'Protection', mixed: 'Mixed' },
  };
  const oppLabel = styleLabels[lang][opponentStyle] || opponentStyle;
  const factors = [];
  const advice = [];

  factors.push(
    lang === 'en'
      ? `Reference opponent uses ${oppLabel} orders at your power level (${opponentLevel}).`
      : `Adversaire de référence en consignes ${oppLabel}, calibré sur votre puissance (${opponentLevel}).`
  );

  if (squadContext?.orderCounts) {
    const orders = buildOrdersAdvice(squadContext.orderCounts, lang);
    factors.push(
      lang === 'en'
        ? `Your orders: ${orders.label}.`
        : `Vos consignes : ${orders.label}.`
    );
    advice.push(...orders.tips.slice(0, 2));
  }

  if (squadContext?.cardsEquipped != null && squadContext.cardsEquipped < 3) {
    factors.push(
      lang === 'en'
        ? `Only ${squadContext.cardsEquipped}/3 actives have tactic cards equipped.`
        : `Seulement ${squadContext.cardsEquipped}/3 actifs ont une carte tactique équipée.`
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
      ? `Reference opponent: pure ${oppLabel} orders with matching reference cards, ${levelDescriptions[lang][levelKey]} — not a real player roster.`
      : `Adversaire de référence : consignes pures ${oppLabel} avec cartes de référence, ${levelDescriptions.fr[levelKey]} — pas un vrai roster adverse.`
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

  if (winPct <= 42) {
    advice.push(
      lang === 'en'
        ? 'Equip tactic cards on key ninjas and align Defensive/Protection orders to survive this reference style.'
        : 'Équipez des cartes tactiques sur vos ninjas clés et alignez Défensive/Protection pour tenir face à ce style de référence.'
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
    oppLabel,
    rulesAnchor: ELITE_RULES_COMPOSITION_ANCHOR,
  };
}
