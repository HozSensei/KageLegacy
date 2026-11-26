import { Router } from 'express';
import { z } from 'zod';
import { getConnection, query } from '../config/database.js';
import { requireAdmin } from '../middleware/admin.js';
import { ASPIRANT_RANK, DEFAULT_AVATAR_ID } from '../services/characterAppearance.js';
import { resetCharacterToFreshState } from '../services/characterFreshResetService.js';
import {
  BUG_REPORT_STATUSES,
  listBugReports,
  rewardBugReportAuthor,
  updateBugReport,
} from '../services/bugReportService.js';
import { exportActiveDeckForUser } from '../services/deckExportService.js';

const router = Router();
const resourceFields = Object.freeze({
  ryos: 'ryos',
  kageCoins: 'kage_coins',
  cardDust: 'card_dust',
  cardEssence: 'card_essence',
});
const grantSchema = z
  .object({
    ryos: z.number().int().min(0).max(1_000_000_000).optional(),
    kageCoins: z.number().int().min(0).max(1_000_000_000).optional(),
    cardDust: z.number().int().min(0).max(1_000_000_000).optional(),
    cardEssence: z.number().int().min(0).max(1_000_000_000).optional(),
  })
  .strict()
  .refine(value => Object.values(value).some(amount => amount > 0), {
    message: 'Indiquez au moins une quantité supérieure à zéro.',
  });
const resetSchema = z
  .object({
    freshStart: z.boolean().optional(),
    collection: z.boolean().optional(),
    combats: z.boolean().optional(),
    missions: z.boolean().optional(),
    ryos: z.boolean().optional(),
    kageCoins: z.boolean().optional(),
    cardMaterials: z.boolean().optional(),
    level: z.boolean().optional(),
    talents: z.boolean().optional(),
  })
  .strict()
  .refine(
    value =>
      value.freshStart === true ||
      Object.entries(value)
        .filter(([key]) => key !== 'freshStart')
        .some(([, selected]) => selected),
    {
      message: 'Sélectionnez au moins un élément à réinitialiser.',
    },
  );

router.use(requireAdmin);

