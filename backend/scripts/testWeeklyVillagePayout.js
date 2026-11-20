import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import pool, { query } from '../src/config/database.js';
import { ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS as REWARD } from '../src/config/economyConfig.js';
import {
  getFactionStandings,
  insertAsyncDuel,
  updateAsyncDuel,
} from '../src/services/asyncDuelRepository.js';
import {
  getVillageRewards,
  lockWeeklyVillageWrites,
  markVillageRewardsRead,
  settleWeeklyVillageRewards,
} from '../src/services/asyncDuelWeeklyRewards.js';
import { setFaction, retakeFaction } from '../src/services/factionService.js';
import { createCharacter } from '../src/services/playerCharacterService.js';

const enabled = process.env.RUN_WEEKLY_PAYOUT_DB_TESTS === 'true';
const [MIDO, KARENO] = ['midorihara', 'kareno'];
const WALLET_MAX = 2147483647;
const WEEK_SECONDS = 7 * 24 * 3600;
const iso = seconds => new Date(seconds * 1000).toISOString().slice(0, 10);

after(() => pool.end());

// UTC_TIMESTAMP still runs in MySQL; only this fixture transaction's session clock is set.
async function atTime(seconds, work) {
  const getConnection = pool.getConnection;
  const connection = await pool.getConnection();
  try {
    await connection.query('SET timestamp = ?', [seconds]);
    pool.getConnection = async () => ({
      beginTransaction: connection.beginTransaction.bind(connection),
      execute: connection.execute.bind(connection),
      commit: connection.commit.bind(connection),
      rollback: connection.rollback.bind(connection),
      release: () => {},
    });
    return await work();
  } finally {
    pool.getConnection = getConnection;
    await connection.query('SET timestamp = DEFAULT');
    connection.release();
  }
}

async function player(hasUnaffiliatedCharacter = false) {
  const name = `weekly_${randomUUID()}`;
  const { insertId: id } = await query('INSERT INTO users (username) VALUES (?)', [name]);
  await query(
    `INSERT INTO player_profiles (user_id, display_name, character_name, ryos)
     VALUES (?, ?, ?, 100)`,
    [id, name, hasUnaffiliatedCharacter ? name : null]
  );
  return { id, name };
}

const create = (p, factionId) => createCharacter(p.id, { name: p.name, factionId });
const wallets = () =>
  query('SELECT user_id, ryos, kage_coins FROM player_profiles ORDER BY user_id');
const ledger = () =>
  query(`SELECT DATE_FORMAT(week_start, '%Y-%m-%d') AS week, user_id, ryos
                            FROM async_duel_weekly_reward_ledger ORDER BY week, user_id`);
const settlements = () =>
  query(`SELECT DATE_FORMAT(week_start, '%Y-%m-%d') AS week,
                                  winner_faction_id AS winner, reward_ryos AS reward
                                  FROM async_duel_weekly_settlements ORDER BY week`);
const cursor = async () =>
  (
    await query(`SELECT DATE_FORMAT(next_week_start, '%Y-%m-%d') AS week
                                        FROM async_duel_weekly_state WHERE id = 1`)
  )[0].week;

async function score(attacker, defender, attackerFaction, defenderFaction, seconds) {
  const duel = await insertAsyncDuel({
    id: randomUUID(),
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerName: attacker.name,
    defenderName: defender.name,
    mode: 'enemy_faction',
    attackerFaction,
    defenderFaction,
    state: { state: 'in_progress' },
  });
  await atTime(seconds, () =>
    updateAsyncDuel({
      id: duel.id,
      attackerId: attacker.id,
      revision: duel.revision,
      state: { state: 'victory' },
    })
  );
  const [point] = await query(
    `SELECT DATE_FORMAT(week_start, '%Y-%m-%d') AS week FROM async_duel_faction_points WHERE duel_id = ?`,
    [duel.id]
  );
  return point.week;
}

