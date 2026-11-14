/**
 * Pioche / défausse / shuffle — module pur.
 */
import { MAX_HAND_SIZE } from './constants.js';

/** Fisher–Yates. rng() → [0,1) */
export function shuffle(array, rng = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pioche `count` cartes. Recycle la défausse si besoin.
 * Au-delà de MAX_HAND_SIZE → surplus va en défausse.
 */
export function drawCards(player, count, rng = Math.random) {
  let drawPile = [...(player.drawPile || [])];
  let discardPile = [...(player.discardPile || [])];
  const hand = [...(player.hand || [])];
  const exhaustPile = [...(player.exhaustPile || [])];
  const drawn = [];
  const autoDiscarded = [];

  let remaining = Math.max(0, Number(count) || 0);

  while (remaining > 0) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffle(discardPile, rng);
      discardPile = [];
    }
    const card = drawPile.shift();
    if (!card) break;
    remaining -= 1;

    if (hand.length >= MAX_HAND_SIZE) {
      discardPile.push(card);
      autoDiscarded.push(card.instanceId);
    } else {
      hand.push(card);
      drawn.push(card.instanceId);
    }
  }

  return {
    player: { ...player, drawPile, discardPile, hand, exhaustPile },
    drawn,
    autoDiscarded,
  };
}

export function moveCardFromHand(player, instanceId, destination = 'discard') {
  const hand = [...(player.hand || [])];
  const idx = hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return { player, card: null };

  const [card] = hand.splice(idx, 1);
  const next = { ...player, hand };

  if (destination === 'exhaust') {
    next.exhaustPile = [...(player.exhaustPile || []), card];
  } else if (destination === 'draw') {
    next.drawPile = [...(player.drawPile || []), card];
  } else {
    next.discardPile = [...(player.discardPile || []), card];
  }

  return { player: next, card };
}

/**
 * Construit le runtime deck à partir de cartes sérialisées (cardService).
 * Chaque copie devient une instance avec instanceId unique.
 */
export function buildRuntimeDeck(serializedCards, makeId) {
  const pile = [];
  let n = 0;
  for (const entry of serializedCards || []) {
    const qty = Math.max(1, Number(entry.quantity) || 1);
    const card = entry.card || entry;
    for (let i = 0; i < qty; i += 1) {
      n += 1;
      pile.push({
        instanceId: makeId ? makeId(card, n) : `${card.id || card.slug || 'c'}-${n}`,
        definitionId: card.id ?? null,
        slug: card.slug,
        nameFr: card.nameFr,
        nameEn: card.nameEn,
        type: card.type,
        statType: card.statType,
        element: card.element,
        rarity: card.rarity,
        cost: Number(card.cost) || 0,
        damage: Number(card.damage) || 0,
        block: Number(card.block) || 0,
        heal: Number(card.heal) || 0,
        effects: Array.isArray(card.effects) ? card.effects : [],
        summon: card.summon || null,
        exhaust: Boolean(card.exhaust),
        upgradeLevel: card.upgradeLevel || 0,
        descriptionFr: card.descriptionFr,
        descriptionEn: card.descriptionEn,
      });
    }
  }
  return pile;
}

/** Deck d'entraînement embarqué si aucune carte DB / deck vide. */
export const PRACTICE_DECK_CARDS = [
  {
    id: 'practice-fist',
    slug: 'practice-fist',
    nameFr: 'Poing d\'entraînement',
    nameEn: 'Training Fist',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    cost: 1,
    damage: 6,
    block: 0,
    heal: 0,
    effects: [],
    exhaust: false,
    descriptionFr: 'Inflige 6 dégâts.',
    descriptionEn: 'Deal 6 damage.',
  },
  {
    id: 'practice-strike',
    slug: 'practice-strike',
    nameFr: 'Frappe nette',
    nameEn: 'Clean Strike',
    type: 'attack',
    statType: 'taijutsu',
    element: null,
    rarity: 'common',
    cost: 1,
    damage: 8,
    block: 0,
    heal: 0,
    effects: [],
    exhaust: false,
    descriptionFr: 'Inflige 8 dégâts.',
    descriptionEn: 'Deal 8 damage.',
  },
  {
    id: 'practice-guard',
    slug: 'practice-guard',
    nameFr: 'Garde basse',
    nameEn: 'Low Guard',
    type: 'defense',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    cost: 1,
    damage: 0,
    block: 7,
    heal: 0,
    effects: [],
    exhaust: false,
    descriptionFr: 'Gagne 7 armure.',
    descriptionEn: 'Gain 7 block.',
  },
  {
    id: 'practice-wall',
    slug: 'practice-wall',
    nameFr: 'Mur improvisé',
    nameEn: 'Makeshift Wall',
    type: 'defense',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    cost: 2,
    damage: 0,
    block: 12,
    heal: 0,
    effects: [],
    exhaust: false,
    descriptionFr: 'Gagne 12 armure.',
    descriptionEn: 'Gain 12 block.',
  },
  {
    id: 'practice-heal',
    slug: 'practice-heal',
    nameFr: 'Baume de terrain',
    nameEn: 'Field Salve',
    type: 'skill',
    statType: 'medicine',
    element: null,
    rarity: 'common',
    cost: 1,
    damage: 0,
    block: 0,
    heal: 6,
    effects: [],
    exhaust: false,
    descriptionFr: 'Soigne 6 PV.',
    descriptionEn: 'Heal 6 HP.',
  },
  {
    id: 'practice-focus',
    slug: 'practice-focus',
    nameFr: 'Concentration',
    nameEn: 'Focus',
    type: 'skill',
    statType: 'ninjutsu',
    element: null,
    rarity: 'common',
    cost: 0,
    damage: 0,
    block: 0,
    heal: 0,
    effects: [{ type: 'draw', value: 1 }],
    exhaust: false,
    descriptionFr: 'Piochez 1 carte.',
    descriptionEn: 'Draw 1 card.',
  },
];

/** 20 cartes = 4 copies de chaque pratique (taille min deck). */
export function buildPracticeDeckEntries() {
  return PRACTICE_DECK_CARDS.map((card) => ({ quantity: 4, card }));
}
