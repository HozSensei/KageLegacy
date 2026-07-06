import { randomInt } from 'node:crypto';
import {
  ALTRUISTE_SACRIFICE,
  CONFUSION_TEMPLATE,
  fillTemplate,
  GENJUTSU_FAIL,
  GENJUTSU_FAINEANT,
  GENJUTSU_SUCCESS,
  ITEM_CHAKRA,
  ITEM_DECOY,
  ITEM_HEAL,
  ITEM_RUPTURE_SCROLL,
  ITEM_SMOKE_SAVE,
  EGOISTE_INSUBORDINATION,
  MEDECINE_TEMPLATES,
  NINJUTSU_TEMPLATES,
  pick,
  randomGapMinutes,
  SENSEI_INTERCEPTION,
  TAIJUTSU_TEMPLATES,
  TRANSITIONS,
} from './phraseDictionary.js';
import { buildEnvironmentTerrainPhrase } from '../matchEnvironment.js';

function groupLogsByTour(logs, endingTour) {
  const byTour = new Map();
  for (const log of logs) {
    if (log.tour > endingTour) continue;
    if (!byTour.has(log.tour)) byTour.set(log.tour, []);
    byTour.get(log.tour).push(log);
  }
  return byTour;
}

function logToSentence(log) {
  const vars = {
    attaquant_name: log.attaquant_name,
    cible_name: log.cible_name || log.ninja,
    sacrificial_name: log.sacrificial_name,
  };

  if (log.type === 'confusion') {
    return fillTemplate(pick(CONFUSION_TEMPLATE), vars);
  }

  if (log.sensei_interception) {
    return fillTemplate(pick(SENSEI_INTERCEPTION), vars);
  }

  if (log.item_smoke_save) {
    return fillTemplate(pick(ITEM_SMOKE_SAVE), { ninja_name: log.cible_name });
  }

  if (log.egoiste_insubordination && log.technique_type) {
    return fillTemplate(pick(EGOISTE_INSUBORDINATION), {
      attaquant_name: log.attaquant_name,
      cible_name: log.cible_name,
    });
  }

  if (log.type === 'item_event') {
    const itemVars = { ninja_name: log.ninja_name };
    const map = {
      item_rupture_scroll: ITEM_RUPTURE_SCROLL,
      item_decoy: ITEM_DECOY,
      item_heal: ITEM_HEAL,
      item_chakra: ITEM_CHAKRA,
    };
    const templates = map[log.item_event];
    if (templates) return fillTemplate(pick(templates), itemVars);
  }

  if (log.altruiste_sacrifice && log.sacrificial_name) {
    return fillTemplate(pick(ALTRUISTE_SACRIFICE), vars);
  }

  const technique = (log.technique_type || '').toLowerCase();

  if (technique === 'medecine') {
    return fillTemplate(pick(MEDECINE_TEMPLATES), vars);
  }

  if (technique === 'genjutsu') {
    if (log.esquive) {
      return fillTemplate(pick(GENJUTSU_FAINEANT), vars);
    }
    if (log.statut_consequence) {
      return fillTemplate(pick(GENJUTSU_SUCCESS), vars);
    }
    return fillTemplate(pick(GENJUTSU_FAIL), vars);
  }

  if (technique === 'ninjutsu') {
    return fillTemplate(pick(NINJUTSU_TEMPLATES), vars);
  }

  return fillTemplate(pick(TAIJUTSU_TEMPLATES), vars);
}

function teamLabel(senseiName) {
  return `l'équipe de ${senseiName}`;
}

function buildIntro(homeSensei, awaySensei, homeNinjas, awayNinjas, environmentSlug) {
  const homeNames = homeNinjas.map((n) => n.name).join(', ');
  const awayNames = awayNinjas.map((n) => n.name).join(', ');
  const terrain = buildEnvironmentTerrainPhrase(environmentSlug);
  return (
    `L'Opération se déroule cette semaine ${terrain}. ` +
    `${teamLabel(homeSensei)} — ${homeNames} — se prépare au contact tandis que ` +
    `${teamLabel(awaySensei)}, avec ${awayNames}, attend le signal dans une posture tendue.`
  );
}

