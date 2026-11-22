/**
 * Récompenses de victoire (missions deck-combat Phase 4+).
 *
 * - XP → addXP (level-up existant → talent points)
 * - Ryos → player_profiles.ryos
 * - Chance de carte → collection (source: mission)
 * - Battle Pass : hook stub si table absente
 */
import { query } from '../config/database.js';
import {
  COMBAT_DEFAULT_REWARDS,
  COMBAT_RUN_BONUS_MULT_DEFAULT,
  resolveCombatRewards,
} from '../config/economyConfig.js';
import { addXP } from './playerCharacterService.js';
import { addCard } from './collectionService.js';

/** @deprecated Prefer COMBAT_DEFAULT_REWARDS from economyConfig — re-export pour tests. */
const DEFAULT_REWARDS = { ...COMBAT_DEFAULT_REWARDS };

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function rollPercent(rng = Math.random) {
  return Math.floor(rng() * 100) + 1;
}

/**
 * Tire une carte aléatoire du catalogue (common/uncommon de préférence).
 */
async function pickRandomCardDefinitionId(rng = Math.random) {
  const rows = await query(
    `SELECT id FROM card_definitions
     WHERE rarity IN ('common', 'uncommon', 'rare')
     ORDER BY RAND()
     LIMIT 40`,
  );
  if (!rows.length) return null;
  const idx = Math.floor(rng() * rows.length);
  return rows[idx].id;
}

/**
 * Hook Battle Pass : délègue à addBattlePassXP si tables/saison présentes.
 */
async function tryGrantBattlePassPoints(userId, points) {
  const qty = Math.max(0, Number(points) || 0);
  if (qty <= 0) return { granted: false, reason: 'no_points' };

  if (!(await tableExists('battle_pass_seasons'))) {
    return { granted: false, reason: 'bp_table_missing', pointsStub: qty };
  }

  try {
    const { addBattlePassXP } = await import('./battlePassService.js');
    const result = await addBattlePassXP(userId, qty, 'combat_mission');
    return {
      granted: true,
      points: qty,
      currentLevel: result?.progress?.currentLevel ?? result?.currentLevel ?? null,
    };
  } catch (err) {
    return {
      granted: false,
      reason: err.message || 'bp_grant_failed',
      pointsStub: qty,
    };
  }
}

/**
 * Charge rewards_json d'une mission (défauts + plancher rang via economyConfig).
 */
export async function loadMissionRewards(missionId) {
  if (missionId == null) return resolveCombatRewards(null, null);
  const rows = await query(
    'SELECT rewards_json, `rank` AS mission_rank FROM mission_definitions WHERE id = ? LIMIT 1',
    [missionId],
  );
  if (!rows[0]) return resolveCombatRewards(null, null);
  let parsed = rows[0].rewards_json;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }
  const resolved = resolveCombatRewards(parsed, rows[0].mission_rank || null);
  if (parsed && typeof parsed === 'object' && parsed.runBonusMult != null) {
    resolved.runBonusMult = Number(parsed.runBonusMult) || undefined;
  }
  return resolved;
}

/**
 * Applique un paquet de récompenses (xp/ryos/carte/bp) selon une config.
 * @returns {Promise<object>} résumé pour l'UI
 */