test(
  'weekly village payout in a freshly migrated, disposable MySQL database',
  {
    skip: !enabled && 'Set RUN_WEEKLY_PAYOUT_DB_TESTS=true with a fresh disposable *_test DB',
  },
  async () => {
    assert.match(process.env.DB_NAME ?? '', /_test$/);
    const [db] = await query(`SELECT DATABASE() AS name,
    (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM async_duel_faction_points) +
    (SELECT COUNT(*) FROM async_duel_weekly_settlements) AS existing`);
    assert.equal(db.name, process.env.DB_NAME);
    assert.equal(Number(db.existing), 0, 'test only on a fresh disposable database');

    const initial = await getFactionStandings();
    assert.equal(initial.rewardRyos, 50);
    assert.equal(initial.firstRewardWeekStart, initial.weekEnd);
    assert.equal(await cursor(), initial.firstRewardWeekStart);

    const current = Date.parse(`${initial.weekStart}T00:00:00Z`) / 1000;
    const previous = current - WEEK_SECONDS;
    const zero = previous - WEEK_SECONDS;
    const tie = zero - WEEK_SECONDS;
    const first = tie - WEEK_SECONDS;
    const before = first - WEEK_SECONDS;
    const [idle, left, switchedIn, exactJoin, lateCreation, scorer, rival, rival2] =
      await Promise.all([
        player(),
        player(),
        player(),
        player(true),
        player(),
        player(),
        player(),
        player(),
      ]);
    await atTime(first - 1, async () => {
      await create(idle, MIDO);
      await create(left, MIDO);
      await create(switchedIn, KARENO);
      await create(scorer, MIDO);
      await create(rival, KARENO);
      await create(rival2, KARENO);
    });
    await atTime(first, () => setFaction(exactJoin.id, MIDO));
    await atTime(first + 1, async () => {
      await create(lateCreation, MIDO);
      await retakeFaction(left.id, KARENO);
      await retakeFaction(switchedIn.id, MIDO);
      await assert.rejects(retakeFaction(left.id, MIDO), { statusCode: 403 });
    });
    assert.equal(
      (await query('SELECT id FROM async_duel_village_membership WHERE user_id = ?', [left.id]))
        .length,
      2
    );

    assert.equal(await score(scorer, rival, MIDO, KARENO, before), iso(before));
    assert.equal(
      await settleWeeklyVillageRewards(),
      0,
      'historical points do not backdate installation'
    );
    assert.deepEqual(await settlements(), []);
    assert.equal(await score(scorer, rival, MIDO, KARENO, tie - 1), iso(first));
    assert.equal(await score(scorer, rival, MIDO, KARENO, tie), iso(tie));
    assert.equal(await score(rival2, scorer, KARENO, MIDO, tie + 1), iso(tie));
    assert.equal(await score(scorer, rival, MIDO, KARENO, previous), iso(previous));
    assert.equal(await score(rival2, scorer, KARENO, MIDO, previous + 1), iso(previous));
    assert.equal(await score(scorer, rival, MIDO, KARENO, current), iso(current));

    const observation = (await getFactionStandings()).previousWeek;
    assert.equal(observation.winnerId, null);
    assert.equal(observation.settled, false);
    assert.equal(observation.rewardRyos, 0);
    assert.equal(await settleWeeklyVillageRewards(), 0);

    // Simulate an installation and weeks of downtime without wiping or altering unrelated data.
    await query(
      `UPDATE async_duel_weekly_state SET installed_at = ?, first_week_start = ?,
               next_week_start = ? WHERE id = 1`,
      [iso(before), iso(first), iso(first)]
    );
    const baseline = await wallets();
    await query('UPDATE player_profiles SET ryos = ? WHERE user_id = ?', [WALLET_MAX, idle.id]);
    const beforeFailure = await wallets();
    await assert.rejects(
      settleWeeklyVillageRewards(),
      /Could not credit every weekly village reward/
    );
    assert.deepEqual(
      await wallets(),
      beforeFailure,
      'rolls back even wallets that could be credited'
    );
    assert.deepEqual(await ledger(), []);
    assert.deepEqual(await settlements(), []);
    assert.equal(await cursor(), iso(first));
    await query('UPDATE player_profiles SET ryos = 100 WHERE user_id = ?', [idle.id]);

    // A final old-week point started before rollover must be visible before deciding a winner.
    const writer = await pool.getConnection();
    let runners;
    try {
      await writer.beginTransaction();
      await lockWeeklyVillageWrites(writer);
      // Different pair from the two existing points; the fixture need not pay duel Ryos again.
      const [pairLow, pairHigh] = [lateCreation.id, rival2.id].sort((a, b) => a - b);
      await writer.execute(
        `INSERT INTO async_duel_faction_points
      (week_start, pair_low_id, pair_high_id, winner_id, faction_id, scored_on, winner_slot)
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [iso(previous), pairLow, pairHigh, lateCreation.id, MIDO, iso(previous)]
      );
      runners = Promise.all([settleWeeklyVillageRewards(), settleWeeklyVillageRewards()]);
      await wait(30);
      assert.deepEqual(await settlements(), [], 'settlement waits for the active writer');
      await writer.commit();
      assert.equal(
        (await runners).reduce((sum, count) => sum + count, 0),
        4
      );
    } finally {
      await writer.rollback();
      writer.release();
      await runners;
    }

    assert.equal(await cursor(), iso(current));
    assert.equal(await settleWeeklyVillageRewards(), 0, 'repeated catch-up is a no-op');
    assert.deepEqual(await settlements(), [
      { week: iso(first), winner: MIDO, reward: REWARD },
      { week: iso(tie), winner: null, reward: 0 },
      { week: iso(zero), winner: null, reward: 0 },
      { week: iso(previous), winner: MIDO, reward: REWARD },
    ]);
    const cohort = [
      [iso(first), [idle, left, exactJoin, scorer]],
      [iso(previous), [idle, switchedIn, exactJoin, lateCreation, scorer]],
    ];
    assert.deepEqual(
      await ledger(),
      cohort.flatMap(([week, members]) =>
        members
          .map(p => p.id)
          .sort((a, b) => a - b)
          .map(user_id => ({ week, user_id, ryos: REWARD }))
      )
    );
    assert.deepEqual(
      await wallets(),
      baseline.map(row => ({
        ...row,
        ryos:
          row.ryos +
          REWARD * cohort.filter(([, members]) => members.some(p => p.id === row.user_id)).length,
      }))
    );

    const leftReceipts = await getVillageRewards(left.id);
    assert.equal(leftReceipts.unreadCount, 1);
    assert.deepEqual(
      leftReceipts.rewards.map(({ weekStart, factionId, ryos }) => ({
        weekStart,
        factionId,
        ryos,
      })),
      [{ weekStart: iso(first), factionId: MIDO, ryos: REWARD }],
      'receipts reflect actual payout, not current membership or standings'
    );
    assert.deepEqual(await getVillageRewards(rival.id), { rewards: [], unreadCount: 0 });

    const standings = await getFactionStandings();
    assert.equal(standings.firstRewardWeekStart, iso(first));
    assert.equal(standings.previousWeek.weekStart, iso(previous));
    assert.equal(standings.previousWeek.weekEnd, iso(current));
    assert.equal(standings.previousWeek.winnerId, MIDO);
    assert.equal(standings.previousWeek.settled, true);
    assert.equal(standings.previousWeek.rewardRyos, REWARD);
  }
);

test(
  'weekly receipts are limited, personal, and acknowledged only through a real receipt',
  { skip: !enabled && 'Set RUN_WEEKLY_PAYOUT_DB_TESTS=true with a fresh disposable *_test DB' },
  async () => {
    assert.match(process.env.DB_NAME ?? '', /_test$/);
    const [db] = await query('SELECT DATABASE() AS name');
    assert.equal(db.name, process.env.DB_NAME);
    const [owner, other] = await Promise.all([player(), player()]);
    const opening = Date.parse('2000-01-03T00:00:00Z') / 1000;
    const week = i => iso(opening + i * WEEK_SECONDS);
    const settledAt = '2001-01-01T06:07:08.123Z';
    async function settleFixture(i, receipts) {
      await query(
        `INSERT INTO async_duel_weekly_settlements VALUES (?, ?, ?, '2001-01-01 06:07:08.123456')`,
        [week(i), MIDO, REWARD]
      );
      for (const { id } of receipts) {
        await query(
          `INSERT INTO async_duel_weekly_reward_ledger (week_start, user_id, ryos) VALUES (?, ?, ?)`,
          [week(i), id, i + 1]
        );
      }
    }

    for (let i = 0; i < 22; i += 1) await settleFixture(i, [owner]);
    await settleFixture(22, [owner, other]);
    await settleFixture(23, [other]);
    const shown = await getVillageRewards(owner.id);
    assert.deepEqual(shown, {
      rewards: Array.from({ length: 20 }, (_, j) => ({
        weekStart: week(22 - j),
        weekEnd: week(23 - j),
        ryos: 23 - j,
        factionId: MIDO,
        settledAt,
      })),
      unreadCount: 23,
    });

    // The next payout commits after the history was viewed, before it is acknowledged.
    await settleFixture(24, [owner]);
    assert.deepEqual(await markVillageRewardsRead(owner.id, week(25)), { unreadCount: 24 });
    assert.deepEqual(await markVillageRewardsRead(owner.id, week(23)), { unreadCount: 24 });
    const through = shown.rewards[0].weekStart;
    assert.deepEqual(await markVillageRewardsRead(owner.id, through), { unreadCount: 1 });
    const readTimestamps = () =>
      query(
        `SELECT DATE_FORMAT(read_at, '%Y-%m-%d %H:%i:%s.%f') AS readAt
       FROM async_duel_weekly_reward_ledger WHERE user_id = ? ORDER BY week_start`,
        [owner.id]
      );
    const firstRead = await readTimestamps();
    assert.ok(
      firstRead.slice(0, 23).every(({ readAt }) => readAt && readAt === firstRead[0].readAt)
    );
    assert.equal(firstRead[23].readAt, null);
    assert.deepEqual(await markVillageRewardsRead(owner.id, through), { unreadCount: 1 });
    assert.deepEqual(await markVillageRewardsRead(owner.id, week(0)), { unreadCount: 1 });
    assert.deepEqual(await readTimestamps(), firstRead);
    assert.equal((await getVillageRewards(owner.id)).unreadCount, 1);
    assert.equal((await getVillageRewards(other.id)).unreadCount, 2);
  }
);
