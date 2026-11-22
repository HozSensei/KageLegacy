/**
 * Carte pédagogique pour le guide d’anatomie (hors catalogue).
 * Le slug réutilise une illustration existante ; les valeurs cumulent
 * dégâts / armure / soins pour illustrer les trois gemmes colorées.
 */
export const CARD_ANATOMY_DEMO = Object.freeze({
  slug: 'poing-rapide',
  nameFr: 'Carte d’exemple',
  nameEn: 'Sample card',
  type: 'attack',
  rarity: 'rare',
  element: 'Katon',
  cost: 2,
  damage: 8,
  block: 4,
  heal: 3,
  statType: 'taijutsu',
  effects: Object.freeze([
    Object.freeze({ type: 'combo_previous', statType: 'ninjutsu', damage: 2 }),
    Object.freeze({ type: 'draw', value: 1 }),
  ]),
  passiveBonus: Object.freeze({ taijutsu: 2 }),
});

/** Étapes du guide — une zone carte à la fois. */
export const CARD_ANATOMY_STEPS = Object.freeze([
  'chakra',
  'figures',
  'effects',
  'identity',
]);
