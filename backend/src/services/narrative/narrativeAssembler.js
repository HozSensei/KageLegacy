import { randomInt } from 'node:crypto';
import {
  buildTerrainIntroVars,
  buildPliImpactLog,
  createNarrativeRng,
  formatPliImpactDetail,
  getCatalog,
  getPath,
  parseCardLabel,
  pickFromPool,
  pickTemplateEntry,
  teamLabel,
} from './narrativeI18n.js';
import { plisMetrics, isPliLog } from '../combat/pli/combatLogMetrics.js';

function isPliCombatLog(logs) {
  return (logs || []).some((log) => isPliLog(log));
}

function buildSidePlayPart(side, log, sensei, rng) {
  const isHome = side === 'home';
  const label = isHome ? log.carte_home : log.carte_away;
  const parsed = parseCardLabel(label);
  const domain = (isHome ? log.technique_type_home : log.technique_type_away) || '—';
  const relais = isHome ? log.relais_home : log.relais_away;
  const proxy = isHome ? log.proxy_home : log.proxy_away;
  const ownerKo = isHome ? log.owner_ko_home : log.owner_ko_away;
  const padding = isHome ? log.relais_padding_home : log.relais_padding_away;
  const ownerFallback =
    ownerKo || parsed.owner || (isHome ? 'un coéquipier' : 'un coéquipier');

  let poolKey = 'chronicle.pli.play';
  const vars = {
    sensei,
    actor: parsed.owner || proxy || '—',
    card_name: parsed.cardName,
    domain,
    owner: ownerFallback,
  };

  if (relais && proxy) {
    vars.actor = proxy;
    if (padding || parsed.kind === 'relais_padding') {
      if (parsed.owner && parsed.owner !== 'Escouade') {
        poolKey = 'chronicle.pli.play_relais_no_technique';
        vars.owner = parsed.owner;
        if (proxy === parsed.owner) {
          vars.actor = parsed.owner;
        }
      } else {
        poolKey = 'chronicle.pli.play_relais_escouade';
      }
    } else {
      poolKey = 'chronicle.pli.play_relais';
      vars.card_name = parsed.kind === 'technique' ? parsed.cardName : 'Relais';
      vars.owner = ownerKo || parsed.owner || 'un coéquipier';
    }
  }

  let pick;
  if (
    poolKey === 'chronicle.pli.play_relais_no_technique' &&
    parsed.owner &&
    proxy === parsed.owner
  ) {
    pick = { key: poolKey, index: 1 };
  } else {
    pick = pickFromPool('fr', poolKey, rng, vars);
  }
  return { action_key: pick.key, action_index: pick.index, vars };
}

function buildPliParts(log, homeSensei, awaySensei, rng) {
  const impactLog = buildPliImpactLog(log);
  const baseVars = {
    pli_num: log.pli || log.tour,
    home_sensei: homeSensei,
    away_sensei: awaySensei,
    impact_log: impactLog,
    impact_detail: formatPliImpactDetail(impactLog, 'fr'),
  };
  const parts = [];

  const header = pickFromPool('fr', 'chronicle.pli.header', rng, baseVars);
  parts.push({
    action_key: header.key,
    action_index: header.index,
    vars: baseVars,
  });

  parts.push(buildSidePlayPart('home', log, homeSensei, rng.fork(2)));
  parts.push(buildSidePlayPart('away', log, awaySensei, rng.fork(3)));

  const winnerSensei =
    log.pli_winner === 'home' ? homeSensei : log.pli_winner === 'away' ? awaySensei : null;
  const outcomeKey = winnerSensei ? 'chronicle.pli.outcome_win' : 'chronicle.pli.outcome_draw';
  const outcomeVars = {
    ...baseVars,
    winner_team: winnerSensei ? teamLabel('fr', winnerSensei) : '',
    sensei: winnerSensei,
  };
  const outcome = pickFromPool('fr', outcomeKey, rng.fork(4), outcomeVars);
  parts.push({ action_key: outcome.key, action_index: outcome.index, vars: outcomeVars });

  return parts;
}

function renderPliParts(parts) {
  return parts
    .map((part) => pickTemplateEntry('fr', part.action_key, part.action_index, part.vars))
    .join('\n');
}