router.get('/players', async (req, res, next) => {
  try {
    const search = String(req.query.q || '')
      .trim()
      .slice(0, 80);
    // Comptes inscrits = non-invités (mot de passe et/ou OAuth Google).
    // Ne pas exiger password_hash : les comptes Google ont password_hash NULL.
    const rows = await query(
      `SELECT u.id, COALESCE(s.character_name, s.display_name, u.username) AS username,
              u.email, u.is_admin, s.character_name,
              COALESCE(s.ryos, 0) AS ryos,
              COALESCE(s.kage_coins, 0) AS kage_coins,
              COALESCE(s.card_dust, 0) AS card_dust,
              COALESCE(s.card_essence, 0) AS card_essence,
              (SELECT COUNT(*) FROM user_card_collection c WHERE c.user_id = u.id) AS collection_count,
              (SELECT COUNT(*) FROM user_decks d WHERE d.user_id = u.id) AS deck_count
       FROM users u
       LEFT JOIN player_profiles s ON s.user_id = u.id
       WHERE u.is_guest = FALSE
         AND (? = '' OR u.username LIKE ? OR u.email LIKE ? OR s.display_name LIKE ? OR s.character_name LIKE ?)
       ORDER BY username
       LIMIT 100`,
      [search, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`],
    );
    res.json({ players: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Export JSON du deck actif d’un joueur (format stable pour scripts d’équilibrage).
 * GET /api/admin/players/:id/active-deck-export
 */
router.get('/players/:id/active-deck-export', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Identifiant joueur invalide.' });
    }
    const payload = await exportActiveDeckForUser(userId);
    const safeName = String(payload.deck?.name || 'deck')
      .replace(/[^\w-]+/g, '_')
      .slice(0, 40);
    const filename = `deck-${payload.player?.username || userId}-${safeName}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.post('/players/:id/resources', async (req, res, next) => {
  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message || 'Montants invalides.' });
  }

  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Identifiant joueur invalide.' });
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [players] = await connection.execute(
      `SELECT u.id FROM users u
       JOIN player_profiles s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_guest = FALSE
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!players[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Joueur introuvable.' });
    }

    for (const [key, column] of Object.entries(resourceFields)) {
      const amount = parsed.data[key] || 0;
      if (amount > 0) {
        await connection.execute(
          `UPDATE player_profiles SET ${column} = ${column} + ? WHERE user_id = ?`,
          [amount, userId],
        );
      }
    }
    await connection.commit();
    const [resources] = await connection.execute(
      'SELECT ryos, kage_coins, card_dust, card_essence FROM player_profiles WHERE user_id = ? LIMIT 1',
      [userId],
    );
    res.json({ resources: resources[0] });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.post('/players/:id/reset', async (req, res, next) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message || 'Sélection de reset invalide.' });
  }

  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Identifiant joueur invalide.' });
  }

  const selected = parsed.data;
  if (selected.freshStart) {
    try {
      const result = await resetCharacterToFreshState(userId);
      return res.json({ success: true, reset: { freshStart: true }, starter: result.starter });
    } catch (error) {
      return next(error);
    }
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [players] = await connection.execute(
      `SELECT u.id FROM users u
       JOIN player_profiles s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_guest = FALSE
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!players[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Joueur introuvable.' });
    }

    if (selected.missions) {
      await connection.execute(
        `DELETE FROM combat_sessions
         WHERE user_id = ? AND mission_run_id IN (
           SELECT id FROM mission_runs WHERE user_id = ? AND state = 'in_progress'
         )`,
        [userId, userId],
      );
      await connection.execute(
        "DELETE FROM mission_runs WHERE user_id = ? AND state = 'in_progress'",
        [userId],
      );
    }
    if (selected.combats) {
      await connection.execute(
        `DELETE FROM combat_sessions
         WHERE user_id = ? AND state = 'in_progress' AND mission_run_id IS NULL`,
        [userId],
      );
    }
    if (selected.collection) {
      await connection.execute('DELETE FROM user_decks WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM user_card_collection WHERE user_id = ?', [userId]);
      await connection.execute(
        'UPDATE users SET starter_loadout_reset_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
      );
    }

    const resourceResets = [];
    if (selected.ryos) resourceResets.push('ryos = 0');
    if (selected.kageCoins) resourceResets.push('kage_coins = 0');
    if (selected.cardMaterials) resourceResets.push('card_dust = 0', 'card_essence = 0');
    if (resourceResets.length) {
      await connection.execute(
        `UPDATE player_profiles SET ${resourceResets.join(', ')} WHERE user_id = ?`,
        [userId],
      );
    }

    if (selected.level) {
      await connection.execute(
        `UPDATE player_profiles
         SET character_highest_level = GREATEST(character_highest_level, character_level),
             character_level = 1, character_xp = 0, character_rank = ?,
             character_avatar_id = IF(character_avatar_id LIKE 'aspirant-%', character_avatar_id, ?),
             character_updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND character_name IS NOT NULL`,
        [ASPIRANT_RANK, DEFAULT_AVATAR_ID, userId],
      );
    }
    if (selected.talents) {
      await connection.execute('DELETE FROM user_talents WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM user_talent_respec_history WHERE user_id = ?', [
        userId,
      ]);
      await connection.execute(
        `UPDATE player_profiles
         SET character_talent_points_available = character_level,
             character_updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND character_name IS NOT NULL`,
        [userId],
      );
    }

    await connection.commit();
    res.json({ success: true, reset: selected });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

const bugReportPatchSchema = z
  .object({
    status: z.enum(BUG_REPORT_STATUSES).optional(),
    adminComment: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine(value => value.status != null || value.adminComment !== undefined, {
    message: 'Indiquez un statut et/ou un commentaire.',
  });

router.get('/bug-reports', async (req, res, next) => {
  try {
    const statusRaw = String(req.query.status || '').trim();
    const status = statusRaw || null;
    const reports = await listBugReports({ status });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

router.patch('/bug-reports/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const parsed = bugReportPatchSchema.parse(req.body || {});
    const report = await updateBugReport(id, {
      status: parsed.status,
      adminComment: parsed.adminComment,
    });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.post('/bug-reports/:id/reward', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await rewardBugReportAuthor(id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
