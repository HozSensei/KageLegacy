/**
 * Récompenses de victoire (missions deck-combat Phase 4+).
 *
 * - XP → addXP (level-up existant → talent points)
 * - Ryos → sensei.ryos
 * - Chance de carte → collection (source: mission)
 * - Battle Pass : hook stub si table absente
 */
import { query } from '../config/database.js';
import { addXP } from './playerCharacterService.js';
import { addCard } from './collectionService.js';

const DEFAULT_REWARDS = { xp: 25, ryos: 80, cardChance: 10 };

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
 * Charge rewards_json d'une mission (ou défaut).
 */
export async function loadMissionRewards(missionId) {
  if (missionId == null) return { ...DEFAULT_REWARDS };
  const rows = await query(
    'SELECT rewards_json FROM mission_definitions WHERE id = ? LIMIT 1',
    [missionId],
  );
  if (!rows[0]) return { ...DEFAULT_REWARDS };
  let parsed = rows[0].rewards_json;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_REWARDS };
  return {
    xp: Number(parsed.xp) || DEFAULT_REWARDS.xp,
    ryos: Number(parsed.ryos) || DEFAULT_REWARDS.ryos,
    cardChance: parsed.cardChance != null ? Number(parsed.cardChance) : 12,
    bpPoints: Number(parsed.bpPoints) || 0,
  };
}

/**
 * Applique les récompenses de victoire une seule fois.
 * @returns {Promise<object>} résumé pour l'UI
 */
export async function grantVictoryRewards(userId, missionId, { rng = Math.random } = {}) {
  if (!userId) throw httpError(400, 'userId requis.');

  const cfg = await loadMissionRewards(missionId);
  const summary = {
    xp: 0,
    ryos: 0,
    levelsGained: 0,
    leveledUp: false,
    talentPointsGained: 0,
    card: null,
    cardRolled: false,
    battlePass: null,
  };

  // XP
  if (cfg.xp > 0) {
    try {
      const xpResult = await addXP(userId, cfg.xp);
      summary.xp = xpResult.xpGained;
      summary.levelsGained = xpResult.levelsGained;
      summary.leveledUp = xpResult.leveledUp;
      summary.talentPointsGained = xpResult.talentPointsGained;
    } catch (err) {
      // Personnage absent (tests / guest partiel) : ne pas faire échouer le combat
      if (err.statusCode !== 404) throw err;
      summary.xpSkipped = 'no_character';
    }
  }

  // Ryos
  if (cfg.ryos > 0) {
    const updated = await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [
      cfg.ryos,
      userId,
    ]);
    if (updated.affectedRows > 0) summary.ryos = cfg.ryos;
  }

  // Chance de carte
  const chance = Math.max(0, Math.min(100, Number(cfg.cardChance) || 0));
  if (chance > 0 && rollPercent(rng) <= chance) {
    summary.cardRolled = true;
    try {
      if (await tableExists('card_definitions')) {
        const cardId = await pickRandomCardDefinitionId(rng);
        if (cardId) {
          const entry = await addCard(userId, cardId, { quantity: 1, source: 'mission' });
          summary.card = {
            collectionId: entry?.collectionId ?? null,
            definitionId: cardId,
            nameFr: entry?.card?.nameFr ?? null,
            nameEn: entry?.card?.nameEn ?? null,
            rarity: entry?.card?.rarity ?? null,
          };
        }
      }
    } catch {
      summary.cardError = true;
    }
  }

  // Battle Pass hook (stub)
  summary.battlePass = await tryGrantBattlePassPoints(userId, cfg.bpPoints);

  return summary;
}

export const __test = {
  DEFAULT_REWARDS,
  rollPercent,
  tryGrantBattlePassPoints,
};
