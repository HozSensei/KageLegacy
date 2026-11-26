/**
 * Libellés d’effet actif pour l’affichage carte (zone texte fixe).
 * Sépare les figures damage/block/heal des mots-clés secondaires.
 */

import {
  isDotStatusKey,
  isDurationStackStatusKey,
  previewCardFigures,
  previewDotIntensity,
} from './cardScaling.js';

const COMBO_ARTS = new Set(['taijutsu', 'ninjutsu', 'genjutsu', 'medicine']);

/** Affiche les bonus déclarés, pas un résultat de combat simulé. */
export function activeComboLines(card, previousCardStatType, i18n) {
  if (!COMBO_ARTS.has(previousCardStatType)) return [];
  return (card?.effects || [])
    .filter(effect => effect?.type === 'combo_previous' && effect.statType === previousCardStatType)
    .map(effect => formatStructuredEffect(effect, i18n))
    .filter(Boolean);
}

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

function comboRewardLabels(effect, t) {
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
  return rewards;
}

/**
 * Formate un effet structuré en courte phrase (ou null si non affichable / déjà couvert).
 * @param {object} effect
 * @param {{ t: Function, te?: Function }} i18n
 */
export function formatStructuredEffect(effect, { t, te }) {
  if (!effect?.type) return null;
  const type = effect.type;
  const n = Number(effect.value);

  if (type === 'combo_previous') {
    const art = t(`cards.stats.${effect.statType}`, effect.statType);
    const rewards = comboRewardLabels(effect, t);
    if (!rewards.length) return null;
    const reward = rewards.join(' · ');
    return t('cards.effectComboPrevious', { art, reward });
  }

  if (type === 'apply_status') {
    const status = String(effect.status || '').toLowerCase();
    if (!status) return null;
    const label = statusLabel(t, te, status);
    if (isDotStatusKey(status)) {
      const preview = previewDotIntensity(status, effect._previewStats || null, effect.duration);
      const dmg = preview?.effective ?? preview?.base ?? 0;
      const turns = preview?.duration ?? 1;
      return t('cards.effectDot', { status: label, n: dmg, turns });
    }
    if (isDurationStackStatusKey(status)) {
      const turns =
        effect.duration != null && Number(effect.duration) > 0
          ? Number(effect.duration)
          : Number.isFinite(n) && n > 0
            ? n
            : 1;
      return t('cards.effectStatusFlagTimed', { status: label, turns });
    }
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

  if (type === 'exile_enemy_card') {
    return t('cards.effectExile');
  }

  if (type === 'multi_strike') return t('cards.effectMultiStrike', { n: effect.hits });

  if (type === 'bonus_if' && Number.isFinite(n) && n !== 0) {
    const signed = n > 0 ? `+${n}` : String(n);
    switch (effect.condition) {
      case 'enemy_vulnerable':
        return t('cards.effectBonusIf.enemyVulnerable', { n: signed });
      case 'enemy_weak':
        return t('cards.effectBonusIf.enemyWeak', { n: signed });
      case 'first_card':
        return t('cards.effectBonusIf.firstCard', { n: signed });
      case 'previous_card_stat_type':
        if (!COMBO_ARTS.has(effect.statType)) return null;
        return t('cards.effectBonusIf.previousCardStatType', {
          n: signed,
          art: t(`cards.stats.${effect.statType}`, effect.statType),
        });
    }
  }
  return null;
}

function pushLine(texts, aria, text, extra = {}) {
  if (!text) return;
  texts.push({ text, kind: 'normal', active: false, art: null, ...extra });
  aria.push(text);
}

function summonEffectLines(card, { t, te }) {
  const summon = card?.summon;
  if (!summon || card?.type !== 'summon') return [];
  const parts = [];
  const hp = Number(summon.hp);
  if (Number.isFinite(hp) && hp > 0) {
    parts.push(t('cards.summonHp', { n: hp }));
  }
  const attack = Number(summon.attack);
  if (Number.isFinite(attack) && attack > 0) {
    parts.push(t('cards.summonAttack', { n: attack }));
  }
  const duration = Number(summon.duration);
  if (Number.isFinite(duration) && duration > 0) {
    parts.push(t('cards.summonDuration', { n: duration }));
  }
  for (const ability of summon.abilities || []) {
    const key = String(ability || '').toLowerCase();
    if (!key) continue;
    const i18nKey = `cards.summonAbilities.${key}`;
    parts.push(te(i18nKey) ? t(i18nKey) : key);
  }
  if (!parts.length) return [];
  // Une seule ligne : les sauts multiplient la hauteur et masquent d’autres effets.
  return [{ text: parts.join(' · '), kind: 'summon', active: false, art: null }];
}

/**
 * @param {object} card
 * @param {object|null} stats
 * @param {{ t: Function, te: Function }} i18n
 * @param {{ previousCardStatType?: string|null }} [options]
 * @returns {{ texts: Array<{ text: string, kind: string, active: boolean, art: string|null }>, aria: string[], figures: object[] }}
 */
export function cardEffectParts(card, stats, { t, te }, options = {}) {
  const figures = previewCardFigures(card, stats);
  const texts = [];
  const aria = [];
  const previousCardStatType = options.previousCardStatType ?? null;

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

  for (const line of summonEffectLines(card, { t, te })) {
    texts.push(line);
    aria.push(line.text);
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
    pushLine(texts, aria, held);
  }

  for (const effect of card?.effects || []) {
    const line = formatStructuredEffect(
      isDotStatusKey(effect?.status) ? { ...effect, _previewStats: stats } : effect,
      { t, te }
    );
    if (!line) continue;
    const isCombo = effect.type === 'combo_previous';
    const art = isCombo && COMBO_ARTS.has(effect.statType) ? effect.statType : null;
    const active = Boolean(isCombo && art && art === previousCardStatType);
    texts.push({ text: line, kind: isCombo ? 'combo' : 'normal', active, art });
    aria.push(line);
  }

  if (card?.exhaust) {
    pushLine(texts, aria, t('cards.effectExhaust'));
  }

  const critChance = Number(card?.critChance) || 0;
  if (critChance > 0) {
    const crit = te('cards.effectCrit')
      ? t('cards.effectCrit', { pct: critChance })
      : `Critique ${critChance} %`;
    pushLine(texts, aria, crit);
  }

  return { texts, aria, figures };
}

export function cardEffectLine(card, stats, i18n) {
  return cardEffectParts(card, stats, i18n)
    .texts.map(entry => entry.text)
    .join(' · ');
}
