import { assertDispensaryHealEligible } from './dispensaryService.js';
import { clampStatToGradeCap } from './gradeProgression.js';
import { computeMatchPv, clampStat } from './ninjaStats.js';

export const BUREAU_REASON = {
  OK: null,
  NO_CYCLE: 'noCycle',
  SCOUT_ALREADY_CONFIRMED: 'scoutAlreadyConfirmed',
  HOSPITAL_CLOSED: 'hospitalClosed',
  NOT_LAMENTABLE: 'notLamentable',
  GRAVE_INJURY_LOCK: 'graveInjuryLock',
  FORME_MAX: 'formeMax',
  PV_FULL: 'pvFull',
  MORAL_MAX: 'moralMax',
  STATS_MAX: 'statsMax',
  USE_BUREAU_PANEL: 'useBureauPanel',
  UNSUPPORTED_ITEM: 'unsupportedItem',
  ITEM_LISTED: 'itemListed',
};

const FORME_UPGRADE = {
  Lamentable: 'Passable',
  Passable: 'Excellent',
  Excellent: 'Divin',
  Divin: 'Divin',
};

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

const REASON_MESSAGES = {
  [BUREAU_REASON.NO_CYCLE]: 'Cycle introuvable.',
  [BUREAU_REASON.SCOUT_ALREADY_CONFIRMED]:
    'Le secteur est déjà confirmé pour ce cycle — la carte n\'a aucun effet supplémentaire.',
  [BUREAU_REASON.HOSPITAL_CLOSED]: 'L\'hôpital est fermé pendant l\'opération (à partir de H71).',
  [BUREAU_REASON.NOT_LAMENTABLE]: 'Seuls les ninjas en forme Lamentable peuvent être soignés.',
  [BUREAU_REASON.GRAVE_INJURY_LOCK]:
    'Ce ninja est sous surveillance médicale prolongée (blessure grave de mission).',
  [BUREAU_REASON.FORME_MAX]: 'La forme de ce ninja est déjà au maximum.',
  [BUREAU_REASON.PV_FULL]: 'Les PV de ce ninja sont déjà au maximum.',
  [BUREAU_REASON.MORAL_MAX]: 'Le moral de ce ninja est déjà au maximum.',
  [BUREAU_REASON.STATS_MAX]: 'Toutes les stats de ce ninja sont déjà au plafond de grade.',
  [BUREAU_REASON.USE_BUREAU_PANEL]: 'Utilisez cet objet depuis le Bureau, pas l\'inventaire.',
  [BUREAU_REASON.UNSUPPORTED_ITEM]: 'Type d\'objet bureau non géré.',
  [BUREAU_REASON.ITEM_LISTED]: 'Retirez l\'objet de la vente avant de l\'utiliser.',
};

export function resolveBureauTrigger(item, bureau) {
  if (item.slug === 'kit-materiel-medical' && bureau.trigger === 'forme_upgrade') {
    return 'dispensary_heal';
  }
  return bureau.trigger;
}

function ineligible(reasonCode) {
  return {
    eligible: false,
    reasonCode,
    reason: REASON_MESSAGES[reasonCode] || 'Utilisation impossible.',
  };
}

function eligible() {
  return { eligible: true, reasonCode: null, reason: null };
}