async function applyRewardConfig(userId, cfg, { rng = Math.random, source = 'mission' } = {}) {
  const summary = {
    xp: 0,
    ryos: 0,
    levelsGained: 0,
    leveledUp: false,
    talentPointsGained: 0,
    card: null,
    cardRolled: false,
    battlePass: null,
    source,
  };

  if (cfg.xp > 0) {
    try {
      const xpResult = await addXP(userId, cfg.xp);
      summary.xp = xpResult.xpGained;
      summary.levelsGained = xpResult.levelsGained;
      summary.leveledUp = xpResult.leveledUp;
      summary.talentPointsGained = xpResult.talentPointsGained;
    } catch (err) {
      if (err.statusCode !== 404) throw err;
      summary.xpSkipped = 'no_character';
    }
  }

  if (cfg.ryos > 0) {
    const updated = await query('UPDATE player_profiles SET ryos = ryos + ? WHERE user_id = ?', [
      cfg.ryos,
      userId,
    ]);
    if (updated.affectedRows > 0) summary.ryos = cfg.ryos;
  }

  const chance = Math.max(0, Math.min(100, Number(cfg.cardChance) || 0));
  if (chance > 0 && rollPercent(rng) <= chance) {
    summary.cardRolled = true;
    try {
      if (await tableExists('card_definitions')) {
        const cardId = await pickRandomCardDefinitionId(rng);
        if (cardId) {
          const entry = await addCard(userId, cardId, { quantity: 1, source });
          summary.card = {
            collectionId: entry?.collectionId ?? null,
            definitionId: cardId,
            nameFr: entry?.card?.nameFr ?? null,
            nameEn: entry?.card?.nameEn ?? null,
            rarity: entry?.card?.rarity ?? null,
            isNew: Number(entry?.quantity) === 1,
            card: entry?.card ?? null,
          };
        }
      }
    } catch {
      summary.cardError = true;
    }
  }

  summary.battlePass = await tryGrantBattlePassPoints(userId, cfg.bpPoints);
  return summary;
}

/**
 * Applique les récompenses de victoire une seule fois (duel / combat hors run).
 * @returns {Promise<object>} résumé pour l'UI
 */
export async function grantVictoryRewards(userId, missionId, { rng = Math.random } = {}) {
  if (!userId) throw httpError(400, 'userId requis.');
  const cfg = await loadMissionRewards(missionId);
  return applyRewardConfig(userId, cfg, { rng, source: 'mission' });
}

/**
 * Récompenses de fin de parcours (meilleures qu'un single fight).
 * Multiplie la config mission par runBonusMult (défaut 1.8) + bonus combats.
 */
export async function grantRunRewards(
  userId,
  missionId,
  {
    combatsWon = 0,
    nodeCount = 0,
    hardModeMult = 1,
    branchXpMult = 1,
    purseReturn = 0,
    rng = Math.random,
  } = {},
) {
  if (!userId) throw httpError(400, 'userId requis.');

  const base = await loadMissionRewards(missionId);
  let mult = COMBAT_RUN_BONUS_MULT_DEFAULT;
  if (base.runBonusMult != null) {
    mult = Number(base.runBonusMult) || COMBAT_RUN_BONUS_MULT_DEFAULT;
  }

  // Bonus léger par combat remporté (au-delà du multiplicateur de base)
  const combatBonus = 1 + Math.max(0, combatsWon - 1) * 0.08;
  const hardMult = Math.max(1, Number(hardModeMult) || 1);
  const branchMult = Math.max(0.5, Number(branchXpMult) || 1);
  const scale = mult * combatBonus * hardMult;
  const xpScale = scale * branchMult;
  const purseBonus = Math.max(0, Math.floor(Number(purseReturn) || 0));

  const cfg = {
    xp: Math.round((base.xp || 0) * xpScale),
    ryos: Math.round((base.ryos || 0) * scale) + purseBonus,
    cardChance: Math.min(
      85,
      Math.round(
        (base.cardChance || 12) * Math.min(1.4, 1 + combatsWon * 0.05) * Math.min(1.2, hardMult),
      ),
    ),
    bpPoints: Math.round((base.bpPoints || 0) * scale),
  };

  const summary = await applyRewardConfig(userId, cfg, { rng, source: 'mission_run' });
  summary.runMult = Number(scale.toFixed(2));
  summary.hardModeMult = hardMult;
  summary.branchXpMult = branchMult;
  summary.purseReturned = purseBonus;
  summary.combatsWon = combatsWon;
  summary.nodeCount = nodeCount;
  return summary;
}

export const __test = {
  DEFAULT_REWARDS,
  rollPercent,
  tryGrantBattlePassPoints,
};
