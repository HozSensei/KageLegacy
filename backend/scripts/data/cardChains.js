const ARTS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];
const TARGET_PER_ART = 20;

const ART_LABELS = {
  fr: { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medicine: 'Médecine' },
  en: { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medicine: 'Medicine' },
};

const PREVIOUS_ORDER = {
  taijutsu: ['taijutsu', 'genjutsu', 'taijutsu', 'medicine'],
  ninjutsu: ['ninjutsu', 'medicine', 'ninjutsu', 'genjutsu'],
  genjutsu: ['genjutsu', 'taijutsu', 'genjutsu', 'medicine'],
  medicine: ['medicine', 'ninjutsu', 'medicine', 'genjutsu'],
};

function rarityValue(rarity) {
  if (rarity === 'mythic') return 3;
  if (rarity === 'legendary' || rarity === 'rare') return 2;
  return 1;
}

function chainReward(card, previousArt) {
  const crossed = previousArt !== card.statType;
  const value = rarityValue(card.rarity) + (crossed ? 1 : 0);
  if (Number(card.baseDamage ?? card.damage) > 0) return { damage: value };
  if (Number(card.baseHeal ?? card.heal) > 0) return { heal: value };
  if (
    Number(card.baseBlock ?? card.block) > 0 ||
    (card.effects || []).some(effect => effect.type === 'gain_block')
  ) {
    return { block: value };
  }
  if ((card.effects || []).some(effect => effect.type === 'apply_status'))
    return { statusValue: 1 };
  if (card.rarity === 'common') return crossed ? { chakra: 1 } : { draw: 1 };
  return crossed ? { draw: 1 } : { costReduction: 1 };
}

function rewardFr(reward) {
  if (reward.damage) return `${reward.damage} dégâts`;
  if (reward.heal) return `${reward.heal} soins`;
  if (reward.block) return `${reward.block} Armure`;
  if (reward.statusValue) return `+${reward.statusValue} effet`;
  if (reward.draw) return `piochez ${reward.draw} carte`;
  if (reward.chakra) return `${reward.chakra} Chakra`;
  if (reward.costReduction)
    return `la prochaine carte coûte ${reward.costReduction} Chakra de moins`;
  return '';
}

function rewardEn(reward) {
  if (reward.damage) return `${reward.damage} damage`;
  if (reward.heal) return `${reward.heal} healing`;
  if (reward.block) return `${reward.block} Armor`;
  if (reward.statusValue) return `+${reward.statusValue} effect`;
  if (reward.draw) return `draw ${reward.draw} card`;
  if (reward.chakra) return `${reward.chakra} Chakra`;
  if (reward.costReduction) return `the next card costs ${reward.costReduction} less Chakra`;
  return '';
}

function describeChainEffect(effect, locale, card) {
  const art = ART_LABELS[locale][effect.statType];
  const reward = rewardForLocale(effect, locale, card);
  return locale === 'fr' ? `Enchaînement ${art} : ${reward}.` : `Chain ${art}: ${reward}.`;
}

function rewardForLocale(effect, locale, card) {
  const reward = {
    damage: effect.damage,
    heal: effect.heal,
    block: effect.block,
    statusValue: effect.statusValue,
    draw: effect.draw,
    chakra: effect.chakra,
    costReduction: effect.costReduction,
  };
  const text = locale === 'fr' ? rewardFr(reward) : rewardEn(reward);
  if (effect.damage && (card.effects || []).some(item => item.type === 'multi_strike')) {
    return locale === 'fr' ? `${text} par frappe` : `${text} per hit`;
  }
  return text;
}

function normalizeDescriptions(card) {
  const effects = (card.effects || []).filter(effect => effect.type === 'combo_previous');
  if (!effects.length) return card;
  const descriptionFr = String(card.descriptionFr || '')
    .replace(/\s(?:Après|Enchaînement) .+$/i, '')
    .trim();
  const descriptionEn = String(card.descriptionEn || '')
    .replace(/\s(?:After|Chain) .+$/i, '')
    .trim();
  return {
    ...card,
    descriptionFr:
      `${descriptionFr} ${effects.map(effect => describeChainEffect(effect, 'fr', card)).join(' ')}`.trim(),
    descriptionEn:
      `${descriptionEn} ${effects.map(effect => describeChainEffect(effect, 'en', card)).join(' ')}`.trim(),
  };
}

function addChain(card, index) {
  const previousArt = PREVIOUS_ORDER[card.statType][index % 4];
  const reward = chainReward(card, previousArt);
  const effect = {
    type: 'combo_previous',
    statType: previousArt,
    ...reward,
  };
  const prefixFr = `${ART_LABELS.fr[previousArt]} : ${rewardFr(reward)}.`;
  const prefixEn = `${ART_LABELS.en[previousArt]}: ${rewardEn(reward)}.`;
  return {
    ...card,
    effects: [...(card.effects || []), effect],
    descriptionFr: `${card.descriptionFr} Enchaînement ${prefixFr}`,
    descriptionEn: `${card.descriptionEn} Chain ${prefixEn}`,
  };
}

/**
 * Ajoute des effets de chaîne à des cartes déterminées du catalogue.
 * Les cartes déjà dotées d'un combo restent intactes ; le total visé est 80.
 */
export function addCardChains(cards) {
  const result = cards.map(card => ({ ...card, effects: [...(card.effects || [])] }));
  const counts = Object.fromEntries(ARTS.map(art => [art, 0]));
  for (const card of result) {
    if ((card.effects || []).some(effect => effect.type === 'combo_previous'))
      counts[card.statType] += 1;
  }

  for (let index = 0; index < result.length; index += 1) {
    const card = result[index];
    if (!ARTS.includes(card.statType)) continue;
    if ((counts[card.statType] || 0) >= TARGET_PER_ART) continue;
    if ((card.effects || []).some(effect => effect.type === 'combo_previous')) continue;
    result[index] = addChain(card, counts[card.statType]);
    counts[card.statType] += 1;
  }
  return result.map(normalizeDescriptions);
}
