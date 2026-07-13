import { statBaseValue } from './power.js';

function triggerOf(cardDef) {
  return cardDef?.triggerKind ?? cardDef?.trigger_kind ?? 'pli_play';
}

function effectOf(cardDef) {
  return cardDef?.effectKind ?? cardDef?.effect_kind ?? 'pli_power';
}

function paramsOf(cardDef) {
  const raw = cardDef?.effectParams ?? cardDef?.effect_params ?? {};
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function scaledBonus(fighter, params) {
  let bonus = Number(params.flat ?? 0);
  const stat = params.scaleStat ?? params.scale_stat;
  if (stat && fighter) {
    bonus += Math.floor(statBaseValue(fighter, stat) / Number(params.scaleDiv ?? params.scale_div ?? 10));
  }
  return Math.max(0, bonus);
}

/** Modificateur de puissance au moment du pli (trigger pli_play). */
export function applyPlayPowerBonus(power, fighter, cardDef) {
  if (!cardDef || !fighter) return power;
  if (triggerOf(cardDef) !== 'pli_play') return power;

  const effect = effectOf(cardDef);
  const params = paramsOf(cardDef);

  if (effect === 'pli_power') {
    const mult = Number(params.mult ?? 1);
    if (mult > 1) return Math.floor(power * mult);
  }
  if (effect === 'power_flat') {
    return power + scaledBonus(fighter, params);
  }
  return power;
}

/** Réduction des dégâts subis (trigger pli_lose) — carte du perdant du pli. */
export function applyLoseDamageReduction(damage, cardDef) {
  if (!cardDef || damage <= 0) return damage;
  if (triggerOf(cardDef) !== 'pli_lose') return damage;
  if (effectOf(cardDef) !== 'damage_reduction_pct') return damage;

  const pct = Number(paramsOf(cardDef).pct ?? 0);
  if (pct <= 0) return damage;
  return Math.max(1, Math.floor(damage * (1 - pct)));
}

/** Dégâts bonus après victoire au pli (trigger pli_win). */
export function computeWinBonusDamage(fighter, cardDef) {
  if (!cardDef || !fighter) return 0;
  if (triggerOf(cardDef) !== 'pli_win') return 0;
  if (effectOf(cardDef) !== 'bonus_damage') return 0;
  return scaledBonus(fighter, paramsOf(cardDef));
}

/** Soin bonus sur victoire médecine (trigger pli_win + heal_bonus). */
export function computeHealBonus(fighter, cardDef, baseHeal) {
  if (!cardDef || !fighter) return baseHeal;
  if (triggerOf(cardDef) !== 'pli_win') return baseHeal;
  if (effectOf(cardDef) !== 'heal_bonus') return baseHeal;
  return baseHeal + scaledBonus(fighter, paramsOf(cardDef));
}

/** Soin sur égalité (trigger pli_draw). */
export function computeDrawHeal(fighter, cardDef) {
  if (!cardDef || !fighter) return 0;
  if (triggerOf(cardDef) !== 'pli_draw') return 0;
  if (effectOf(cardDef) !== 'heal_flat') return 0;
  return scaledBonus(fighter, paramsOf(cardDef));
}

/** Modificateurs de pli suivant (trigger pli_win). */
export function applyWinPliMods(cardDef, winnerSide, state) {
  if (!cardDef || !winnerSide) return;
  if (triggerOf(cardDef) !== 'pli_win') return;

  const effect = effectOf(cardDef);
  const params = paramsOf(cardDef);
  const mult = Number(params.mult ?? 1);

  if (effect === 'next_pli_mod' && mult > 0) {
    if (winnerSide === 'home') state.pendingHomeMod = mult;
    else state.pendingAwayMod = mult;
  }
  if (effect === 'opp_next_pli_mod' && mult > 0) {
    if (winnerSide === 'home') state.pendingAwayMod = mult;
    else state.pendingHomeMod = mult;
  }
}

export function cardDefForCombat(card) {
  if (!card) return null;
  return {
    ...card,
    stat_type: card.statType ?? card.stat_type,
    pli_secondary_stat: card.pliSecondaryStat ?? card.pli_secondary_stat,
    pli_bonus_pct: card.pliBonusPct ?? card.pli_bonus_pct,
    trigger_kind: card.triggerKind ?? card.trigger_kind,
    trigger_params: card.triggerParams ?? card.trigger_params,
    effect_kind: card.effectKind ?? card.effect_kind,
    effect_params: card.effectParams ?? card.effect_params,
  };
}