function assemblePliNarrativeSegments({
  logs,
  endingTour,
  homeSensei,
  awaySensei,
  rng,
  orderStart,
  unlockAtStart,
}) {
  const pliLogs = logs
    .filter((log) => isPliLog(log) && log.tour <= endingTour)
    .sort((a, b) => (a.pli || a.tour) - (b.pli || b.tour));

  const segments = [];
  let order = orderStart;
  let unlockAt = unlockAtStart;

  unlockAt = 2;
  const combatOpenText = pickTemplateEntry('fr', 'chronicle.pli.combatOpen', 0, {
    total_plis: endingTour,
  });
  segments.push({
    segment_order: order++,
    block_type: 'action',
    unlock_minutes: unlockAt,
    template_key: 'chronicle.pli.combatOpen',
    template_index: 0,
    template_vars: { total_plis: endingTour },
    text: combatOpenText,
  });

  for (const log of pliLogs) {
    const pliNum = log.pli || log.tour;
    const tourRng = rng.fork(10 + pliNum);
    const parts = buildPliParts(log, homeSensei, awaySensei, tourRng.fork(1));
    const body = renderPliParts(parts);

    unlockAt += randomGapMinutes(tourRng);
    if (unlockAt > 55) unlockAt = 55;

    segments.push({
      segment_order: order++,
      block_type: 'action',
      unlock_minutes: unlockAt,
      template_key: 'chronicle.pli',
      template_index: pliNum,
      template_vars: {
        pli_num: pliNum,
        home_sensei: homeSensei,
        away_sensei: awaySensei,
        impact_log: buildPliImpactLog(log),
        parts,
      },
      text: body,
    });
  }

  return { segments, order, unlockAt };
}

function groupLogsByTour(logs, endingTour) {
  const byTour = new Map();
  for (const log of logs) {
    if (log.tour > endingTour) continue;
    if (!byTour.has(log.tour)) byTour.set(log.tour, []);
    byTour.get(log.tour).push(log);
  }
  return byTour;
}

function impactLabel(degats, esquive) {
  if (esquive) return 'esquivé';
  const d = Number(degats) || 0;
  if (d <= 0) return 'sans effet notable';
  if (d <= 4) return 'coups légers';
  if (d <= 9) return 'frappe nette';
  return 'impact violent';
}

function sortLogsForNarrative(logs) {
  const rank = (log) => {
    if (log.type === 'pli' || log.type === 'relais' || log.type === 'element') return 1;
    if (log.technique_type || log.type === 'confusion' || log.type === 'skip') return 1;
    if (log.sensei_interception || log.item_smoke_save || log.type === 'item_event') return 2;
    if (log.type === 'tactic_card' && log.card_type === 'defense') return 3;
    if (log.type === 'tactic_card' && log.card_type === 'attack') return 4;
    if (log.type === 'tactic_card') return 5;
    return 6;
  };
  return [...logs].sort((a, b) => rank(a) - rank(b));
}

function tourDamageBySide(tourLogs) {
  let home = 0;
  let away = 0;
  for (const log of tourLogs) {
    const homeDmg = Number(log.degats_pv) || 0;
    const awayDmg = Number(log.degats_pv_away) || 0;
    if (log.pli_winner === 'home') {
      home += homeDmg + awayDmg;
    } else if (log.pli_winner === 'away') {
      away += homeDmg + awayDmg;
    } else if (log.egallite) {
      home += homeDmg;
      away += awayDmg;
    } else if (log.equipe_attaque === 'home') {
      home += homeDmg || Number(log.card_damage) || 0;
    } else if (log.equipe_attaque === 'away') {
      away += homeDmg || Number(log.card_damage) || 0;
    }
  }
  return { home, away };
}

function pickTourBridge(tour, endingTour, advantage, rng, avoidIndex) {
  const phase =
    tour <= Math.max(2, Math.floor(endingTour * 0.35))
      ? 'early'
      : tour >= Math.ceil(endingTour * 0.75)
        ? 'late'
        : 'mid';
  const poolKey =
    advantage === 'home'
      ? 'chronicle.tourBridge.home_push'
      : advantage === 'away'
        ? 'chronicle.tourBridge.away_push'
        : `chronicle.tourBridge.${phase}`;
  const pool = getPath(getCatalog('fr'), poolKey);
  if (!Array.isArray(pool) || !pool.length) {
    return { connector_key: 'chronicle.combatOpen', connector_index: 0, text: '' };
  }
  let index = rng.nextInt(pool.length);
  if (pool.length > 1 && index === avoidIndex) {
    index = (index + 1) % pool.length;
  }
  return { connector_key: poolKey, connector_index: index, text: pool[index] };
}

