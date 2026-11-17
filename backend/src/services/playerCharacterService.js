/**
 * Player Character Service — Kage Legacy V2 Phase 1
 *
 * Stats finales = talents débloqués + bonus passifs des cartes du deck actif.
 * ⚠️ Aucune stat automatique au level-up : uniquement +1 talent_points_available.
 */
import { query } from '../config/database.js';
import { assignFactionFromSeed, getFaction, isValidFactionId } from './factionCatalog.js';
import { ELEMENTS } from '../validators/player.js';

/** Niveau max du personnage. */
export const MAX_LEVEL = 100;

/**
 * Clés de stats combat (docs/COMBAT_SYSTEM.md).
 * Phase 1 : toutes à 0 tant que talents/cartes ne sont pas branchés.
 */
export const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'maxHp',
  'maxChakra',
  'startingBlock',
];

/** Stats de base documentées (Phase 1) : zéro — tout vient des talents + cartes. */
export function createEmptyStats() {
  return Object.fromEntries(STAT_KEYS.map(key => [key, 0]));
}

/**
 * XP requise pour passer du niveau `level` au niveau suivant.
 * Courbe simple Phase 1 : 100 × level (ex. 1→2 = 100, 2→3 = 200).
 */
export function xpRequiredForLevel(level) {
  const lvl = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));
  return 100 * lvl;
}

/** Rang dérivé du niveau (pas de stats auto). */
export function rankForLevel(level) {
  const lvl = Number(level) || 1;
  if (lvl >= 80) return 'Kage';
  if (lvl >= 60) return 'ANBU';
  if (lvl >= 40) return 'Jonin';
  if (lvl >= 20) return 'Chunin';
  return 'Genin';
}

export function mergeStatBonuses(...sources) {
  const result = createEmptyStats();
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of STAT_KEYS) {
      const value = Number(source[key]);
      if (Number.isFinite(value)) result[key] += value;
    }
  }
  return result;
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?
       LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Bonus issus des nœuds de talents débloqués (délègue à talentTreeService).
 * Si les tables ne sont pas peuplées / absentes → {}.
 */
export async function getTalentStatBonuses(userId) {
  const hasTalents = await tableExists('user_talents');
  const hasNodes = await tableExists('talent_tree_nodes');
  if (!hasTalents || !hasNodes) return createEmptyStats();

  try {
    const { computeTalentBonuses } = await import('./talentTreeService.js');
    const { stats } = await computeTalentBonuses(userId);
    return stats || createEmptyStats();
  } catch {
    return createEmptyStats();
  }
}

/**
 * Bonus passifs des cartes du deck actif (Phase 2 — tables pas encore créées).
 * Préparé pour : user_decks (is_active) → user_deck_cards → card_definitions.passive_bonus_json
 */
/**
 * Délègue à deckService (Phase 2) pour upgrades + quantités.
 * Fallback vide si les tables cartes n’existent pas encore.
 */
export async function getDeckPassiveBonuses(userId) {
  const hasDecks = await tableExists('user_decks');
  const hasDeckCards = await tableExists('user_deck_cards');
  const hasDefs = await tableExists('card_definitions');
  if (!hasDecks || !hasDeckCards || !hasDefs) return createEmptyStats();

  try {
    const { getDeckPassiveBonuses: fromDeckService } = await import('./deckService.js');
    return fromDeckService(userId);
  } catch {
    return createEmptyStats();
  }
}

export async function getComputedStats(userId) {
  const [fromTalents, fromCards] = await Promise.all([
    getTalentStatBonuses(userId),
    getDeckPassiveBonuses(userId),
  ]);
  const total = mergeStatBonuses(fromTalents, fromCards);
  return {
    total,
    breakdown: {
      talents: fromTalents,
      cards: fromCards,
      /** Réservé buffs temporaires combat (Phase 4+). */
      temporary: createEmptyStats(),
    },
  };
}

