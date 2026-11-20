import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import pool, { query } from '../src/config/database.js';
import {
  getDuelOverview,
  getFactionStandings,
  insertAsyncDuel,
  loadAsyncDuel,
  updateAsyncDuel,
} from '../src/services/asyncDuelRepository.js';

const prefix = `test_async_duel_${randomUUID()}`;
const accounts = [];
const IN_PROGRESS = { state: 'in_progress', turn: 1, deck: ['card'] };
const VICTORY = { state: 'victory' };
const DEFEAT = { state: 'defeat' };
const INITIAL_RYOS = 100;
const [MIDO, KARENO, OBORO] = ['midorihara', 'kareno', 'oborohama'];

async function player() {
  const name = `${prefix}-${accounts.length}-${randomUUID().slice(0, 8)}`;
  const { insertId: id } = await query('INSERT INTO users (username) VALUES (?)', [name]);
  accounts.push(id);
  await query('INSERT INTO player_profiles (user_id, display_name, ryos) VALUES (?, ?, ?)', [
    id,
    name,
    INITIAL_RYOS,
  ]);
  return { id, name };
}

function duelInput(attacker, defender, options = {}) {
  return {
    id: randomUUID(),
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerName: attacker.name,
    defenderName: defender.name,
    mode: 'friend',
    state: IN_PROGRESS,
    ...options,
  };
}

function advance(duel, state, revision = duel.revision) {
  return updateAsyncDuel({ id: duel.id, attackerId: duel.attackerId, revision, state });
}

async function play(attacker, defender, outcome, options) {
  return advance(await insertAsyncDuel(duelInput(attacker, defender, options)), outcome);
}

async function wallet(userId) {
  const [row] = await query('SELECT ryos, kage_coins FROM player_profiles WHERE user_id = ?', [
    userId,
  ]);
  return row;
}

async function rewardFor(duelId) {
  const [row] = await query(
    `SELECT ryos, winner_side AS side, beneficiary_id AS beneficiary, beneficiary_slot AS slot,
            DATE_FORMAT(credited_on, '%Y-%m-%d') AS day
     FROM async_duel_reward_ledger WHERE duel_id = ?`,
    [duelId],
  );
  return row;
}

async function pointFor(duelId) {
  const [row] = await query(
    `SELECT winner_id AS winner, faction_id AS faction, winner_slot AS slot,
            DATE_FORMAT(scored_on, '%Y-%m-%d') AS day, DATE_FORMAT(week_start, '%Y-%m-%d') AS week
     FROM async_duel_faction_points WHERE duel_id = ?`,
    [duelId],
  );
  return row;
}

function deleteAccount(id) {
  return query('DELETE FROM users WHERE id = ?', [id]);
}

after(async () => {
  try {
    if (!accounts.length) return;
    const placeholders = accounts.map(() => '?').join(',');
    await query(
      `DELETE FROM async_duel_faction_points
       WHERE pair_low_id IN (${placeholders}) OR pair_high_id IN (${placeholders})`,
      [...accounts, ...accounts],
    );
    await query(
      `DELETE FROM async_duel_reward_ledger
       WHERE attacker_id IN (${placeholders}) OR defender_id IN (${placeholders})`,
      [...accounts, ...accounts],
    );
    await query(`DELETE FROM users WHERE id IN (${placeholders})`, accounts);
  } finally {
    await pool.end();
  }
});

test('mode requis, aucun opt-in, snapshots des noms et gains vus du bon côté', async () => {
  const attacker = await player();
  const defender = await player();
  const input = duelInput(attacker, defender, { mode: 'enemy_faction' });
  await assert.rejects(insertAsyncDuel({ ...input, mode: undefined }), TypeError);
  await assert.rejects(insertAsyncDuel({ ...input, defenderFaction: 'unknown' }), TypeError);
  await assert.rejects(insertAsyncDuel(duelInput(attacker, attacker)), { code: 'ASYNC_DUEL_SELF' });
  await assert.rejects(insertAsyncDuel({ ...input, state: DEFEAT }), TypeError);
  const duel = await insertAsyncDuel({ ...input, attackerFaction: MIDO });
  assert.deepEqual(duel, { ...input, revision: 0, outcome: null, finishedAt: null, reward: 0 });
  assert.deepEqual(await getDuelOverview(attacker.id), { activeDuelId: duel.id, defenses: [] });
  assert.deepEqual(await getDuelOverview(defender.id), { activeDuelId: null, defenses: [] });
  await query('UPDATE player_profiles SET display_name = ? WHERE user_id = ?', [
    'renamed',
    attacker.id,
  ]);
  const won = await advance(duel, VICTORY);
  assert.equal(won.reward, 10);
  assert.deepEqual(await getDuelOverview(defender.id), {
    activeDuelId: null,
    defenses: [
      {
        id: duel.id,
        opponentName: attacker.name,
        reward: 0,
        finishedAt: won.finishedAt,
        outcome: 'victory',
      },
    ],
  });
  assert.deepEqual(await wallet(attacker.id), { ryos: INITIAL_RYOS + 10, kage_coins: 0 });
  assert.equal((await wallet(defender.id)).ryos, INITIAL_RYOS);
  assert.equal(await pointFor(duel.id), undefined);
});