function buildTourMomentum(tourLogs, homeSensei, awaySensei, rng) {
  const { home, away } = tourDamageBySide(tourLogs);
  const margin = 3;
  let poolKey = 'chronicle.tourMomentum.even';
  const vars = { home_sensei: homeSensei, away_sensei: awaySensei, sensei: homeSensei };
  if (home > away + margin) {
    poolKey = 'chronicle.tourMomentum.home';
    vars.sensei = homeSensei;
  } else if (away > home + margin) {
    poolKey = 'chronicle.tourMomentum.away';
    vars.sensei = awaySensei;
  }
  const pick = pickFromPool('fr', poolKey, rng, vars);
  return { ...pick, key: poolKey, sensei: vars.sensei };
}

function pliWinnerTechnique(log) {
  if (log.pli_winner === 'away') {
    return (log.technique_type_away || log.technique_type || '').toLowerCase();
  }
  if (log.pli_winner === 'home') {
    return (log.technique_type_home || log.technique_type || '').toLowerCase();
  }
  return (log.technique_type_home || log.technique_type_away || log.technique_type || '').toLowerCase();
}

function actionSpecForLog(log) {
  if (log.type === 'relais') {
    return { actionKey: 'combat.actions.pli.relais', reactionKey: null };
  }
  if (log.type === 'element') {
    return { actionKey: 'combat.actions.pli.element', reactionKey: null };
  }
  if (log.type === 'pli') {
    const technique = pliWinnerTechnique(log);
    const damage = Number(log.degats_pv) || Number(log.degats_pv_away) || 0;
    if (technique === 'médecine' || technique === 'medecine') {
      return { actionKey: 'combat.actions.pli.medecine', reactionKey: null };
    }
    if (technique === 'genjutsu') {
      return { actionKey: 'combat.actions.pli.genjutsu', reactionKey: null };
    }
    if (technique === 'ninjutsu') {
      return {
        actionKey: 'combat.actions.pli.ninjutsu',
        reactionKey: damage >= 6 ? 'combat.reactions.ninjutsu_short' : null,
      };
    }
    if (technique === 'taijutsu') {
      return {
        actionKey: 'combat.actions.pli.taijutsu',
        reactionKey: damage >= 6 ? 'combat.reactions.taijutsu_short' : null,
      };
    }
    return { actionKey: 'combat.actions.pli.reveal', reactionKey: null };
  }

  if (log.type === 'confusion') {
    return { actionKey: 'combat.actions.confusion', reactionKey: null };
  }
  if (log.type === 'tactic_card') {
    const key = log.card_narrative_key || 'card_generic';
    return { actionKey: `combat.actions.tactic_card.${key}`, reactionKey: null };
  }
  if (log.sensei_interception) {
    return { actionKey: 'combat.actions.sensei_interception', reactionKey: null };
  }
  if (log.item_smoke_save) {
    return { actionKey: 'combat.actions.item_smoke', reactionKey: null };
  }
  if (log.egoiste_insubordination && log.technique_type) {
    return { actionKey: 'combat.actions.egoiste', reactionKey: 'combat.reactions.egoiste' };
  }
  if (log.type === 'item_event') {
    const map = {
      item_rupture_scroll: ['rupture', 'combat.actions.item_rupture', 'combat.reactions.item_events.rupture'],
      item_decoy: ['decoy', 'combat.actions.item_decoy', 'combat.reactions.item_events.decoy'],
      item_heal: ['heal', 'combat.actions.item_heal', 'combat.reactions.item_events.heal'],
      item_chakra: ['chakra', 'combat.actions.item_chakra', 'combat.reactions.item_events.chakra'],
    };
    const entry = map[log.item_event];
    if (entry) {
      return { actionKey: entry[1], reactionKey: entry[2] };
    }
  }
  if (log.altruiste_sacrifice && log.sacrificial_name) {
    return { actionKey: 'combat.actions.altruiste', reactionKey: 'combat.reactions.altruiste' };
  }

  const technique = (log.technique_type || '').toLowerCase();
  const damage = Number(log.degats_pv) || 0;

  if (technique === 'medecine') {
    return { actionKey: 'combat.actions.strike.medecine', reactionKey: null };
  }
  if (technique === 'genjutsu') {
    if (log.esquive) {
      return { actionKey: 'combat.actions.genjutsu_faineant', reactionKey: null };
    }
    if (log.statut_consequence) {
      return { actionKey: 'combat.actions.strike.genjutsu_success', reactionKey: null };
    }
    return { actionKey: 'combat.actions.strike.genjutsu_fail', reactionKey: null };
  }
  if (technique === 'ninjutsu') {
    return {
      actionKey: 'combat.actions.strike.ninjutsu',
      reactionKey: damage >= 6 ? 'combat.reactions.ninjutsu_short' : null,
    };
  }
  if (technique === 'taijutsu') {
    return {
      actionKey: 'combat.actions.strike.taijutsu',
      reactionKey: damage >= 6 ? 'combat.reactions.taijutsu_short' : null,
    };
  }
  return { actionKey: 'combat.actions.strike.taijutsu', reactionKey: null };
}

