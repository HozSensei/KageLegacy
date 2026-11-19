/**
 * Libellés d’effet actif pour l’affichage carte (zone texte fixe).
 * Sépare les figures damage/block/heal des mots-clés secondaires.
 */

import { previewCardFigures } from './cardScaling.js';

/** Statuts soutien en % (aligné combat StatusIcon / CombatLog). */
const PCT_STATUS_KEYS = new Set([
  'damage_pct',
  'block_pct',
  'heal_pct',
  'taijutsu_pct',
  'ninjutsu_pct',
  'genjutsu_pct',
]);

function statusLabel(t, te, statusKey) {
  const combatKey = `combat.statuses.${statusKey}`;
  if (te(combatKey)) return t(combatKey);
  const cardsKey = `cards.stats.${statusKey}`;
  if (te(cardsKey)) return t(cardsKey);
  return statusKey;
}

/**
 * Formate un effet structuré en courte phrase (ou null si non affichable / déjà couvert).
 */
export function formatStructuredEffect(effect, { t, te }) {
  if (!effect?.type) return null;
  const type = effect.type;
  const n = Number(effect.value);

  if (type === 'combo_previous') {
    const art = t(`cards.stats.${effect.statType}`, effect.statType);
    const rewards = [];
    const rewardKeys = [
      ['damage', 'cards.effectComboDamage'],
      ['heal', 'cards.effectComboHeal'],
      ['block', 'cards.effectComboBlock'],
      ['statusValue', 'cards.effectComboStatus'],
      ['draw', 'cards.effectDraw'],
      ['chakra', 'cards.effectComboChakra'],
      ['costReduction', 'cards.effectNextCostReduction'],
    ];
    for (const [key, labelKey] of rewardKeys) {
      const value = Number(effect[key]) || 0;
      if (value > 0) rewards.push(t(labelKey, { n: value }));
    }
    if (!rewards.length) return null;
    return t('cards.effectComboPrevious', { art, reward: rewards.join(' · ') });
  }

  if (type === 'apply_status') {
    const status = String(effect.status || '').toLowerCase();
    if (!status) return null;
    const label = statusLabel(t, te, status);
    const amount = Number.isFinite(n) && n !== 0 ? n : 1;
    const signed = amount > 0 ? `+${amount}` : String(amount);
    const isPct = PCT_STATUS_KEYS.has(status);
    if (effect.duration != null && Number(effect.duration) > 0) {
      return t(isPct ? 'cards.effectStatusTimedPct' : 'cards.effectStatusTimed', {
        n: signed,
        status: label,
        turns: Number(effect.duration),
      });
    }
    return t(isPct ? 'cards.effectStatusPct' : 'cards.effectStatus', {
      n: signed,
      status: label,
    });
  }

  if (type === 'draw') {
    const count = Number.isFinite(n) && n > 0 ? n : 1;
    return t('cards.effectDraw', { n: count });
  }

  if (type === 'gain_energy' || type === 'gain_chakra') {
    const amount = Number.isFinite(n) && n !== 0 ? n : 1;
    return t('cards.effectChakra', { n: amount });
  }

  if (type === 'reduce_next_card_cost') {
    const amount = Number.isFinite(n) && n > 0 ? n : 1;
    return t('cards.effectNextCostReduction', { n: amount });
  }

  if (type === 'heal_self' || type === 'gain_block') return null;

  if (type === 'evade_next') {
    const chance = Number(effect.chance);
    const pct = Number.isFinite(chance) ? Math.round(chance * 100) : 0;
    if (pct <= 0) return null;
    return t('cards.effectEvade', { pct });
  }

  if (type === 'counter') {
    const dmg = Number(effect.damage) || 0;
    if (dmg <= 0) return null;
    return t('cards.effectCounter', { n: dmg });
  }

  if (type === 'cleanse_self') {
    return t('cards.effectCleanse');
  }

  if (type === 'aoe') {
    return t('cards.effectAoe');
  }

  if (type === 'exile_enemy_card') {
    return t('cards.effectExile');
  }

  if (type === 'multi_strike') return t('cards.effectMultiStrike', { n: effect.hits });
  if (type === 'bonus_if') return null;
  return null;
}

/**
 * @returns {{ texts: string[], aria: string[], figures: object[] }}
 */
export function cardEffectParts(card, stats, { t, te }) {
  const figures = previewCardFigures(card, stats);
  const texts = [];
  const aria = [];

  for (const entry of figures) {
    const display = stats ? entry.effective : entry.base;
    const figureText = t(`cards.${entry.key}`, { n: display });
    aria.push(
      stats && entry.scaled
        ? t('cards.statEffectiveAria', {
            n: entry.effective,
            base: entry.base,
            stat: t(`cards.stats.${entry.statKey}`, entry.statKey),
          })
        : figureText
    );
  }

  if (card?.heldEffect) {
    const effect = card.heldEffect;
    let held = null;
    if (effect.type === 'evade_percent') {
      held = t('cards.effectHeldEvade', { pct: Number(effect.value) || 0 });
    } else if (effect.type === 'art_damage_percent') {
      held = t('cards.effectHeldArtDamage', {
        pct: Number(effect.value) || 0,
        art: t(`cards.stats.${effect.statType}`, effect.statType),
      });
    } else if (effect.type === 'heal_percent') {
      held = t('cards.effectHeldHeal', { pct: Number(effect.value) || 0 });
    } else if (effect.type === 'starting_block') {
      held = t('cards.effectHeldBlock', { n: Number(effect.value) || 0 });
    } else if (effect.type === 'gain_chakra') {
      held = t('cards.effectHeldChakra', { n: Number(effect.value) || 0 });
    }
    if (held) {
      texts.push(held);
      aria.push(held);
    }
  }

  for (const effect of card?.effects || []) {
    const line = formatStructuredEffect(effect, { t, te });
    if (line) {
      texts.push(line);
      aria.push(line);
    }
  }

  if (card?.exhaust) {
    const exhaust = t('cards.effectExhaust');
    texts.push(exhaust);
    aria.push(exhaust);
  }

  const critChance = Number(card?.critChance) || 0;
  if (critChance > 0) {
    const crit = te('cards.effectCrit')
      ? t('cards.effectCrit', { pct: critChance })
      : `Critique ${critChance} %`;
    texts.push(crit);
    aria.push(crit);
  }

  return { texts, aria, figures };
}

export function cardEffectLine(card, stats, i18n) {
  return cardEffectParts(card, stats, i18n).texts.join(' · ');
}