test('unicité du duel actif, propriété, CAS concurrent et finalisation irréversible', async () => {
  const [attacker, defender, other] = await Promise.all(Array.from({ length: 3 }, player));
  const competingInserts = await Promise.allSettled([
    insertAsyncDuel(duelInput(attacker, defender)),
    insertAsyncDuel(duelInput(attacker, other)),
  ]);
  const [{ value: duel }] = competingInserts.filter(({ status }) => status === 'fulfilled');
  const [{ reason }] = competingInserts.filter(({ status }) => status === 'rejected');
  assert.equal(reason.code, 'ASYNC_DUEL_CONFLICT');
  assert.equal(await loadAsyncDuel(duel.id, duel.defenderId), null);
  assert.equal(
    await updateAsyncDuel({ ...duel, attackerId: duel.defenderId, state: DEFEAT }),
    null,
  );

  const updates = await Promise.all([
    advance(duel, { ...IN_PROGRESS, turn: 2 }),
    advance(duel, { ...IN_PROGRESS, turn: 3 }),
  ]);
  assert.equal(updates.filter(Boolean).length, 1);
  const [advanced] = updates.filter(Boolean);
  assert.equal(advanced.revision, 1);
  assert.deepEqual(await loadAsyncDuel(duel.id, attacker.id), advanced);
  assert.equal(await advance(duel, DEFEAT), null);

  const results = (
    await Promise.all([advance(advanced, DEFEAT), advance(advanced, DEFEAT)])
  ).filter(Boolean);
  assert.equal(results.length, 1);
  const [finished] = results;
  assert.equal(finished.revision, 2);
  assert.equal(finished.reward, 0);
  assert.match(finished.finishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(await rewardFor(duel.id), {
    day: finished.finishedAt.slice(0, 10),
    ryos: 10,
    side: 'defender',
    beneficiary: duel.defenderId,
    slot: 1,
  });
  assert.equal((await getDuelOverview(duel.defenderId)).defenses[0].reward, 10);
  assert.deepEqual(await wallet(duel.defenderId), { ryos: INITIAL_RYOS + 10, kage_coins: 0 });
  assert.equal(await advance(finished, IN_PROGRESS), null);
  assert.equal((await getDuelOverview(attacker.id)).activeDuelId, null);
  assert.equal((await insertAsyncDuel(duelInput(attacker, defender))).revision, 0);
});

test('abandons sans gain ni point, même sur un duel de factions opposées', async () => {
  const [attacker, defender] = await Promise.all([player(), player()]);
  for (const state of [
    { state: 'forfeit' },
    { state: 'forfeited' },
    { state: 'defeat', endReason: 'forfeit' },
    { state: 'victory', endReason: 'forfeit' },
  ]) {
    const finished = await play(attacker, defender, state, {
      mode: 'enemy_faction',
      attackerFaction: MIDO,
      defenderFaction: KARENO,
    });
    assert.equal(finished.outcome, 'forfeited');
    assert.equal(finished.reward, 0);
    assert.equal(await rewardFor(finished.id), undefined);
    assert.equal(await pointFor(finished.id), undefined);
  }
});

test('paire non orientée sous concurrence : un crédit par jour, un point par semaine UTC', async () => {
  const [a, b] = await Promise.all([player(), player()]);
  const [ab, ba] = await Promise.all([
    insertAsyncDuel(
      duelInput(a, b, { mode: 'random', attackerFaction: MIDO, defenderFaction: KARENO }),
    ),
    insertAsyncDuel(
      duelInput(b, a, { mode: 'enemy_faction', attackerFaction: KARENO, defenderFaction: MIDO }),
    ),
  ]);
  const results = await Promise.all([advance(ab, VICTORY), advance(ba, VICTORY)]);
  assert.deepEqual(results.map(({ reward }) => reward).sort(), [0, 10]);
  const [scored] = (await Promise.all(results.map(({ id }) => pointFor(id)))).filter(Boolean);
  assert.equal((await wallet(a.id)).ryos + (await wallet(b.id)).ryos, 2 * INITIAL_RYOS + 10);
  assert.equal(
    (await Promise.all(results.map(({ id }) => pointFor(id)))).filter(Boolean).length,
    1,
  );
  assert.equal(scored.faction, scored.winner === a.id ? MIDO : KARENO);

  const credited = results.find(({ reward }) => reward > 0);
  // Fait vieillir le crédit seulement : le même adversaire ne rapporte toujours pas de point.
  await query(
    'UPDATE async_duel_reward_ledger SET credited_on = DATE_SUB(credited_on, INTERVAL 1 DAY) WHERE duel_id = ?',
    [credited.id],
  );
  const replay = await play(a, b, VICTORY, {
    mode: 'random',
    attackerFaction: MIDO,
    defenderFaction: KARENO,
  });
  assert.equal(replay.reward, 10);
  assert.equal(await pointFor(replay.id), undefined);
});

test('plafonds partagés entre victoires en attaque et en défense, même sous concurrence et après suppression', async () => {
  const winner = await player();
  const opponents = await Promise.all(Array.from({ length: 6 }, player));
  const options = { mode: 'enemy_faction', attackerFaction: MIDO, defenderFaction: KARENO };
  const attacked = await play(winner, opponents[0], VICTORY, options);
  assert.equal(attacked.reward, 10);
  assert.equal((await pointFor(attacked.id)).faction, MIDO);
  const duels = await Promise.all(
    opponents.slice(1, 5).map(opponent =>
      insertAsyncDuel(
        duelInput(opponent, winner, {
          ...options,
          attackerFaction: KARENO,
          defenderFaction: MIDO,
        }),
      ),
    ),
  );
  const finished = await Promise.all(duels.map(duel => advance(duel, DEFEAT)));
  assert.ok(finished.every(({ reward }) => reward === 0));
  const defenses = (await getDuelOverview(winner.id)).defenses;
  assert.deepEqual(defenses.map(({ reward }) => reward).sort(), [0, 0, 10, 10]);
  assert.deepEqual(
    defenses.map(({ finishedAt }) => finishedAt),
    defenses
      .map(({ finishedAt }) => finishedAt)
      .sort()
      .reverse(),
  );
  const [first, ...defensePoints] = (
    await Promise.all([attacked, ...finished].map(({ id }) => pointFor(id)))
  ).filter(Boolean);
  assert.equal(first.slot, 1);
  assert.deepEqual(
    defensePoints.map(({ faction }) => faction),
    [MIDO, MIDO],
  );
  assert.deepEqual(defensePoints.map(({ slot }) => slot).sort(), [2, 3]);
  assert.equal((await wallet(winner.id)).ryos, INITIAL_RYOS + 30);

  await deleteAccount(opponents[0].id);
  assert.equal(await loadAsyncDuel(attacked.id, winner.id), null);
  const [retained] = await query(
    'SELECT defender_id, duel_id FROM async_duel_reward_ledger WHERE beneficiary_id = ? AND beneficiary_slot = 1',
    [winner.id],
  );
  assert.deepEqual(retained, { defender_id: null, duel_id: null });
  const extra = await play(winner, opponents[5], VICTORY, options);
  assert.equal(extra.reward, 0);
  assert.equal(await pointFor(extra.id), undefined);
  assert.equal((await wallet(winner.id)).ryos, INITIAL_RYOS + 30);
});

test('les gains historiques restent côté défenseur et occupent la paire et le quota', async () => {
  const [a, b] = await Promise.all([player(), player()]);
  // Deux crédits historiques opposés sont possibles et doivent rester lisibles, sans re-crédit.
  for (const [attacker, defender] of [
    [a, b],
    [b, a],
  ]) {
    const input = duelInput(attacker, defender);
    await query(
      `INSERT INTO async_duels (id, attacker_id, defender_id, attacker_name, defender_name, state_json, outcome, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, 'defeat', UTC_TIMESTAMP(3))`,
      [input.id, attacker.id, defender.id, attacker.name, defender.name, JSON.stringify(DEFEAT)],
    );
    await query(
      `INSERT INTO async_duel_reward_ledger (duel_id, attacker_id, defender_id, credited_on, beneficiary_slot, ryos)
       VALUES (?, ?, ?, UTC_DATE(), 1, 10)`,
      [input.id, attacker.id, defender.id],
    );
    const loaded = await loadAsyncDuel(input.id, attacker.id);
    assert.equal(loaded.mode, null);
    assert.equal(loaded.reward, 0);
    assert.equal((await getDuelOverview(defender.id)).defenses[0].reward, 10);
  }
  const replay = await play(a, b, VICTORY);
  assert.equal(replay.reward, 0);
  assert.equal(await rewardFor(replay.id), undefined);
  const fresh = await play(a, await player(), VICTORY);
  assert.equal((await rewardFor(fresh.id)).slot, 2);
  assert.equal((await wallet(a.id)).ryos, INITIAL_RYOS + 10);
});

test('classement : factions prises au départ, semaines UTC et aucun vainqueur en cas d’égalité', async () => {
  const baseline = await getFactionStandings();
  const pointsFor = (standings, id) => standings?.factions.find(f => f.id === id)?.points ?? 0;
  const [a, b, c, d] = await Promise.all(Array.from({ length: 4 }, player));
  const options = { mode: 'random', attackerFaction: MIDO, defenderFaction: KARENO };
  const start = await insertAsyncDuel(duelInput(a, b, options));
  await query('UPDATE player_profiles SET character_faction_id = ? WHERE user_id IN (?, ?)', [
    OBORO,
    a.id,
    b.id,
  ]);
  const scored = await advance(start, VICTORY);
  const point = await pointFor(scored.id);
  assert.equal(point.faction, MIDO);
  assert.equal(point.day, scored.finishedAt.slice(0, 10));
  assert.equal(point.week, baseline.weekStart);
  assert.equal(new Date(`${baseline.weekStart}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(Date.parse(baseline.weekEnd) - Date.parse(baseline.weekStart), 7 * 86_400_000);
  assert.equal(pointsFor(await getFactionStandings(), MIDO), pointsFor(baseline, MIDO) + 1);
  for (const excluded of [
    { mode: 'friend' },
    { defenderFaction: MIDO },
    { defenderFaction: null },
  ]) {
    const duel = await play(a, c, VICTORY, { ...options, ...excluded });
    assert.equal(await pointFor(duel.id), undefined);
  }

  // Déplace les points de test à la semaine passée sans modifier l'horloge du serveur.
  const toPreviousWeek = id =>
    query(
      `UPDATE async_duel_faction_points SET week_start = DATE_SUB(week_start, INTERVAL 7 DAY),
      scored_on = DATE_SUB(scored_on, INTERVAL 7 DAY) WHERE duel_id = ?`,
      [id],
    );
  await toPreviousWeek(scored.id);
  const prev = (await getFactionStandings()).previousWeek;
  assert.equal(prev.weekEnd, baseline.weekStart);
  assert.equal(pointsFor(prev, MIDO), pointsFor(baseline.previousWeek, MIDO) + 1);
  if (!baseline.previousWeek) assert.equal(prev.winnerId, MIDO);
  const scoredOther = await play(c, d, DEFEAT, options);
  await toPreviousWeek(scoredOther.id);
  if (!baseline.previousWeek)
    assert.equal((await getFactionStandings()).previousWeek.winnerId, null);
  const again = await play(a, b, VICTORY, options);
  assert.equal(again.reward, 0); // Le crédit du jour n'a pas bougé.
  assert.equal((await pointFor(again.id)).week, baseline.weekStart);
});

test('rollback du résultat, du crédit et des points si le portefeuille ne peut pas être crédité', async () => {
  const [a, b] = await Promise.all([player(), player()]);
  const duel = await insertAsyncDuel(
    duelInput(a, b, { mode: 'random', attackerFaction: MIDO, defenderFaction: KARENO }),
  );
  await query('UPDATE player_profiles SET ryos = 2147483647 WHERE user_id = ?', [b.id]);
  await assert.rejects(advance(duel, DEFEAT), { code: 'ASYNC_DUEL_REWARD_FAILED' });
  assert.deepEqual(await loadAsyncDuel(duel.id, a.id), duel);
  assert.equal((await getDuelOverview(a.id)).activeDuelId, duel.id);
  assert.equal(await rewardFor(duel.id), undefined);
  assert.equal(await pointFor(duel.id), undefined);
  assert.equal((await wallet(b.id)).ryos, 2147483647);
  await query('UPDATE player_profiles SET ryos = ? WHERE user_id = ?', [INITIAL_RYOS, b.id]);
  assert.equal((await advance(duel, DEFEAT)).reward, 0);
  assert.equal((await rewardFor(duel.id)).beneficiary, b.id);
  assert.equal((await pointFor(duel.id)).winner, b.id);
  assert.equal((await wallet(b.id)).ryos, INITIAL_RYOS + 10);
});

test('stockage amitiés : paire triée, demandeur membre et suppression en cascade', async () => {
  const [first, second, other] = await Promise.all([player(), player(), player()]);
  const [low, high] = [first.id, second.id].sort((a, b) => a - b);
  const insert = (a, b, requester) =>
    query(
      'INSERT INTO async_duel_friendships (user_low_id, user_high_id, requested_by) VALUES (?, ?, ?)',
      [a, b, requester],
    );
  await assert.rejects(insert(high, low, high), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  await assert.rejects(insert(low, high, other.id), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  await insert(low, high, high);
  await assert.rejects(insert(low, high, low), { code: 'ER_DUP_ENTRY' });
  const read = () =>
    query('SELECT status FROM async_duel_friendships WHERE user_low_id = ? AND user_high_id = ?', [
      low,
      high,
    ]);
  assert.deepEqual(await read(), [{ status: 'pending' }]);
  await deleteAccount(low);
  assert.deepEqual(await read(), []);
});