function logToPart(log, rng) {
  if (log.type === 'skip') {
    return null;
  }
  const vars = {
    attaquant_name: log.attaquant_name || log.proxy_name || log.relais_name,
    cible_name: log.cible_name || log.cible_name_away || log.ninja,
    ninja_name: log.ninja_name || log.cible_name || log.ninja,
    sacrificial_name: log.sacrificial_name,
    card_targets: (log.card_targets || []).join(', '),
    card_healed: log.card_healed || 0,
    card_damage: log.card_damage || 0,
    carte_home: log.carte_home || '—',
    carte_away: log.carte_away || '—',
    pli_winner: log.pli_winner || 'draw',
    degats_pv: Number(log.degats_pv) || 0,
    soins_pv: Number(log.soins_pv) || 0,
    impact_label: impactLabel(log.degats_pv, log.esquive),
  };
  const spec = actionSpecForLog(log);
  const action = pickFromPool('fr', spec.actionKey, rng, vars);
  const part = {
    action_key: action.key,
    action_index: action.index,
    vars,
  };

  const canReact = Number(log.degats_pv) >= 6 && spec.reactionKey;
  if (canReact) {
    const reaction = pickFromPool('fr', spec.reactionKey, rng, vars);
    part.reaction_key = reaction.key;
    part.reaction_index = reaction.index;
  }

  return part;
}

function randomGapMinutes(rng) {
  return 2 + rng.nextInt(7);
}

function buildKoSentence(koNinjaIds, homeSensei, awaySensei) {
  if (!koNinjaIds?.length) {
    return 'Aucun ninja n\'a été mis hors combat.';
  }
  const names = koNinjaIds.map((k) => k.name).join(', ');
  const homeKo = koNinjaIds.filter((k) => k.side === 'home').length;
  const awayKo = koNinjaIds.filter((k) => k.side === 'away').length;
  if (homeKo && !awayKo) {
    return `Mis hors combat du côté de ${homeSensei} : ${names}.`;
  }
  if (awayKo && !homeKo) {
    return `Mis hors combat du côté de ${awaySensei} : ${names}.`;
  }
  return `Mis hors combat : ${names}.`;
}

function buildScoreSummary(combatLog, winnerSide, homeSensei, awaySensei) {
  const homeScore = Number(combatLog.homeScorePct ?? 0);
  const awayScore = Number(combatLog.awayScorePct ?? 0);
  const plis = plisMetrics(combatLog);
  const homePoss = plis.homePct;
  const awayPoss = plis.awayPct;
  const winnerScore = winnerSide === 'home' ? homeScore : awayScore;
  const loserScore = winnerSide === 'home' ? awayScore : homeScore;
  const winnerPoss = winnerSide === 'home' ? homePoss : awayPoss;
  const loserPoss = winnerSide === 'home' ? awayPoss : homePoss;
  return {
    home_score_pct: homeScore,
    away_score_pct: awayScore,
    home_possession_pct: homePoss,
    away_possession_pct: awayPoss,
    home_plis_won: plis.homePlis,
    away_plis_won: plis.awayPlis,
    winner_score_pct: winnerScore,
    loser_score_pct: loserScore,
    winner_possession_pct: winnerPoss,
    loser_possession_pct: loserPoss,
    ko_sentence: buildKoSentence(combatLog.koNinjaIds, homeSensei, awaySensei),
  };
}

