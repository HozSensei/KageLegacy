import { randomInt } from 'node:crypto';

function roll(max) {
  return randomInt(max);
}

function activeFighters(team) {
  return team.fighters.filter((f) => !f.ko && f.pv > 0 && f.chakra > 0);
}

function efficacyFromStat(statValue, effectParams = {}) {
  const threshold = Number(effectParams.statThreshold ?? 10);
  const scale = Number(effectParams.statScale ?? 0.08);
  const base = Number(effectParams.basePct ?? effectParams.base ?? 0.5);
  const raw = base + (Number(statValue) - threshold) * scale;
  return Math.max(0.25, Math.min(1, raw));
}

function resolveTargets(targetKind, ctx) {
  const { bearer, attackerTeam, defenderTeam, attacker, defender, allies } = ctx;

  switch (targetKind) {
    case 'self':
      return [bearer];
    case 'ally_lowest_pv':
      return [
        allies
          .filter((a) => !a.ko && a.id !== bearer.id)
          .sort((a, b) => a.pv / a.maxPv - b.pv / b.maxPv)[0],
      ].filter(Boolean);
    case 'all_allies':
      return activeFighters(attackerTeam);
    case 'enemy_defender':
      return defender ? [defender] : [];
    case 'enemy_attacker':
      return attacker ? [attacker] : [];
    case 'all_enemies_active':
      return activeFighters(defenderTeam);
    default:
      return [];
  }
}

function evaluateTrigger(triggerKind, triggerParams, ctx) {
  const { bearer, tourTargetCounts, allies, technique, genjutsuSucceeded } = ctx;
  const threshold = Number(triggerParams.threshold ?? 50);

  switch (triggerKind) {
    case 'targeted_twice_same_tour': {
      const minHits = Number(triggerParams.minHits ?? 2);
      return (tourTargetCounts[bearer.id] || 0) >= minHits;
    }
    case 'ally_below_pv_pct': {
      const ally = allies
        .filter((a) => !a.ko && a.id !== bearer.id)
        .sort((a, b) => a.pv / a.maxPv - b.pv / b.maxPv)[0];
      return ally ? ally.pv / ally.maxPv < threshold / 100 : false;
    }
    case 'all_allies_below_pv_pct':
      return (
        activeFighters(ctx.attackerTeam).length > 0 &&
        activeFighters(ctx.attackerTeam).every((f) => f.pv / f.maxPv < threshold / 100)
      );
    case 'self_below_pv_pct':
      return bearer.pv / bearer.maxPv < threshold / 100;
    case 'on_attack':
      return bearer.id === ctx.attacker?.id && technique?.type !== 'medecine';
    case 'on_defend_against_attack':
      return bearer.id === ctx.defender?.id && technique?.type !== 'medecine';
    case 'on_genjutsu_success':
      return bearer.id === ctx.attacker?.id && genjutsuSucceeded === true;
    default:
      return false;
  }
}

function applyEffect(effectKind, effectParams, targets, bearer, statValue) {
  const efficacy = efficacyFromStat(statValue, effectParams);
  const outcome = { pvDamage: 0, damageReductionPct: 0, healed: 0, status: null, log: {} };

  switch (effectKind) {
    case 'damage_reduction_pct': {
      const pct = Math.min(
        0.85,
        (Number(effectParams.basePct ?? 0.3) + Number(effectParams.statScale ?? 0.04) * statValue) *
          efficacy
      );
      outcome.damageReductionPct = pct;
      break;
    }
    case 'heal_flat': {
      const amount = Math.floor(
        (Number(effectParams.base ?? 10) + Number(effectParams.statScale ?? 1) * statValue) * efficacy
      );
      for (const target of targets) {
        const before = target.pv;
        target.pv = Math.min(target.maxPv, target.pv + amount);
        outcome.healed += target.pv - before;
      }
      break;
    }
    case 'heal_pct_max': {
      const pct =
        (Number(effectParams.basePct ?? 0.1) + Number(effectParams.statScale ?? 0.01) * statValue) *
        efficacy;
      for (const target of targets) {
        const amount = Math.max(4, Math.floor(target.maxPv * pct));
        const before = target.pv;
        target.pv = Math.min(target.maxPv, target.pv + amount);
        outcome.healed += target.pv - before;
      }
      break;
    }
    case 'bonus_damage': {
      outcome.pvDamage = Math.max(
        2,
        Math.floor((Number(effectParams.base ?? 5) + Number(effectParams.statScale ?? 0.7) * statValue) * efficacy)
      );
      break;
    }
    case 'paralysis':
      if (statValue >= Number(effectParams.statThreshold ?? 8) || roll(100) < 35 + statValue * 3) {
        outcome.status = 'paralysis';
      }
      break;
    case 'confusion':
      if (statValue >= Number(effectParams.statThreshold ?? 7) || roll(100) < 30 + statValue * 3) {
        outcome.status = 'confusion';
      }
      break;
    default:
      break;
  }

  outcome.efficacy = Math.round(efficacy * 100);
  outcome.targets = targets.map((t) => t.name);
  return outcome;
}

