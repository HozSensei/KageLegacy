import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { utcDateString } from './dailyUtc.js';
import { grantItemToUser, countUnconsumedItemsBySlug, consumeOldestItemBySlug } from './itemGrantService.js';
import { rollPercent } from './missionRules.js';
import { addChakraDropForSealOpen } from './clanChakraWellService.js';
import { recordEliteQuestEvent } from './eliteSeasonPassService.js';
import { grantSealBaseLoot } from './combatLootService.js';

export const SEAL_ITEM_SLUG = 'sceau-chakra';
export { utcDateString } from './dailyUtc.js';
export const MAX_SEAL_STACK = 3;

function daysBetweenUtcDates(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  return Math.max(0, Math.floor((to - from) / (24 * 60 * 60 * 1000)));
}

export async function grantDailySealsForUser(userId) {
  const rows = await query(
    'SELECT last_daily_seal_grant_date FROM sensei WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const sensei = rows[0];
  if (!sensei) return { granted: 0, pending: 0 };

  const today = utcDateString();
  const lastGrant = sensei.last_daily_seal_grant_date
    ? utcDateString(new Date(sensei.last_daily_seal_grant_date))
    : null;

  let daysToGrant = 0;
  if (!lastGrant) {
    daysToGrant = 1;
  } else if (lastGrant < today) {
    daysToGrant = daysBetweenUtcDates(lastGrant, today);
  }

  const pendingBefore = await countUnconsumedItemsBySlug(userId, SEAL_ITEM_SLUG);
  let granted = 0;

  if (daysToGrant > 0) {
    const room = Math.max(0, MAX_SEAL_STACK - pendingBefore);
    const toGrant = Math.min(daysToGrant, room);
    if (toGrant > 0) {
      await grantItemToUser(userId, SEAL_ITEM_SLUG, toGrant);
      granted = toGrant;
    }
    await query('UPDATE sensei SET last_daily_seal_grant_date = ? WHERE user_id = ?', [
      today,
      userId,
    ]);
  }

  const pending = await countUnconsumedItemsBySlug(userId, SEAL_ITEM_SLUG);
  return { granted, pending, maxStack: MAX_SEAL_STACK };
}

export async function getDailySealPayload(userId) {
  await grantDailySealsForUser(userId);
  const pending = await countUnconsumedItemsBySlug(userId, SEAL_ITEM_SLUG);
  return {
    pending,
    maxStack: MAX_SEAL_STACK,
    canOpen: pending > 0,
  };
}

function rollSealLootTier() {
  const roll = rollPercent();
  if (roll <= 70) return 'common';
  if (roll <= 90) return 'rare';
  if (roll <= 99) return 'epic';
  return 'jackpot';
}

async function pickBenchNinja(userId, ninjaId = null) {
  if (ninjaId) {
    const rows = await query(
      'SELECT * FROM ninjas WHERE id = ? AND user_id = ? AND squad_position IS NULL LIMIT 1',
      [ninjaId, userId]
    );
    return rows[0] || null;
  }
  const rows = await query(
    `SELECT * FROM ninjas
     WHERE user_id = ? AND squad_position IS NULL
     ORDER BY RAND() LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

function buildSealRewardLines(baseLoot, bonus = null) {
  const lines = [];
  if (baseLoot.ryos > 0) {
    lines.push({ type: 'ryos', ryos: baseLoot.ryos });
  }
  for (const item of baseLoot.items || []) {
    lines.push({
      type: 'item',
      slug: item.slug,
      nameFr: item.nameFr ?? null,
      nameEn: item.nameEn ?? null,
    });
  }
  if (baseLoot.tacticCard?.slug) {
    lines.push({
      type: 'tactic_card',
      slug: baseLoot.tacticCard.slug,
      nameFr: baseLoot.tacticCard.nameFr ?? null,
      nameEn: baseLoot.tacticCard.nameEn ?? null,
    });
  }
  if (bonus) lines.push(bonus);
  return lines;
}

export async function openChakraSeal(userId, { ninjaId = null } = {}) {
  const consumed = await consumeOldestItemBySlug(userId, SEAL_ITEM_SLUG);
  if (!consumed) {
    const error = new Error('Aucun Sceau de Chakra à ouvrir.');
    error.statusCode = 404;
    throw error;
  }

  const tier = rollSealLootTier();
  const baseLoot =
    tier === 'epic' || tier === 'jackpot'
      ? await grantSealBaseLoot(userId, 'rare')
      : await grantSealBaseLoot(userId, tier);

  let bonus = null;
  let type = 'bundle';

  if (tier === 'epic') {
    const ninja = await pickBenchNinja(userId, ninjaId);
    if (!ninja) {
      const ryos = 200;
      await query('UPDATE sensei SET ryos = ryos + ? WHERE user_id = ?', [ryos, userId]);
      baseLoot.ryos += ryos;
      bonus = { type: 'ryos_fallback', ryos, reason: 'no_bench_ninja' };
    } else {
      const nextMoral = Math.min(20, Number(ninja.moral) + 5);
      await query('UPDATE ninjas SET moral = ? WHERE id = ?', [nextMoral, ninja.id]);
      bonus = {
        type: 'moral_boost',
        ninjaId: ninja.id,
        ninjaName: ninja.name,
        from: ninja.moral,
        to: nextMoral,
      };
    }
    type = 'bundle_epic';
  } else if (tier === 'jackpot') {
    await query('UPDATE sensei SET academy_jackpot_token = 1 WHERE user_id = ?', [userId]);
    bonus = { type: 'academy_jackpot' };
    type = 'bundle_jackpot';
  }

  const lines = buildSealRewardLines(baseLoot, bonus);
  const reward = {
    tier,
    type,
    labelKey: null,
    details: {
      loot: baseLoot,
      bonus,
      lines,
    },
  };

  const seal = await getDailySealPayload(userId);
  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);
  const well = await addChakraDropForSealOpen(userId);
  await recordEliteQuestEvent(userId, 'daily_seal_opened');
  return {
    reward,
    seal,
    ryos: senseiRows[0]?.ryos ?? 0,
    well,
  };
}

export async function grantDailySealsForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    results.push({ userId: user.id, ...(await grantDailySealsForUser(user.id)) });
  }
  return results;
}