function serializeCharacter(row, extras = {}) {
  if (!row) return null;
  const factionId = row.faction_id ?? extras.factionId ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatarUrl: row.avatar_url || null,
    level: row.level,
    xp: row.xp,
    xpToNextLevel: row.level >= MAX_LEVEL ? null : xpRequiredForLevel(row.level),
    rank: row.rank,
    talentPointsAvailable: row.talent_points_available,
    elementAffinity: row.element_affinity,
    factionId,
    faction: factionId ? getFaction(factionId) : null,
    factionRetakeUsed: Boolean(row.faction_retake_used),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

async function fetchCharacterRow(userId) {
  const rows = await query(
    `SELECT id, user_id, character_name AS name,
            character_avatar_url AS avatar_url,
            character_level AS level, character_xp AS xp,
            character_rank AS \`rank\`,
            character_talent_points_available AS talent_points_available,
            character_element_affinity AS element_affinity,
            character_faction_id AS faction_id,
            character_faction_retake_used AS faction_retake_used,
            character_created_at AS created_at,
            character_updated_at AS updated_at
     FROM player_profiles
     WHERE user_id = ? AND character_name IS NOT NULL
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

/**
 * Création d'un personnage TCG : son identité est définie par sa faction et son affinité.
 */
export async function createCharacter(
  userId,
  { name, elementAffinity = 'Katon', avatarUrl, factionId },
) {
  if (!userId) throw httpError(400, 'userId requis.');

  const existing = await fetchCharacterRow(userId);
  if (existing) throw httpError(409, 'Un personnage existe déjà pour ce compte.');

  const trimmedName = String(name || '').trim();
  if (trimmedName.length < 2) throw httpError(400, 'Nom trop court.');

  if (!ELEMENTS.includes(elementAffinity)) {
    throw httpError(400, 'Affinité élémentaire invalide.');
  }

  let resolvedFaction = factionId || null;
  if (resolvedFaction != null && !isValidFactionId(resolvedFaction)) {
    throw httpError(400, 'Faction invalide.');
  }
  if (!resolvedFaction) {
    resolvedFaction = assignFactionFromSeed(userId);
  }

  const avatar = avatarUrl && String(avatarUrl).trim() ? String(avatarUrl).trim() : null;
  const profiles = await query(
    'SELECT character_name FROM player_profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!profiles[0]) throw httpError(404, 'Profil joueur introuvable.');
  if (profiles[0].character_name) throw httpError(409, 'Un personnage existe déjà pour ce compte.');

  const result = await query(
    `UPDATE player_profiles
     SET character_name = ?, character_avatar_url = ?, character_level = 1,
         character_xp = 0, character_rank = 'Genin',
         character_talent_points_available = 1, character_element_affinity = ?,
         character_faction_id = ?, character_faction_retake_used = 0,
         character_created_at = UTC_TIMESTAMP(), character_updated_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND character_name IS NULL`,
    [trimmedName, avatar, elementAffinity, resolvedFaction, userId],
  );
  if (!result.affectedRows) throw httpError(409, 'Un personnage existe déjà pour ce compte.');

  // Cartes de base + deck starter (best-effort — ne bloque pas la création).
  try {
    const { grantStarterLoadoutOnCreate } = await import('./starterLoadoutService.js');
    await grantStarterLoadoutOnCreate(userId);
  } catch {
    /* ignore */
  }

  return getCharacter(userId);
}

export async function getCharacter(userId) {
  const row = await fetchCharacterRow(userId);
  if (!row) return null;

  const stats = await getComputedStats(userId);
  return serializeCharacter(row, { stats });
}

/**
 * Applique autant de level-ups que l'XP le permet.
 * Chaque level-up : +1 talent_points_available, PAS de stats auto.
 */
export function applyXpGain({ level, xp, talentPointsAvailable }, amount) {
  let nextLevel = Number(level) || 1;
  let nextXp = (Number(xp) || 0) + Math.max(0, Number(amount) || 0);
  let nextTalent = Number(talentPointsAvailable) || 0;
  let levelsGained = 0;

  while (nextLevel < MAX_LEVEL) {
    const need = xpRequiredForLevel(nextLevel);
    if (nextXp < need) break;
    nextXp -= need;
    nextLevel += 1;
    nextTalent += 1;
    levelsGained += 1;
  }

  if (nextLevel >= MAX_LEVEL) {
    nextLevel = MAX_LEVEL;
    nextXp = 0;
  }

  return {
    level: nextLevel,
    xp: nextXp,
    talentPointsAvailable: nextTalent,
    rank: rankForLevel(nextLevel),
    levelsGained,
    leveledUp: levelsGained > 0,
  };
}

export async function addXP(userId, amount) {
  const qty = Number(amount);
  if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, 'amount doit être positif.');

  const row = await fetchCharacterRow(userId);
  if (!row) throw httpError(404, 'Personnage introuvable.');

  const before = {
    level: row.level,
    xp: row.xp,
    talentPointsAvailable: row.talent_points_available,
  };
  const after = applyXpGain(before, qty);

  if (after.level !== before.level || after.xp !== before.xp) {
    await query(
      `UPDATE player_profiles
         SET character_level = ?, character_xp = ?, character_rank = ?,
             character_talent_points_available = ?, character_updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND character_name IS NOT NULL`,
      [after.level, after.xp, after.rank, after.talentPointsAvailable, userId],
    );
  }

  const character = await getCharacter(userId);
  return {
    character,
    xpGained: qty,
    levelsGained: after.levelsGained,
    leveledUp: after.leveledUp,
    talentPointsGained: after.talentPointsAvailable - before.talentPointsAvailable,
  };
}

/**
 * Level-up manuel d'un cran (si XP suffisante) — +1 talent point, pas de stats.
 */
export async function levelUp(userId) {
  const row = await fetchCharacterRow(userId);
  if (!row) throw httpError(404, 'Personnage introuvable.');

  if (row.level >= MAX_LEVEL) throw httpError(400, 'Niveau maximum atteint.');

  const need = xpRequiredForLevel(row.level);
  if (row.xp < need) {
    throw httpError(400, `XP insuffisante (${row.xp}/${need}).`);
  }

  const nextLevel = row.level + 1;
  const nextXp = row.xp - need;
  const nextTalent = row.talent_points_available + 1;
  const nextRank = rankForLevel(nextLevel);

  await query(
    `UPDATE player_profiles
     SET character_level = ?, character_xp = ?, character_rank = ?,
         character_talent_points_available = ?, character_updated_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND character_name IS NOT NULL`,
    [nextLevel, nextXp, nextRank, nextTalent, userId],
  );

  const character = await getCharacter(userId);
  return {
    character,
    levelsGained: 1,
    leveledUp: true,
    talentPointsGained: 1,
  };
}
