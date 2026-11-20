/**
 * Construit le snapshot initial d'un duel PvP (decks + stats).
 * La simu continue tourne côté Host — ce module ne fait que le bootstrap.
 */
import { randomUUID } from 'node:crypto';
import { loadCombatCharacter } from '../combatCharacterService.js';
import { publicFighterIdentity } from '../deckCombat/fighterIdentity.js';
import { getComputedStats } from '../playerCharacterService.js';
import { BASE_CHAKRA, BASE_MAX_HP } from '../../../../shared/pvp/duelEngine.js';
import { ANTI_CHEAT_MODE } from './config.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function resolveDeckCards(userId, deckId) {
  const { getPlayableDeckForCombat } = await import('../deckService.js');
  const deck = await getPlayableDeckForCombat(userId, deckId);
  return { deckId: deck.id, cards: deck.cards, practice: false };
}

function parseJsonSafe(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function serializeRuntimeCards(deckCards) {
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
        element: card.element || null,
        type: card.cardType || card.card_type || card.type || null,
        cardType: card.cardType || card.card_type || card.type || null,
        critChance: Number(card.critChance ?? card.crit_chance) || 0,
        rarity: card.rarity,
        upgradeLevel: card.upgradeLevel ?? entry.upgradeLevel,
        passiveBonus: card.passiveBonus,
        statTypeSecondary: card.statTypeSecondary,
        imageUrl: card.imageUrl,
        descriptionFr: card.descriptionFr,
        descriptionEn: card.descriptionEn,
        passiveDescriptionFr: card.passiveDescriptionFr,
        passiveDescriptionEn: card.passiveDescriptionEn,
        // Ne pas propager exhaust : le moteur l'utilise pour déplacer la carte.
        summon: parseJsonSafe(card.summon_json, card.summon || null),
        effects: parseJsonSafe(card.effects_json, card.effects || []),
        heldEffect: parseJsonSafe(card.held_effect_json, card.heldEffect || null),
      });
    }
  }
  return pile;
}

async function loadFighterProfile(userId) {
  const character = await loadCombatCharacter(userId);
  if (!character) throw httpError(400, `Personnage requis pour le joueur #${userId}.`);
  return character;
}

/**
 * Construit un combattant bootstrap (pioche non mélangée — le Host shuffle via seed).
 */
async function loadTalentEffectCodes(userId) {
  try {
    const { computeTalentBonuses } = await import('../talentTreeService.js');
    const bonuses = await computeTalentBonuses(userId);
    return (bonuses.effects || []).map(effect => effect.effectCode).filter(Boolean);
  } catch {
    return [];
  }
}

async function buildFighter(userId, deckId, seat) {
  const [character, statsResult, deckInfo, talentCodes] = await Promise.all([
    loadFighterProfile(userId),
    getComputedStats(userId),
    resolveDeckCards(userId, deckId),
    loadTalentEffectCodes(userId),
  ]);

  const stats = statsResult?.total || statsResult || {};
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);
  const cards = serializeRuntimeCards(deckInfo.cards);

  return {
    seat,
    userId,
    name: character.name,
    ...publicFighterIdentity(character),
    elementAffinity: character.elementAffinity,
    hp: maxHp,
    maxHp,
    block: Math.max(0, Number(stats.startingBlock) || 0),
    chakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    maxChakra: BASE_CHAKRA + (Number(stats.maxChakra) || 0),
    statuses: [],
    ally: null,
    hand: [],
    drawPile: cards,
    discardPile: [],
    exhaustPile: [],
    discardedForChakra: false,
    stats,
    talentCodes,
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
