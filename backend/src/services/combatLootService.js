import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { grantItemToUser, findItemDefinitionBySlug } from './itemGrantService.js';
import { grantRandomTacticCard } from './tacticCards/tacticCardService.js';
import { rollPercent } from './missionRules.js';
import {
  MATCH_DRAW_RYOS,
  MATCH_LOSS_RYOS,
  MATCH_WIN_RYOS,
} from './matchEconomy.js';

/** Objets bureau/consommables pouvant tomber en butin de combat / mission. */
export const LOOT_CONSUMABLE_POOL = [
  'pansement-terrain',
  'kit-materiel-medical',
  'livre-strategie',
  'bandage-rapide',
  'pilule-recuperation',
  'parchemin-jutsu-interdit',
];

/**
 * @typedef {'win'|'draw'|'loss'} CombatOutcome
 * @typedef {'league'|'reconnaissance'|'seal_common'|'seal_rare'} LootContext
 */

/** @type {Record<string, { ryos: [number, number], itemChance: number, cardChance: number, cardRarity?: string }>} */
export const LOOT_PROFILES = {
  league_win: { ryos: [120, 220], itemChance: 100, cardChance: 18, cardRarity: 'common' },
  league_draw: { ryos: [60, 120], itemChance: 90, cardChance: 10, cardRarity: 'common' },
  league_loss: { ryos: [35, 75], itemChance: 75, cardChance: 6, cardRarity: 'common' },
  reconnaissance_win: { ryos: [420, 560], itemChance: 100, cardChance: 16, cardRarity: 'common' },
  reconnaissance_draw: { ryos: [210, 290], itemChance: 88, cardChance: 9, cardRarity: 'common' },
  reconnaissance_loss: { ryos: [55, 115], itemChance: 72, cardChance: 5, cardRarity: 'common' },
  seal_common: { ryos: [45, 110], itemChance: 88, cardChance: 14, cardRarity: 'common' },
  seal_rare: { ryos: [90, 175], itemChance: 96, cardChance: 24, cardRarity: 'common' },
};

function rollRyosInRange([min, max]) {
  return min + randomInt(max - min + 1);
}

function pickRandomItemSlug() {
  return LOOT_CONSUMABLE_POOL[randomInt(LOOT_CONSUMABLE_POOL.length)];
}

export function lootProfileKey(context, outcome) {
  return `${context}_${outcome}`;
}

export function rollCombatLootBundle(context, outcome) {
  const profileKey = LOOT_PROFILES[context] ? context : lootProfileKey(context, outcome);
  const profile = LOOT_PROFILES[profileKey];
  if (!profile) {
    return { ryos: 0, items: [], tacticCard: null };
  }

  const ryos = rollRyosInRange(profile.ryos);
  const items =
    rollPercent() <= profile.itemChance ? [{ slug: pickRandomItemSlug(), quantity: 1 }] : [];
  const tacticCard =
    rollPercent() <= profile.cardChance ? { rarity: profile.cardRarity || 'common' } : null;

  return { ryos, items, tacticCard };
}

async function isHumanUser(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  return Boolean(rows[0] && !rows[0].is_bot);
}

/**
 * Applique un lot de butin (Ryos bonus, objet, carte) à un joueur humain.
 * @returns {Promise<{ ryos: number, items: Array<{ slug: string, userItemId?: number }>, tacticCard: object|null }>}
 */
export async function grantCombatLootBundle(userId, bundle) {
  if (!(await isHumanUser(userId))) {
    return { ryos: 0, items: [], tacticCard: null };
  }

  let grantedRyos = 0;
  if (bundle.ryos > 0) {
    await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [bundle.ryos, userId]);
    grantedRyos = bundle.ryos;
  }

  const grantedItems = [];
  for (const entry of bundle.items || []) {
    const def = await findItemDefinitionBySlug(entry.slug);
    const batch = await grantItemToUser(userId, entry.slug, entry.quantity ?? 1);
    for (const row of batch) {
      grantedItems.push({
        slug: entry.slug,
        userItemId: row.userItemId,
        nameFr: def?.name_fr ?? null,
        nameEn: def?.name_en ?? null,
      });
    }
  }

  let grantedCard = null;
  if (bundle.tacticCard) {
    grantedCard = await grantRandomTacticCard(userId, bundle.tacticCard);
  }

  return {
    ryos: grantedRyos,
    items: grantedItems,
    tacticCard: grantedCard,
  };
}

function leagueBaseRyos(outcome) {
  if (outcome === 'win') return MATCH_WIN_RYOS;
  if (outcome === 'draw') return MATCH_DRAW_RYOS;
  return MATCH_LOSS_RYOS;
}

/**
 * Prime de ligue : Ryos de base + lot bonus (objet aléatoire, chance de carte).
 */
export async function grantLeagueMatchLoot(userId, outcome) {
  const baseRyos = leagueBaseRyos(outcome);
  const bundle = rollCombatLootBundle('league', outcome);

  if (await isHumanUser(userId)) {
    if (baseRyos > 0) {
      await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [baseRyos, userId]);
    }
  } else {
    return { ryos: 0, baseRyos: 0, bonusRyos: 0, items: [], tacticCard: null };
  }

  const granted = await grantCombatLootBundle(userId, bundle);
  return {
    ryos: baseRyos + granted.ryos,
    baseRyos,
    bonusRyos: granted.ryos,
    items: granted.items,
    tacticCard: granted.tacticCard,
  };
}

/**
 * Butin mission de reconnaissance (Ryos + objet + carte dans un seul tirage).
 */
export async function grantReconnaissanceLoot(userId, outcome) {
  const bundle = rollCombatLootBundle('reconnaissance', outcome);
  const granted = await grantCombatLootBundle(userId, bundle);
  return {
    ryos: granted.ryos,
    items: granted.items,
    tacticCard: granted.tacticCard,
  };
}

/**
 * Butin de base à l'ouverture d'un sceau (common / rare).
 */
export async function grantSealBaseLoot(userId, tier) {
  const profileKey = tier === 'rare' ? 'seal_rare' : 'seal_common';
  const bundle = rollCombatLootBundle(profileKey, 'win');
  return grantCombatLootBundle(userId, bundle);
}
