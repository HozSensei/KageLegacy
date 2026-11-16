/**
 * Construit le snapshot initial d'un duel PvP (decks + stats).
 * La simu continue tourne côté Host — ce module ne fait que le bootstrap.
 */
import { randomUUID } from 'node:crypto';
import { query } from '../../config/database.js';
import { getComputedStats } from '../playerCharacterService.js';
import { BASE_CHAKRA, BASE_MAX_HP } from '../../../../shared/pvp/duelEngine.js';
import { ANTI_CHEAT_MODE } from './config.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function resolveDeckCards(userId, deckId) {
  const { getDeck, getActiveDeck } = await import('../deckService.js');

  let deck = null;
  if (deckId) {
    deck = await getDeck(userId, Number(deckId));
  } else {
    deck = await getActiveDeck(userId);
  }

  if (deck && deck.cards?.length) {
    return { deckId: deck.id, cards: deck.cards, practice: false };
  }

  try {
    const { getAllCards } = await import('../cardService.js');
    const catalog = await getAllCards({});
    if (catalog.length >= 6) {
      const picked = catalog.slice(0, 8).map((card) => ({
        quantity: 3,
        card,
      }));
      return { deckId: null, cards: picked, practice: true };
    }
  } catch {
    /* ignore */
  }

  return {
    deckId: null,
    cards: buildFallbackCards(),
    practice: true,
  };
}

function buildFallbackCards() {
  const stubs = [
    { slug: 'pvp-strike', nameFr: 'Frappe rapide', nameEn: 'Quick Strike', cost: 1, damage: 6, block: 0, heal: 0, statType: 'taijutsu' },
    { slug: 'pvp-guard', nameFr: 'Garde de brume', nameEn: 'Mist Guard', cost: 1, damage: 0, block: 5, heal: 0, statType: 'medicine' },
    { slug: 'pvp-heal', nameFr: 'Souffle soignant', nameEn: 'Healing Breath', cost: 1, damage: 0, block: 0, heal: 6, statType: 'medicine' },
    { slug: 'pvp-blow', nameFr: 'Coup lourd', nameEn: 'Heavy Blow', cost: 2, damage: 10, block: 0, heal: 0, statType: 'taijutsu' },
  ];
  return stubs.map((card) => ({ quantity: 3, card: { ...card, id: card.slug } }));
}

function serializeRuntimeCards(deckCards) {
  const pile = [];
  for (const entry of deckCards) {
    const card = entry.card || entry;
    const qty = Math.max(1, Number(entry.quantity) || 1);
    for (let i = 0; i < qty; i += 1) {
      pile.push({
        instanceId: `${card.slug || card.id || 'card'}-${i}-${randomUUID().slice(0, 8)}`,
        id: card.id || card.slug,
        slug: card.slug || String(card.id || 'card'),
        nameFr: card.nameFr || card.name_fr || card.slug,
        nameEn: card.nameEn || card.name_en || card.slug,
        cost: Number(card.cost ?? card.baseCost ?? card.base_cost) || 0,
        damage: Number(card.damage ?? card.baseDamage ?? card.base_damage) || 0,
        block: Number(card.block ?? card.baseBlock ?? card.base_block) || 0,
        heal: Number(card.heal ?? card.baseHeal ?? card.base_heal) || 0,
        statType: (card.statType || card.stat_type || 'taijutsu').toLowerCase(),
        statTypeSecondary: card.statTypeSecondary || card.stat_type_secondary || null,
        critChance: Number(card.critChance ?? card.crit_chance) || 0,
        element: card.element || null,
        cardType: card.cardType || card.card_type || null,
        effects: card.effects_json
          ? typeof card.effects_json === 'string'
            ? JSON.parse(card.effects_json)
            : card.effects_json
          : card.effects || [],
      });
    }
  }
  return pile;
}

async function loadFighterProfile(userId) {
  const rows = await query(
    `SELECT user_id, name, level, \`rank\`, element_affinity
     FROM player_character WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (!rows[0]) throw httpError(400, `Personnage requis pour le joueur #${userId}.`);
  return rows[0];
}

/**
 * Construit un combattant bootstrap (pioche non mélangée — le Host shuffle via seed).
 */
async function buildFighter(userId, deckId, seat) {
  const [profile, statsResult, deckInfo] = await Promise.all([
    loadFighterProfile(userId),
    getComputedStats(userId),
    resolveDeckCards(userId, deckId),
  ]);

  const stats = statsResult?.total || statsResult || {};
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);
  const cards = serializeRuntimeCards(deckInfo.cards);

  return {
    seat,
    userId,
    name: profile.name,
    level: Number(profile.level) || 1,
    rank: profile.rank,
    elementAffinity: profile.element_affinity,
    hp: maxHp,
    maxHp,
    block: 0,
    chakra: BASE_CHAKRA,
    maxChakra: BASE_CHAKRA,
    statuses: [],
    hand: [],
    drawPile: cards,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
    stats,
    deckId: deckInfo.deckId,
    practiceDeck: deckInfo.practice,
  };
}

/**
 * @param {{ matchId: string, hostUserId: number, guestUserId: number, hostDeckId?: number, guestDeckId?: number, seed: string }} opts
 */
export async function buildMatchBootstrap(opts) {
  const host = await buildFighter(opts.hostUserId, opts.hostDeckId, 'host');
  const guest = await buildFighter(opts.guestUserId, opts.guestDeckId, 'guest');

  return {
    matchId: opts.matchId,
    seed: opts.seed,
    antiCheatMode: ANTI_CHEAT_MODE,
    fighters: { host, guest },
    createdAt: new Date().toISOString(),
  };
}
