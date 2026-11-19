const RESOURCE_EFFECTS = new Set(['draw', 'gain_chakra', 'gain_energy']);
const ACTIVE_STATS = [
  ['cost', 'baseCost'],
  ['damage', 'baseDamage'],
  ['block', 'baseBlock'],
  ['heal', 'baseHeal'],
];

function replaceEffect(effects, original, replacement) {
  return effects.map(effect => (effect === original ? { ...effect, ...replacement } : effect));
}

function balanceNinjutsu(card, effects, baseCost) {
  // Même calibrage que scripts/data/cardBalancePrototype.js, sans dépendance au seed.
  if (baseCost <= 1 && effects.some(effect => RESOURCE_EFFECTS.has(effect.type))) {
    return { combatRole: 'opener', damage: Math.max(1, card.damage - 2) };
  }

  // Le coût catalogue fixe le rôle même si une amélioration réduit le coût résolu.
  const burst = baseCost >= 3;
  const cost = Math.max(card.cost, baseCost >= 4 ? 5 : burst ? 4 : 3);
  const multi = effects.some(effect => effect.type === 'multi_strike');
  const canAddCondition = burst && !multi && !effects.some(effect => effect.type === 'bonus_if');
  return {
    combatRole: burst ? 'burst' : 'pressure',
    cost,
    // Le moteur traite damage par frappe : ne pas multiplier la compensation.
    damage: card.damage + (!multi && cost > card.cost ? (burst ? 4 : 2) : 0),
    effects: canAddCondition
      ? [...effects, { type: 'bonus_if', condition: 'enemy_vulnerable', value: 3 }]
      : effects,
  };
}

function balanceTaijutsu(card, effects, baseCost) {
  const counter = effects.find(effect => effect.type === 'counter' && effect.damage > 0);
  if (counter) {
    const result = { combatRole: 'riposte' };
    if (card.block > 0 && card.damage === 0 && baseCost >= 1 && baseCost <= 2) {
      result.effects = replaceEffect(effects, counter, { damage: Number(counter.damage) + 2 });
    }
    return result;
  }
  if (card.damage > 0 && effects.some(effect => effect.type === 'multi_strike')) {
    return { combatRole: 'multi_strike' };
  }

  // Renforce le chaînage au même art, pas le rendement à vide des frappes légères.
  const chain = effects.find(
    effect =>
      effect.type === 'combo_previous' && effect.statType === 'taijutsu' && effect.damage > 0,
  );
  if (card.damage > 0 && baseCost === 1 && chain) {
    return {
      combatRole: 'combo_strike',
      effects: replaceEffect(effects, chain, { damage: Number(chain.damage) + 1 }),
    };
  }
  return {};
}

function balanceGenjutsu(card, effects, baseCost) {
  const evade = effects.find(effect => effect.type === 'evade_next');
  const debuff = effects.find(
    effect =>
      effect.type === 'apply_status' &&
      effect.target !== 'self' &&
      ['weak', 'vulnerable'].includes(effect.status),
  );
  const control =
    debuff || effects.some(effect => ['seal_intent', 'exile_enemy_card'].includes(effect.type));
  const result = { combatRole: evade ? 'evasion' : control ? 'control' : undefined };

  // Retouches réservées aux cartes défensives simples, sans empiler esquive et malus.
  const active = effects.filter(effect => effect.type !== 'combo_previous');
  if (card.damage !== 0 || baseCost !== 1 || active.length !== 1) return result;
  if (evade && [0.35, 0.4].includes(Number(evade.chance))) {
    result.effects = replaceEffect(effects, evade, {
      chance: Number(evade.chance) === 0.35 ? 0.4 : 0.45,
    });
  } else if (debuff?.status === 'weak' && Number(debuff.duration ?? debuff.value ?? 1) === 1) {
    // Faiblesse est un multiplicateur fixe dans le moteur ; ajuster sa durée, pas sa valeur.
    result.effects = replaceEffect(effects, debuff, { duration: 2 });
  }
  return result;
}

function balanceMedicine(card, effects, baseCost) {
  if (effects.some(effect => effect.type === 'cleanse_self')) {
    const result = { combatRole: 'triage' };
    if (card.heal > 0 && baseCost >= 1 && baseCost <= 2) result.heal = card.heal + 2;
    return result;
  }
  if (effects.some(effect => effect.type === 'apply_status' && effect.status === 'regen')) {
    return { combatRole: 'sustain' };
  }
  if (card.heal > 0 || effects.some(effect => ['heal', 'heal_self'].includes(effect.type))) {
    return { combatRole: 'heal' };
  }
  return {};
}

function fallbackRole(card, effects) {
  if (card.damage > 0)
    return effects.some(effect => effect.type === 'bonus_if') ? 'finisher' : 'strike';
  if (card.block > 0 || effects.some(effect => effect.type === 'gain_block')) return 'guard';
  if (effects.some(effect => RESOURCE_EFFECTS.has(effect.type))) return 'setup';
  return 'utility';
}

/**
 * Projection solo uniquement : appeler une fois, après résolution des améliorations et avant
 * de construire les instances de deck. Pur, sans DB ; les champs non modifiés sont partagés.
 * Les champs base* restent ceux du catalogue. En combat, afficher cost/damage/block/heal/effects
 * (damage est par frappe), pas les champs base* ni les descriptions du catalogue en repli.
 * Une description null indique que seules les données structurées font foi pour l'affichage.
 */
export function applySoloCardBalance(card) {
  const effects = card.effects ?? [];
  const baseCost = card.baseCost ?? card.cost;
  let patch = {};
  if (card.slug?.startsWith('clan-')) patch = { combatRole: 'heritage' };
  else if (card.type === 'summon' || card.summon) patch = { combatRole: 'summon' };
  else if (card.type === 'item') patch = { combatRole: 'consumable' };
  else if (card.statType === 'ninjutsu' && card.damage > 0)
    patch = balanceNinjutsu(card, effects, baseCost);
  else if (card.statType === 'taijutsu') patch = balanceTaijutsu(card, effects, baseCost);
  else if (card.statType === 'genjutsu') patch = balanceGenjutsu(card, effects, baseCost);
  else if (card.statType === 'medicine') patch = balanceMedicine(card, effects, baseCost);

  const balanced = {
    ...card,
    ...patch,
    combatRole: patch.combatRole ?? fallbackRole(card, effects),
  };
  const staleText =
    balanced.effects !== card.effects ||
    ACTIVE_STATS.some(
      ([stat, base]) =>
        balanced[stat] !== card[stat] ||
        (card[base] != null && balanced[stat] !== Number(card[base])),
    );
  return staleText ? { ...balanced, descriptionFr: null, descriptionEn: null } : balanced;
}
