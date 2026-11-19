// Simulation only: the seed and live combat never import this module.
export function prototypeCard(card) {
  if (card.statType !== 'ninjutsu' || card.damage <= 0) return card;

  const effects = card.effects || [];
  // A light opener buys cards or chakra rather than competing with a finisher.
  const opener = card.baseCost <= 1 && effects.some(effect =>
    ['draw', 'gain_chakra', 'gain_energy'].includes(effect.type)
  );
  if (opener) return { ...card, damage: Math.max(1, card.damage - 2) };

  // Use original cost for the role so upgrades don't turn a burst into filler.
  const burst = card.baseCost >= 3;
  const cost = Math.max(card.cost, burst ? (card.baseCost >= 4 ? 5 : 4) : 3);
  const multi = effects.some(effect => effect.type === 'multi_strike');
  const canAddCondition = burst && !multi && !effects.some(effect => effect.type === 'bonus_if');
  return {
    ...card,
    cost,
    damage: card.damage + (multi ? 0 : cost > card.cost ? (burst ? 4 : 2) : 0),
    effects: canAddCondition
      ? [...effects, { type: 'bonus_if', condition: 'enemy_vulnerable', value: 3 }]
      : effects,
  };
}
