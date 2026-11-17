import { Router } from 'express';
import { z } from 'zod';
import { getConnection, query } from '../config/database.js';
import { requireAdmin } from '../middleware/admin.js';

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
  .refine(value => Object.values(value).some(Boolean), {
    message: 'Sélectionnez au moins un élément à réinitialiser.',
  });

router.use(requireAdmin);

router.get('/players', async (req, res, next) => {
  try {
    const search = String(req.query.q || '')
      .trim()
      .slice(0, 80);
    const rows = await query(
      `SELECT u.id, u.username, u.is_admin, pc.name AS character_name,
              COALESCE(s.ryos, 0) AS ryos,
              COALESCE(s.kage_coins, 0) AS kage_coins,
              COALESCE(s.card_dust, 0) AS card_dust,
              COALESCE(s.card_essence, 0) AS card_essence,
              (SELECT COUNT(*) FROM user_card_collection c WHERE c.user_id = u.id) AS collection_count,
              (SELECT COUNT(*) FROM user_decks d WHERE d.user_id = u.id) AS deck_count
       FROM users u
       LEFT JOIN sensei s ON s.user_id = u.id
       LEFT JOIN player_character pc ON pc.user_id = u.id
       WHERE u.is_bot = FALSE AND u.is_guest = FALSE
         AND (? = '' OR u.username LIKE ? OR pc.name LIKE ?)
       ORDER BY u.username
       LIMIT 100`,
      [search, `%${search}%`, `%${search}%`],
    );
    res.json({ players: rows });
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
       JOIN sensei s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_bot = FALSE AND u.is_guest = FALSE AND u.is_admin = FALSE
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!players[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Joueur introuvable ou administrateur.' });
    }

    for (const [key, column] of Object.entries(resourceFields)) {
      const amount = parsed.data[key] || 0;
      if (amount > 0) {
        await connection.execute(`UPDATE sensei SET ${column} = ${column} + ? WHERE user_id = ?`, [
          amount,
          userId,
        ]);
      }
    }
    await connection.commit();
    const [resources] = await connection.execute(
      'SELECT ryos, kage_coins, card_dust, card_essence FROM sensei WHERE user_id = ? LIMIT 1',
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
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const [players] = await connection.execute(
      `SELECT u.id FROM users u
       JOIN sensei s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_bot = FALSE AND u.is_guest = FALSE AND u.is_admin = FALSE
       LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!players[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Joueur introuvable ou administrateur.' });
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
      await connection.execute(`UPDATE sensei SET ${resourceResets.join(', ')} WHERE user_id = ?`, [
        userId,
      ]);
    }

    if (selected.level) {
      await connection.execute(
        `UPDATE player_character
         SET level = 1, xp = 0, \`rank\` = 'Genin'
         WHERE user_id = ?`,
        [userId],
      );
    }
    if (selected.talents) {
      await connection.execute('DELETE FROM user_talents WHERE user_id = ?', [userId]);
      await connection.execute('DELETE FROM user_talent_respec_history WHERE user_id = ?', [
        userId,
      ]);
      await connection.execute(
        `UPDATE player_character pc
         SET pc.talent_points_available = pc.level
         WHERE pc.user_id = ?`,
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

export default router;
