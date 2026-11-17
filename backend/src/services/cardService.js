/**
 * Card definitions catalogue — Kage Legacy V2 Phase 2
 */
import { query } from '../config/database.js';
import {
  DISENCHANT_DUST as ECONOMY_DISENCHANT_DUST,
  UPGRADE_COSTS as ECONOMY_UPGRADE_COSTS,
} from '../config/economyConfig.js';
import {
  deriveCritChance,
  normalizeArtKey,
  remapAbandonedPassives,
  resolveSecondaryArt,
} from './deckCombat/combatArts.js';

export const CARD_TYPES = ['attack', 'defense', 'skill', 'summon', 'item'];
export const CARD_RARITIES = ['common', 'rare', 'legendary', 'mythic'];
export const STAT_TYPES = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];
export const ELEMENTS = ['katon', 'suiton', 'raiton', 'doton', 'futon'];

/** @see ../config/economyConfig.js */
export const UPGRADE_COSTS = ECONOMY_UPGRADE_COSTS;
/** @see ../config/economyConfig.js */
export const DISENCHANT_DUST = ECONOMY_DISENCHANT_DUST;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function parseJsonSafe(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Applique les bonus d'upgrade (niveau 1 / 2) sur les stats actives + passif.
 * Les bonus `level_N` sont relatifs à la base (pas cumulés entre niveaux) :
 * on n’applique que l’entrée du niveau courant.
 */
export function applyUpgradeBonuses(cardDef, upgradeLevel = 0) {
  const level = Math.max(0, Math.min(2, Number(upgradeLevel) || 0));
  const upgrades = parseJsonSafe(cardDef.upgrade_bonuses_json ?? cardDef.upgradeBonuses, {}) || {};
  const passiveBase = parseJsonSafe(cardDef.passive_bonus_json ?? cardDef.passiveBonus, {}) || {};
  const slug = cardDef.slug || null;
  const rawStat = cardDef.stat_type ?? cardDef.statType ?? 'taijutsu';
  const primary = normalizeArtKey(rawStat) || String(rawStat).toLowerCase();
  const secondary = resolveSecondaryArt(
    slug,
    cardDef.statTypeSecondary ?? cardDef.stat_type_secondary,
  );

  let cost = Number(cardDef.base_cost ?? cardDef.baseCost ?? 0);
  let damage = Number(cardDef.base_damage ?? cardDef.baseDamage ?? 0);
  let block = Number(cardDef.base_block ?? cardDef.baseBlock ?? 0);
  let heal = Number(cardDef.base_heal ?? cardDef.baseHeal ?? 0);
  const passiveMerged = { ...passiveBase };

  if (level > 0) {
    const bonus = upgrades[`level_${level}`] || {};
    if (bonus.damage != null) damage += Number(bonus.damage) || 0;
    if (bonus.block != null) block += Number(bonus.block) || 0;
    if (bonus.heal != null) heal += Number(bonus.heal) || 0;
    if (bonus.cost != null) cost += Number(bonus.cost) || 0;
    if (bonus.passive && typeof bonus.passive === 'object') {
      for (const [key, value] of Object.entries(bonus.passive)) {
        passiveMerged[key] = (Number(passiveMerged[key]) || 0) + (Number(value) || 0);
      }
    }
  }

  const critChance = deriveCritChance({
    critChance: cardDef.critChance ?? cardDef.crit_chance,
    passiveBeforeRemap: { ...passiveBase, ...((upgrades[`level_${level}`] || {}).passive || {}) },
    type: cardDef.type,
    damage: Number(cardDef.base_damage ?? cardDef.baseDamage ?? 0),
  });

  return {
    cost: Math.max(0, cost),
    damage: Math.max(0, damage),
    block: Math.max(0, block),
    heal: Math.max(0, heal),
    critChance,
    statTypeSecondary: secondary,
    passiveBonus: remapAbandonedPassives(passiveMerged, {
      statType: primary,
      secondaryStatType: secondary,
    }),
  };
}

export function serializeCardDefinition(row, { upgradeLevel = 0 } = {}) {
  if (!row) return null;
  const effects = parseJsonSafe(row.effects_json, []);
  const summon = parseJsonSafe(row.summon_json, null);
  const upgradeBonuses = parseJsonSafe(row.upgrade_bonuses_json, {});
  const computed = applyUpgradeBonuses(row, upgradeLevel);

  const suffix = upgradeLevel === 1 ? '+' : upgradeLevel === 2 ? '++' : '';

  return {
    id: row.id,
    slug: row.slug,
    nameFr: `${row.name_fr}${suffix}`,
    nameEn: `${row.name_en}${suffix}`,
    type: row.type,
    statType: normalizeArtKey(row.stat_type) || row.stat_type,
    statTypeSecondary: computed.statTypeSecondary,
    element: row.element,
    rarity: row.rarity,
    baseCost: row.base_cost,
    baseDamage: row.base_damage,
    baseBlock: row.base_block,
    baseHeal: row.base_heal,
    cost: computed.cost,
    damage: computed.damage,
    block: computed.block,
    heal: computed.heal,
    critChance: computed.critChance || 0,
    effects,
    summon,
    exhaust: Boolean(row.exhaust),
    passiveBonus: computed.passiveBonus,
    passiveDescriptionFr: row.passive_description_fr,
    passiveDescriptionEn: row.passive_description_en,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    loreFr: row.lore_fr,
    loreEn: row.lore_en,
    upgradable: Boolean(row.upgradable),
    upgradeBonuses,
    upgradeLevel,
    imageUrl: row.image_url,
    artist: row.artist,
    seasonIntroduced: row.season_introduced,
    isExclusive: Boolean(row.is_exclusive),
    createdAt: row.created_at,
  };
}

function buildFilters({ type, rarity, element, statType, search } = {}) {
  const where = [];
  const params = [];

  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (rarity) {
    where.push('rarity = ?');
    params.push(rarity);
  }
  if (element) {
    where.push('element = ?');
    params.push(element);
  }
  if (statType) {
    where.push('stat_type = ?');
    params.push(statType);
  }
  if (search) {
    where.push('(name_fr LIKE ? OR name_en LIKE ? OR slug LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

export async function getAllCards(filters = {}) {
  const { clause, params } = buildFilters(filters);
  const rows = await query(
    `SELECT * FROM card_definitions ${clause} ORDER BY rarity, type, name_fr`,
    params,
  );
  return rows.map(row => serializeCardDefinition(row));
}

export async function getCardsByRarity(rarity) {
  if (!CARD_RARITIES.includes(rarity)) throw httpError(400, 'Rareté invalide.');
  return getAllCards({ rarity });
}

export async function getCardsByType(type) {
  if (!CARD_TYPES.includes(type)) throw httpError(400, 'Type de carte invalide.');
  return getAllCards({ type });
}

export async function getCardById(cardId) {
  const id = Number(cardId);
  if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'cardId invalide.');
  const rows = await query('SELECT * FROM card_definitions WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) throw httpError(404, 'Carte introuvable.');
  return serializeCardDefinition(rows[0]);
}

export async function getCardBySlug(slug) {
  const rows = await query('SELECT * FROM card_definitions WHERE slug = ? LIMIT 1', [slug]);
  if (!rows[0]) throw httpError(404, 'Carte introuvable.');
  return serializeCardDefinition(rows[0]);
}

export async function getCardDefinitionRow(cardId) {
  const rows = await query('SELECT * FROM card_definitions WHERE id = ? LIMIT 1', [cardId]);
  return rows[0] || null;
}

/**
 * Crée ou met à jour une définition (admin / seed).
 */
export async function upsertCardDefinition(card) {
  if (!card?.slug) throw httpError(400, 'slug requis.');

  const existing = await query('SELECT id FROM card_definitions WHERE slug = ? LIMIT 1', [
    card.slug,
  ]);

  const payload = [
    card.name_fr ?? card.nameFr,
    card.name_en ?? card.nameEn,
    card.type,
    card.stat_type ?? card.statType ?? null,
    card.element ?? null,
    card.rarity,
    card.base_cost ?? card.baseCost ?? 0,
    card.base_damage ?? card.baseDamage ?? 0,
    card.base_block ?? card.baseBlock ?? 0,
    card.base_heal ?? card.baseHeal ?? 0,
    JSON.stringify(card.effects_json ?? card.effects ?? []),
    (card.summon_json ?? card.summon) ? JSON.stringify(card.summon_json ?? card.summon) : null,
    card.exhaust ? 1 : 0,
    JSON.stringify(card.passive_bonus_json ?? card.passiveBonus ?? {}),
    card.passive_description_fr ?? card.passiveDescriptionFr ?? null,
    card.passive_description_en ?? card.passiveDescriptionEn ?? null,
    card.description_fr ?? card.descriptionFr,
    card.description_en ?? card.descriptionEn,
    card.lore_fr ?? card.loreFr ?? null,
    card.lore_en ?? card.loreEn ?? null,
    card.upgradable === false ? 0 : 1,
    JSON.stringify(card.upgrade_bonuses_json ?? card.upgradeBonuses ?? {}),
    card.image_url ?? card.imageUrl ?? null,
    card.artist ?? 'Generated',
    card.season_introduced ?? card.seasonIntroduced ?? null,
    card.is_exclusive || card.isExclusive ? 1 : 0,
    card.slug,
  ];

  if (existing[0]) {
    await query(
      `UPDATE card_definitions SET
        name_fr=?, name_en=?, type=?, stat_type=?, element=?, rarity=?,
        base_cost=?, base_damage=?, base_block=?, base_heal=?,
        effects_json=?, summon_json=?, exhaust=?,
        passive_bonus_json=?, passive_description_fr=?, passive_description_en=?,
        description_fr=?, description_en=?, lore_fr=?, lore_en=?,
        upgradable=?, upgrade_bonuses_json=?, image_url=?, artist=?,
        season_introduced=?, is_exclusive=?
       WHERE slug=?`,
      payload,
    );
    return getCardBySlug(card.slug);
  }

  await query(
    `INSERT INTO card_definitions (
      name_fr, name_en, type, stat_type, element, rarity,
      base_cost, base_damage, base_block, base_heal,
      effects_json, summon_json, exhaust,
      passive_bonus_json, passive_description_fr, passive_description_en,
      description_fr, description_en, lore_fr, lore_en,
      upgradable, upgrade_bonuses_json, image_url, artist,
      season_introduced, is_exclusive, slug
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload,
  );
  return getCardBySlug(card.slug);
}