/**
 * Tente de déclencher la carte tactique d'un porteur.
 * Retourne null si pas de proc. Consomme 1 charge uniquement en cas de succès.
 */
export function tryTriggerTacticCard(bearer, ctx) {
  const card = bearer.tacticCard;
  if (!card || bearer.tacticCardUsedThisMatch) return null;

  const statValue = bearer.stats[card.stat_type] ?? 0;
  const allies = activeFighters(ctx.attackerTeam);

  const triggerCtx = { ...ctx, bearer, allies };
  if (!evaluateTrigger(card.trigger_kind, card.trigger_params, triggerCtx)) {
    return null;
  }

  const targets = resolveTargets(card.target_kind, triggerCtx);
  if (!targets.length && !['damage_reduction_pct'].includes(card.effect_kind)) {
    return null;
  }

  const effect = applyEffect(card.effect_kind, card.effect_params, targets, bearer, statValue);

  for (const target of targets) {
    if (effect.pvDamage > 0) {
      target.pv = Math.max(0, target.pv - effect.pvDamage);
    }
    if (effect.status) {
      target.status = effect.status;
    }
  }

  bearer.tacticCardUsedThisMatch = true;
  card.charges_remaining = Math.max(0, Number(card.charges_remaining) - 1);
  const deleted = card.charges_remaining <= 0;
  if (deleted) {
    card.depleted = true;
  }

  return {
    slug: card.slug,
    narrativeKey: card.narrative_key,
    nameFr: card.name_fr,
    nameEn: card.name_en,
    cardType: card.card_type,
    efficacy: effect.efficacy,
    healed: effect.healed,
    pvDamage: effect.pvDamage,
    damageReductionPct: effect.damageReductionPct,
    status: effect.status,
    targets: effect.targets,
    chargesRemaining: card.charges_remaining,
    deleted,
    userTacticCardId: card.user_tactic_card_id,
  };
}

export function initTacticCardOnFighter(fighter, cardRow) {
  if (!cardRow) return fighter;
  fighter.tacticCard = {
    user_tactic_card_id: cardRow.user_tactic_card_id,
    charges_remaining: cardRow.charges_remaining,
    slug: cardRow.slug,
    name_fr: cardRow.name_fr,
    name_en: cardRow.name_en,
    card_type: cardRow.card_type,
    stat_type: cardRow.stat_type,
    element_affinity: cardRow.element_affinity,
    trigger_kind: cardRow.trigger_kind,
    trigger_params:
      typeof cardRow.trigger_params === 'string'
        ? JSON.parse(cardRow.trigger_params)
        : cardRow.trigger_params,
    target_kind: cardRow.target_kind,
    target_params:
      typeof cardRow.target_params === 'string'
        ? JSON.parse(cardRow.target_params)
        : cardRow.target_params,
    effect_kind: cardRow.effect_kind,
    effect_params:
      typeof cardRow.effect_params === 'string'
        ? JSON.parse(cardRow.effect_params)
        : cardRow.effect_params,
    narrative_key: cardRow.narrative_key,
  };
  fighter.tacticCardUsedThisMatch = false;
  fighter.tacticCardEventLog = [];
  return fighter;
}

export function recordTacticCardEvent(fighter, event) {
  if (!fighter.tacticCardEventLog) fighter.tacticCardEventLog = [];
  fighter.tacticCardEventLog.push(event);
}
