import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import pool, { query } from '../src/config/database.js';
import {
  acceptDuelFriend,
  areDuelFriends,
  getDuelFriends,
  removeDuelFriend,
  requestDuelFriend,
  searchDuelPlayers,
} from '../src/services/asyncDuelFriends.js';
import { NOTIFICATION_KIND } from '../src/services/userNotificationService.js';

const prefix = `test_duel_friends_${randomUUID()}`;
const ids = [];

async function player(suffix, { displayName, characterName = null } = {}) {
  const username = `${prefix}-${suffix}`;
  const { insertId: id } = await query('INSERT INTO users (username) VALUES (?)', [username]);
  ids.push(id);
  if (displayName) {
    await query(
      'INSERT INTO player_profiles (user_id, display_name, character_name) VALUES (?, ?, ?)',
      [id, displayName, characterName],
    );
  }
  return { id, name: characterName ?? displayName ?? username };
}

async function friendRequestNotes(userId) {
  return query(
    `SELECT kind, dedupe_key, href, payload_json
     FROM user_notifications
     WHERE user_id = ? AND kind = ?
     ORDER BY id`,
    [userId, NOTIFICATION_KIND.FRIEND_REQUEST],
  );
}

after(async () => {
  try {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await query(
      `DELETE FROM async_duel_friendships
       WHERE user_low_id IN (${placeholders}) OR user_high_id IN (${placeholders})`,
      [...ids, ...ids],
    );
    await query(`DELETE FROM user_notifications WHERE user_id IN (${placeholders})`, ids);
    await query(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
  } finally {
    await pool.end();
  }
});

test('liste les relations par état et réserve l’acceptation au destinataire', async () => {
  const sender = await player('sender', { displayName: 'Demandeur' });
  const me = await player('me');
  const recipient = await player('recipient', { displayName: 'Destinataire' });
  const friend = await player('friend', { displayName: 'Profil', characterName: 'Personnage' });
  const empty = { friends: [], incoming: [], outgoing: [] };

  assert.deepEqual(await getDuelFriends(me.id), empty);
  assert.equal(await areDuelFriends(me.id, friend.id), false);
  assert.equal(await areDuelFriends(me.id, me.id), false);
  for (const mutate of [requestDuelFriend, acceptDuelFriend, removeDuelFriend]) {
    await assert.rejects(mutate(me.id, me.id), { statusCode: 400 });
  }
  await assert.rejects(requestDuelFriend(me.id, 0xffffffff), { statusCode: 404 });
  await assert.rejects(acceptDuelFriend(me.id, friend.id), { statusCode: 404 });
  await assert.rejects(removeDuelFriend(me.id, friend.id), { statusCode: 404 });

  await requestDuelFriend(sender.id, me.id);
  await requestDuelFriend(me.id, recipient.id);
  await requestDuelFriend(friend.id, me.id);
  assert.equal(await areDuelFriends(me.id, friend.id), false);

  const myIncomingNotes = await friendRequestNotes(me.id);
  assert.equal(myIncomingNotes.length, 2);
  assert.ok(
    myIncomingNotes.every(
      note =>
        note.href === '/village?tab=friends' &&
        String(note.dedupe_key).startsWith('friend_request:'),
    ),
  );
  const recipientNotes = await friendRequestNotes(recipient.id);
  assert.equal(recipientNotes.length, 1);
  assert.equal(recipientNotes[0].dedupe_key, `friend_request:${me.id}`);

  await assert.rejects(acceptDuelFriend(me.id, recipient.id), { statusCode: 403 });
  await assert.rejects(acceptDuelFriend(sender.id, recipient.id), { statusCode: 404 });
  await assert.rejects(removeDuelFriend(sender.id, recipient.id), { statusCode: 404 });
  await acceptDuelFriend(me.id, friend.id);
  assert.equal(await areDuelFriends(me.id, friend.id), true);
  assert.equal(await areDuelFriends(friend.id, me.id), true);
  assert.equal(
    (await friendRequestNotes(me.id)).some(n => n.dedupe_key === `friend_request:${friend.id}`),
    false,
  );
  assert.deepEqual(await getDuelFriends(me.id), {
    friends: [friend],
    incoming: [sender],
    outgoing: [recipient],
  });
  assert.deepEqual(await getDuelFriends(recipient.id), { ...empty, incoming: [me] });
  await assert.rejects(acceptDuelFriend(me.id, friend.id), { statusCode: 409 });
  await assert.rejects(requestDuelFriend(me.id, friend.id), { statusCode: 409 });

  await removeDuelFriend(me.id, sender.id); // Refus
  assert.equal((await friendRequestNotes(me.id)).length, 0);
  await removeDuelFriend(me.id, recipient.id); // Annulation
  assert.equal((await friendRequestNotes(recipient.id)).length, 0);
  await removeDuelFriend(friend.id, me.id); // Suppression par l’autre ami
  assert.deepEqual(await getDuelFriends(me.id), empty);
  assert.equal(await areDuelFriends(me.id, friend.id), false);
});

test('une seule demande et une seule acceptation aboutissent sous concurrence', async () => {
  const a = await player('concurrent-a');
  const b = await player('concurrent-b');
  const requests = await Promise.allSettled([
    requestDuelFriend(a.id, b.id),
    requestDuelFriend(b.id, a.id),
  ]);
  assert.equal(requests.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(requests.find(({ status }) => status === 'rejected').reason.statusCode, 409);
  const [sender, recipient] = requests[0].status === 'fulfilled' ? [a, b] : [b, a];
  assert.deepEqual((await getDuelFriends(recipient.id)).incoming, [sender]);

  const accepts = await Promise.allSettled([
    acceptDuelFriend(recipient.id, sender.id),
    acceptDuelFriend(recipient.id, sender.id),
  ]);
  assert.equal(accepts.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(accepts.find(({ status }) => status === 'rejected').reason.statusCode, 409);
  assert.deepEqual((await getDuelFriends(sender.id)).friends, [recipient]);
});

test('recherche littéralement par nom, hors soi-même, et limite les résultats', async () => {
  const characterName = `${prefix} %_!`;
  const me = await player('search-me', { displayName: characterName });
  const match = await player('search-match', { displayName: 'Profil', characterName });
  await player('search-lookalike', { displayName: `${prefix} ab!` });
  assert.deepEqual(await searchDuelPlayers(me.id), []);
  assert.deepEqual(await searchDuelPlayers(me.id, '   '), []);
  assert.deepEqual(await searchDuelPlayers(me.id, `  ${characterName}  `), [match]);

  const expected = [];
  for (let index = 0; index < 21; index += 1) {
    expected.push(await player(`search-limit-${String(index).padStart(2, '0')}`));
  }
  assert.deepEqual(await searchDuelPlayers(me.id, `${prefix}-search-limit`), expected.slice(0, 20));
});
