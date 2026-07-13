/**
 * Reset global de saison : conserve comptes, clans, rouleaux d'héritage et abonnements Élite.
 */

import { query, getConnection } from '../config/database.js';
import { resetCycle, setCycleStartAt } from './gameClock.js';
import { activateEliteFromStripe } from './eliteSubscriptionService.js';
import { joinOrCreatePool } from './poolService.js';
import { provisionStarterSquad } from './starterSquadService.js';
import { grantStarterTacticCards } from './tacticCards/tacticCardService.js';

const SENSEI_RESET_SQL = `
  UPDATE sensei s
  JOIN users u ON u.id = s.user_id
  SET
    s.ryos = 10000,
    s.reputation = 0,
    s.chakra_pool = 100,
    s.salary_debt = FALSE,
    s.scout_env_confirmed_cycle = NULL,
    s.last_daily_seal_grant_date = NULL,
    s.academy_last_rotation_date = NULL,
    s.academy_jackpot_token = 0,
    s.clan_board_recommended_cycle = NULL
  WHERE u.is_bot = FALSE
`;

export async function snapshotActiveEliteSubscriptions() {
  return query(
    `SELECT user_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
            current_period_start, current_period_end
     FROM sensei_elite_subscriptions
     WHERE status = 'active'`
  );
}

export async function listHumanPlayers() {
  return query(
    `SELECT u.id AS user_id, u.is_guest, s.language, s.name AS sensei_name
     FROM users u
     JOIN sensei s ON s.user_id = u.id
     WHERE u.is_bot = FALSE
     ORDER BY u.id ASC`
  );
}

export async function collectSeasonResetPreview() {
  const [
    humans,
    eliteSubs,
    heritageScrolls,
    clans,
    pools,
    ninjas,
    matches,
    notifications,
  ] = await Promise.all([
    listHumanPlayers(),
    snapshotActiveEliteSubscriptions(),
    query('SELECT COUNT(*) AS count FROM heritage_scrolls'),
    query('SELECT COUNT(*) AS count FROM player_clans'),
    query('SELECT COUNT(*) AS count FROM pools'),
    query('SELECT COUNT(*) AS count FROM ninjas'),
    query('SELECT COUNT(*) AS count FROM matches'),
    query('SELECT COUNT(*) AS count FROM sensei_notifications'),
  ]);

  return {
    humanPlayers: humans.length,
    activeEliteSubscriptions: eliteSubs.length,
    heritageScrollsKept: Number(heritageScrolls[0]?.count ?? 0),
    clansKept: Number(clans[0]?.count ?? 0),
    poolsToDelete: Number(pools[0]?.count ?? 0),
    ninjasToDelete: Number(ninjas[0]?.count ?? 0),
    matchesToDelete: Number(matches[0]?.count ?? 0),
    notificationsToDelete: Number(notifications[0]?.count ?? 0),
    humans,
    eliteSubs,
  };
}

async function purgeGameplayState(connection) {
  const exec = (sql, params = []) => connection.execute(sql, params);

  await exec(
    `UPDATE player_listings SET status = 'cancelled' WHERE status = 'active'`
  );
  await exec(`DELETE FROM ninja_equipment`);
  await exec(`DELETE FROM idle_missions`);
  await exec(`DELETE FROM academy_draws`);
  await exec(`DELETE FROM market_offers`);
  await exec(`DELETE FROM village_shop_stock`);
  await exec(`DELETE FROM village_shop_promos`);
  await exec(`DELETE FROM village_shop_card_stock`);
  await exec(`DELETE FROM sensei_notifications`);
  await exec(`DELETE FROM elite_quest_progress`);
  await exec(`DELETE FROM elite_season_passes`);
  await exec(`DELETE FROM operation_decks`);
  await exec(`DELETE FROM player_listings`);
  await exec(`DELETE FROM user_tactic_cards`);
  await exec(`DELETE FROM user_items`);
  await exec(`DELETE FROM ninjas`);
  await exec(`DELETE FROM cycle_job_runs`);
  await exec(`DELETE FROM pools`);
  await exec(`DELETE FROM users WHERE is_bot = TRUE`);
  await exec(SENSEI_RESET_SQL);
  await exec(`UPDATE player_clans SET well_drops = 0`);
  await exec(`DELETE FROM clan_academy_board WHERE recruited_by_user_id IS NULL`);
}

async function reinitializeHumanPlayers(humans, seasonNumber) {
  const results = [];

  for (const human of humans) {
    try {
      await joinOrCreatePool(human.user_id, { seasonNumber });
      await provisionStarterSquad(human.user_id, human.language || 'fr');
      await grantStarterTacticCards(human.user_id);
      results.push({ userId: human.user_id, senseiName: human.sensei_name, ok: true });
    } catch (error) {
      results.push({
        userId: human.user_id,
        senseiName: human.sensei_name,
        ok: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function restoreEliteSubscriptions(eliteSnapshots, seasonNumber) {
  const restored = [];

  for (const sub of eliteSnapshots) {
    const poolRows = await query(
      `SELECT p.id FROM pools p
       JOIN pool_members pm ON pm.pool_id = p.id
       WHERE pm.user_id = ? AND p.status = 'active'
       LIMIT 1`,
      [sub.user_id]
    );
    const poolId = poolRows[0]?.id;
    if (!poolId) {
      restored.push({ userId: sub.user_id, ok: false, error: 'pool_not_found' });
      continue;
    }

    try {
      await activateEliteFromStripe({
        userId: sub.user_id,
        poolId,
        seasonNumber,
        stripeCustomerId: sub.stripe_customer_id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        stripeCheckoutSessionId: sub.stripe_checkout_session_id,
      });
      restored.push({ userId: sub.user_id, poolId, ok: true });
    } catch (error) {
      restored.push({ userId: sub.user_id, ok: false, error: error.message });
    }
  }

  return restored;
}

/**
 * Reset global de saison.
 * @param {object} options
 * @param {number} [options.seasonNumber=1]
 * @param {string|null} [options.cycleStartAt] ISO 8601 pour ancrer H0 (sinon maintenant)
 * @param {boolean} [options.dryRun=false]
 */
export async function hardSeasonReset({
  seasonNumber = 1,
  cycleStartAt = null,
  dryRun = false,
} = {}) {
  const preview = await collectSeasonResetPreview();

  if (dryRun) {
    return {
      dryRun: true,
      seasonNumber,
      cycleStartAt,
      preview,
    };
  }

  const eliteSnapshots = preview.eliteSubs;
  const humans = preview.humans;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await purgeGameplayState(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const clock = cycleStartAt ? await setCycleStartAt(cycleStartAt) : await resetCycle();
  const playerResults = await reinitializeHumanPlayers(humans, seasonNumber);
  const eliteResults = await restoreEliteSubscriptions(eliteSnapshots, seasonNumber);

  const failedPlayers = playerResults.filter((row) => !row.ok);
  const failedElite = eliteResults.filter((row) => !row.ok);

  return {
    dryRun: false,
    seasonNumber,
    clock: {
      hour: clock.hour,
      cycleStartAt: clock.cycleStartAt,
      phase: clock.phase,
    },
    preview: {
      humanPlayers: humans.length,
      activeEliteSubscriptions: eliteSnapshots.length,
      heritageScrollsKept: preview.heritageScrollsKept,
      clansKept: preview.clansKept,
    },
    players: {
      total: playerResults.length,
      succeeded: playerResults.length - failedPlayers.length,
      failed: failedPlayers,
    },
    elite: {
      total: eliteResults.length,
      succeeded: eliteResults.length - failedElite.length,
      failed: failedElite,
    },
  };
}
