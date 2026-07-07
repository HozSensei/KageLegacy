import { randomInt } from 'node:crypto';
import {
  buildTerrainIntroVars,
  createNarrativeRng,
  getCatalog,
  getPath,
  pickFromPool,
  pickTemplateEntry,
  teamLabel,
} from './narrativeI18n.js';

function groupLogsByTour(logs, endingTour) {
  const byTour = new Map();
  for (const log of logs) {
    if (log.tour > endingTour) continue;
    if (!byTour.has(log.tour)) byTour.set(log.tour, []);
    byTour.get(log.tour).push(log);
  }
  return byTour;
}

function actionSpecForLog(log) {
  if (log.type === 'confusion') {
    return { actionKey: 'combat.actions.confusion', reactionKey: 'combat.reactions.confusion' };
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
  if (technique === 'medecine') {
    return { actionKey: 'combat.actions.medecine', reactionKey: 'combat.reactions.medecine' };
  }
  if (technique === 'genjutsu') {
    if (log.esquive) {
      return { actionKey: 'combat.actions.genjutsu_faineant', reactionKey: null };
    }
    if (log.statut_consequence) {
      return { actionKey: 'combat.actions.genjutsu_success', reactionKey: 'combat.reactions.genjutsu_hit' };
    }
    return { actionKey: 'combat.actions.genjutsu_fail', reactionKey: null };
  }
  if (technique === 'ninjutsu') {
    return { actionKey: 'combat.actions.ninjutsu', reactionKey: 'combat.reactions.ninjutsu' };
  }
  return { actionKey: 'combat.actions.taijutsu', reactionKey: 'combat.reactions.taijutsu' };
}

function logToPart(log, rng) {
  const vars = {
    attaquant_name: log.attaquant_name,
    cible_name: log.cible_name || log.ninja,
    ninja_name: log.ninja_name || log.cible_name || log.ninja,
    sacrificial_name: log.sacrificial_name,
  };
  const spec = actionSpecForLog(log);
  const action = pickFromPool('fr', spec.actionKey, rng, vars);
  const part = {
    action_key: action.key,
    action_index: action.index,
    vars,
  };

  const canReact = Number(log.degats_pv) > 0 && spec.reactionKey;
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

  for (let tour = 1; tour <= endingTour; tour += 1) {
    const tourLogs = byTour.get(tour) || [];
    if (!tourLogs.length) continue;

    const tourRng = rng.fork(10 + tour);
    const parts = tourLogs.map((log) => logToPart(log, tourRng.fork(log.tour * 100)));
    const connector =
      tour === 1
        ? { connector_key: 'chronicle.combatOpen', connector_index: 0 }
        : (() => {
            const t = pickFromPool('fr', 'transitions', tourRng.fork(1));
            return { connector_key: t.key, connector_index: t.index };
          })();

    const tourVars = { ...connector, parts };
    const connectorText =
      connector.connector_key === 'chronicle.combatOpen'
        ? pickTemplateEntry('fr', 'chronicle.combatOpen', 0)
        : pickTemplateEntry('fr', connector.connector_key, connector.connector_index);
    const body = parts
      .map((part) => {
        const action = pickTemplateEntry('fr', part.action_key, part.action_index, part.vars);
        if (!part.reaction_key) return action;
        const reaction = pickTemplateEntry('fr', part.reaction_key, part.reaction_index, part.vars);
        return `${action} ${reaction}`;
      })
      .join(' ');

    unlockAt += randomGapMinutes(tourRng);
    if (unlockAt > 55) unlockAt = 55;

    segments.push({
      segment_order: order++,
      block_type: 'action',
      unlock_minutes: unlockAt,
      template_key: 'chronicle.tour',
      template_index: tour,
      template_vars: tourVars,
      text: `${connectorText} ${body}`.trim(),
    });
  }

  const winnerSide = winner === 'home' || winner === 'away' ? winner : 'draw';
  const denouementKey =
    winnerSide === 'draw' ? 'chronicle.denouement.draw' : endReason === 'ko' ? 'chronicle.denouement.ko' : 'chronicle.denouement.points';
  const denouementVars =
    winnerSide === 'draw'
      ? { home_sensei: homeSensei, away_sensei: awaySensei }
      : {
          winner_sensei: winnerSide === 'home' ? homeSensei : awaySensei,
          loser_sensei: winnerSide === 'home' ? awaySensei : homeSensei,
        };

  const denouementText =
    winnerSide === 'draw'
      ? pickTemplateEntry('fr', denouementKey, 0, {
          home_team: teamLabel('fr', homeSensei),
          away_team: teamLabel('fr', awaySensei),
        })
      : pickTemplateEntry('fr', denouementKey, 0, {
          winner_team: teamLabel('fr', winnerSide === 'home' ? homeSensei : awaySensei),
          loser_team: teamLabel('fr', winnerSide === 'home' ? awaySensei : homeSensei),
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