function cycleTimesEqual(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function hasStatGainRoom(ninja) {
  return STAT_KEYS.some((stat) => {
    const current = Number(ninja[stat]);
    const next = clampStatToGradeCap(ninja, stat, current + 0.5);
    return next > current;
  });
}

export function evaluateBureauItemEligibility({
  item,
  bureau,
  ninja = null,
  context = {},
}) {
  if (item?.isListed) {
    return ineligible(BUREAU_REASON.ITEM_LISTED);
  }

  if (!bureau?.trigger) {
    return ineligible(BUREAU_REASON.UNSUPPORTED_ITEM);
  }

  const trigger = resolveBureauTrigger(item, bureau);

  switch (trigger) {
    case 'scout_map': {
      if (!context.cycleStartAt) return ineligible(BUREAU_REASON.NO_CYCLE);
      if (cycleTimesEqual(context.scoutEnvConfirmedCycle, context.cycleStartAt)) {
        return ineligible(BUREAU_REASON.SCOUT_ALREADY_CONFIRMED);
      }
      return eligible();
    }
    case 'chakra_seal':
      return ineligible(BUREAU_REASON.USE_BUREAU_PANEL);
    case 'dispensary_heal': {
      if (context.tacticsLocked) return ineligible(BUREAU_REASON.HOSPITAL_CLOSED);
      try {
        assertDispensaryHealEligible(ninja);
        return eligible();
      } catch (error) {
        if (error.message.includes('Lamentable')) {
          return ineligible(BUREAU_REASON.NOT_LAMENTABLE);
        }
        if (error.message.includes('surveillance')) {
          return ineligible(BUREAU_REASON.GRAVE_INJURY_LOCK);
        }
        return ineligible(BUREAU_REASON.UNSUPPORTED_ITEM);
      }
    }
    case 'forme_upgrade': {
      if (Number(ninja.forme_lock_cycles) > 0) {
        return ineligible(BUREAU_REASON.GRAVE_INJURY_LOCK);
      }
      const next = FORME_UPGRADE[ninja.weekly_forme] || ninja.weekly_forme;
      if (next === ninja.weekly_forme) return ineligible(BUREAU_REASON.FORME_MAX);
      return eligible();
    }
    case 'strategy_book':
    case 'injury_discount':
      return eligible();
    case 'pv_heal_pct': {
      const maxPv = computeMatchPv(ninja.taijutsu);
      if (Number(ninja.current_pv_match) >= maxPv) return ineligible(BUREAU_REASON.PV_FULL);
      return eligible();
    }
    case 'jutsu_scroll': {
      if (!hasStatGainRoom(ninja)) return ineligible(BUREAU_REASON.STATS_MAX);
      return eligible();
    }
    case 'moral_boost': {
      const amount = bureau.amount || 3;
      const next = clampStat(Math.min(20, Number(ninja.moral) + amount));
      if (next === Number(ninja.moral)) return ineligible(BUREAU_REASON.MORAL_MAX);
      return eligible();
    }
    default:
      return ineligible(BUREAU_REASON.UNSUPPORTED_ITEM);
  }
}

export function assertBureauItemEligible(params) {
  const result = evaluateBureauItemEligibility(params);
  if (!result.eligible) {
    const error = new Error(result.reason);
    error.statusCode = 400;
    error.reasonCode = result.reasonCode;
    throw error;
  }
  return result;
}

export function buildBureauEligibilityMatrix({ items, ninjas, context }) {
  const bureauItems = items.filter((item) => item.category === 'bureau' && !item.isListed);
  const globalBureauEligibility = {};

  for (const item of bureauItems) {
    const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
    const bureau = effects?.bureau;
    const trigger = bureau ? resolveBureauTrigger(item, bureau) : null;
    if (trigger === 'scout_map' || trigger === 'chakra_seal') {
      globalBureauEligibility[item.id] = evaluateBureauItemEligibility({
        item,
        bureau,
        context,
      });
    }
  }

  const ninjasWithEligibility = ninjas.map((ninja) => {
    const bureauEligibility = {};
    for (const item of bureauItems) {
      const effects = typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects;
      const bureau = effects?.bureau;
      const trigger = bureau ? resolveBureauTrigger(item, bureau) : null;
      if (trigger === 'scout_map' || trigger === 'chakra_seal') continue;
      bureauEligibility[item.id] = evaluateBureauItemEligibility({
        item,
        bureau,
        ninja,
        context,
      });
    }
    return { ...ninja, bureauEligibility };
  });

  return { ninjas: ninjasWithEligibility, globalBureauEligibility };
}