function buildTension() {
  return (
    `${pick(TRANSITIONS)} Dans ce silence lourd, chaque ninja ajuste son équipement ` +
    `et jauge l'adversaire du coin de l'œil, conscient que la moindre erreur coûtera cher.`
  );
}

function buildDenouement(winnerSide, endReason, homeSensei, awaySensei) {
  if (winnerSide === 'draw') {
    return (
      `Ni ${teamLabel(homeSensei)} ni ${teamLabel(awaySensei)} ne parvient à faire plier l'adversaire. ` +
      `Épuisés, les deux camps se retirent sous un cessez-le-feu tacite, ` +
      `chacun pansant ses blessures sur le chemin du retour.`
    );
  }

  const winner = winnerSide === 'home' ? teamLabel(homeSensei) : teamLabel(awaySensei);
  const loser = winnerSide === 'home' ? teamLabel(awaySensei) : teamLabel(homeSensei);

  if (endReason === 'ko') {
    return (
      `La pression constante de ${winner} finit par faire plier l'adversaire. ` +
      `Acculés, les ninjas de ${loser} ne peuvent plus tenir la ligne et s'effondrent un à un. ` +
      `Le retour au camp sera difficile pour les survivants, certains à peine debout.`
    );
  }

  return (
    `Au terme d'un échange acharné, ${winner} conserve l'avantage décisif. ` +
    `Les ninjas de ${loser} sonnent une retraite organisée. ` +
    `Le retour au camp sera l'occasion de soigner les blessures et de tirer les leçons de cette opération.`
  );
}

function buildEpilogue() {
  const fillers = [
    'Les éclaireurs continuent de surveiller les environs pendant que les blessés sont évacués.',
    'La nuit tombe sur le terrain ; les traces du combat seront effacées par la pluie avant l\'aube.',
    'Au loin, un corbeau prend son envol — seul témoin du silence qui suit la bataille.',
  ];
  return pick(fillers);
}

/**
 * Convertit le résultat M5 en segments narratifs + timeline de déverrouillage.
 */
export function assembleNarrative({
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
  const logs = combatLog.logs || [];
  const byTour = groupLogsByTour(logs, endingTour);

  const segments = [];
  let order = 0;
  let unlockAt = 0;

  segments.push({
    segment_order: order++,
    block_type: 'intro',
    unlock_minutes: unlockAt,
    text: buildIntro(homeSensei, awaySensei, homeNinjas, awayNinjas, environmentSlug),
  });

  unlockAt = 2;
  segments.push({
    segment_order: order++,
    block_type: 'tension',
    unlock_minutes: unlockAt,
    text: buildTension(),
  });

  const actionTexts = [];
  for (let tour = 1; tour <= endingTour; tour += 1) {
    const tourLogs = byTour.get(tour) || [];
    if (!tourLogs.length) continue;

    const sentences = tourLogs.map(logToSentence);
    const connector = tour === 1 ? 'Le combat s\'engage soudainement. ' : `${pick(TRANSITIONS)} `;
    actionTexts.push(connector + sentences.join(' '));
  }

  for (const text of actionTexts) {
    unlockAt += randomGapMinutes();
    if (unlockAt > 55) unlockAt = 55;
    segments.push({
      segment_order: order++,
      block_type: 'action',
      unlock_minutes: unlockAt,
      text,
    });
  }

  unlockAt = Math.min(60, unlockAt + randomInt(4));
  segments.push({
    segment_order: order++,
    block_type: 'denouement',
    unlock_minutes: unlockAt,
    text: buildDenouement(winner, endReason, homeSensei, awaySensei),
  });

  if (endingTour < 12) {
    unlockAt = Math.min(60, unlockAt + 1 + randomInt(3));
    segments.push({
      segment_order: order++,
      block_type: 'epilogue',
      unlock_minutes: unlockAt,
      text: buildEpilogue(),
    });
  }

  return { segments, endingRevealMinutes: unlockAt };
}