/**
 * Convertit le résultat M5 en segments narratifs + timeline de déverrouillage.
 */
export function assembleNarrative({
  matchId,
  homeSensei,
  awaySensei,
  homeNinjas,
  awayNinjas,
  combatLog,
  winner,
  endReason,
  endingTour,
  environmentSlug,
}) {
  const rng = createNarrativeRng(matchId, 0);
  const logs = combatLog.logs || [];
  const byTour = groupLogsByTour(logs, endingTour);

  const homeNames = homeNinjas.map((n) => n.name).join(', ');
  const awayNames = awayNinjas.map((n) => n.name).join(', ');
  const terrainVars = buildTerrainIntroVars(environmentSlug, rng.fork(1));
  const introVars = {
    ...terrainVars,
    home_sensei: homeSensei,
    away_sensei: awaySensei,
    home_names: homeNames,
    away_names: awayNames,
  };
  const introText = pickTemplateEntry('fr', 'chronicle.intro', 0, {
    terrain_setting: pickTemplateEntry('fr', 'terrains', introVars.terrain_index),
    terrain_atmosphere:
      getPath(getCatalog('fr'), `environment.${environmentSlug}`)?.atmosphere || '',
    home_team: teamLabel('fr', homeSensei),
    away_team: teamLabel('fr', awaySensei),
    home_names: homeNames,
    away_names: awayNames,
  });

  const segments = [];
  let order = 0;
  let unlockAt = 0;

  segments.push({
    segment_order: order++,
    block_type: 'intro',
    unlock_minutes: unlockAt,
    template_key: 'chronicle.intro',
    template_index: 0,
    template_vars: introVars,
    text: introText,
  });

  const tensionTransition = pickFromPool('fr', 'transitions', rng.fork(2));
  unlockAt = 2;
  segments.push({
    segment_order: order++,
    block_type: 'tension',
    unlock_minutes: unlockAt,
    template_key: 'chronicle.tension',
    template_index: 0,
    template_vars: {
      transition_key: tensionTransition.key,
      transition_index: tensionTransition.index,
    },
    text: pickTemplateEntry('fr', 'chronicle.tension', 0, { transition: tensionTransition.text }),
  });

  if (isPliCombatLog(logs)) {
    const pliResult = assemblePliNarrativeSegments({
      logs,
      endingTour,
      homeSensei,
      awaySensei,
      rng,
      orderStart: order,
      unlockAtStart: unlockAt,
    });
    segments.push(...pliResult.segments);
    order = pliResult.order;
    unlockAt = pliResult.unlockAt;
  } else {
    let lastBridgeIndex = -1;

    for (let tour = 1; tour <= endingTour; tour += 1) {
      const tourLogs = sortLogsForNarrative(byTour.get(tour) || []);
      if (!tourLogs.length) continue;

      const tourRng = rng.fork(10 + tour);
      const parts = tourLogs
        .map((log, index) => logToPart(log, tourRng.fork(index + 1)))
        .filter(Boolean);
      const tourDamage = tourDamageBySide(tourLogs);

      let advantage = 'even';
      if (tourDamage.home > tourDamage.away + 3) advantage = 'home';
      else if (tourDamage.away > tourDamage.home + 3) advantage = 'away';

      const connector =
        tour === 1
          ? { connector_key: 'chronicle.combatOpen', connector_index: 0 }
          : pickTourBridge(tour, endingTour, advantage, tourRng.fork(1), lastBridgeIndex);

      if (connector.connector_index != null) {
        lastBridgeIndex = connector.connector_index;
      }

      const momentum = buildTourMomentum(tourLogs, homeSensei, awaySensei, tourRng.fork(2));
      const tourVars = {
        home_sensei: homeSensei,
        away_sensei: awaySensei,
        connector_key: connector.connector_key,
        connector_index: connector.connector_index,
        momentum_key: momentum.key,
        momentum_index: momentum.index,
        momentum_sensei: momentum.sensei,
        parts,
      };

      const connectorText =
        connector.connector_key === 'chronicle.combatOpen'
          ? pickTemplateEntry('fr', 'chronicle.combatOpen', 0)
          : pickTemplateEntry('fr', connector.connector_key, connector.connector_index, {
              home_sensei: homeSensei,
              away_sensei: awaySensei,
            });

      const body = parts
        .map((part) => {
          const action = pickTemplateEntry('fr', part.action_key, part.action_index, part.vars);
          if (!part.reaction_key) return action;
          const reaction = pickTemplateEntry('fr', part.reaction_key, part.reaction_index, part.vars);
          return `${action} ${reaction}`;
        })
        .join(' ');

      const momentumText = pickTemplateEntry('fr', momentum.key, momentum.index, {
        sensei: momentum.sensei,
        home_sensei: homeSensei,
        away_sensei: awaySensei,
      });

      unlockAt += randomGapMinutes(tourRng);
      if (unlockAt > 55) unlockAt = 55;

      segments.push({
        segment_order: order++,
        block_type: 'action',
        unlock_minutes: unlockAt,
        template_key: 'chronicle.tour',
        template_index: tour,
        template_vars: tourVars,
        text: `${connectorText} ${body} ${momentumText}`.trim(),
      });
    }
  }

  const winnerSide = winner === 'home' || winner === 'away' ? winner : 'draw';
  const denouementKey =
    winnerSide === 'draw'
      ? 'chronicle.denouement.draw'
      : endReason === 'ko'
        ? 'chronicle.denouement.ko'
        : 'chronicle.denouement.points';

  const scoreSummary =
    winnerSide === 'draw'
      ? {
          home_score_pct: Number(combatLog.homeScorePct ?? 0),
          away_score_pct: Number(combatLog.awayScorePct ?? 0),
          ...(() => {
            const p = plisMetrics(combatLog);
            return {
              home_possession_pct: p.homePct,
              away_possession_pct: p.awayPct,
              home_plis_won: p.homePlis,
              away_plis_won: p.awayPlis,
            };
          })(),
          ko_sentence: buildKoSentence(combatLog.koNinjaIds, homeSensei, awaySensei),
        }
      : buildScoreSummary(combatLog, winnerSide, homeSensei, awaySensei);

  const denouementVars =
    winnerSide === 'draw'
      ? { home_sensei: homeSensei, away_sensei: awaySensei, ...scoreSummary, ending_tour: endingTour }
      : {
          winner_sensei: winnerSide === 'home' ? homeSensei : awaySensei,
          loser_sensei: winnerSide === 'home' ? awaySensei : homeSensei,
          ending_tour: endingTour,
          ...scoreSummary,
        };

  const denouementText =
    winnerSide === 'draw'
      ? pickTemplateEntry('fr', denouementKey, 0, {
          home_team: teamLabel('fr', homeSensei),
          away_team: teamLabel('fr', awaySensei),
          ...scoreSummary,
          ending_tour: endingTour,
        })
      : pickTemplateEntry('fr', denouementKey, 0, {
          winner_team: teamLabel('fr', winnerSide === 'home' ? homeSensei : awaySensei),
          loser_team: teamLabel('fr', winnerSide === 'home' ? awaySensei : homeSensei),
          ending_tour: endingTour,
          ...scoreSummary,
        });

  unlockAt = Math.min(60, unlockAt + randomInt(4));
  segments.push({
    segment_order: order++,
    block_type: 'denouement',
    unlock_minutes: unlockAt,
    template_key: denouementKey,
    template_index: 0,
    template_vars: denouementVars,
    text: denouementText,
  });

  if (endingTour < 12) {
    const epilogue = pickFromPool('fr', 'chronicle.epilogue', rng.fork(99));
    unlockAt = Math.min(60, unlockAt + 1 + randomInt(3));
    segments.push({
      segment_order: order++,
      block_type: 'epilogue',
      unlock_minutes: unlockAt,
      template_key: 'chronicle.epilogue',
      template_index: epilogue.index,
      template_vars: null,
      text: epilogue.text,
    });
  }

  return { segments, endingRevealMinutes: unlockAt };
}
