import assert from 'node:assert/strict';
import test from 'node:test';
import { createCoopRooms } from '../src/services/coopRoomService.js';

const load = async id => ({
  id,
  name: `Player ${id}`,
  stats: {},
  deckEntries: [{ quantity: 6, card: { slug: `strike-${id}`, type: 'attack', statType: 'taijutsu', cost: 1, damage: 3, effects: [] } }],
});

async function paired() {
  const rooms = createCoopRooms({ load });
  const waiting = await rooms.create(1);
  const guest = await rooms.join(2, waiting.code);
  return { rooms, guest, id: waiting.id };
}

test('invitation, autorisation et états privés', async () => {
  const { rooms, guest, id } = await paired();
  assert.equal(guest.status, 'active');
  assert.equal(guest.combat.player.id, 2);
  assert.equal(guest.combat.currentPhase, 'enemy_turn');
  assert.equal(guest.combat.ally.id, 1);
  assert.equal('hand' in guest.combat.ally, false);
  assert.throws(() => rooms.get(id, 3), { statusCode: 404 });
  assert.throws(() => rooms.action(id, 3, { type: 'end_turn' }), { statusCode: 404 });
  assert.throws(() => rooms.action(id, 2, { type: 'end_turn' }), /votre tour/);
  assert.equal((await rooms.create(2)).id, id);
  const ended = rooms.action(id, 1, { type: 'end_turn', revision: guest.revision });
  assert.equal(ended.revision, guest.revision + 1);
  assert.equal(rooms.get(id, 2).combat.currentPhase, 'player_turn');
  assert.throws(() => rooms.action(id, 2, { type: 'end_turn', revision: guest.revision }), { statusCode: 409 });
});

test('une frappe sur le partenaire ne dépense rien avant confirmation', async () => {
  const { rooms, id } = await paired();
  const before = rooms.get(id, 1);
  const action = { type: 'play', instanceId: before.combat.player.hand[0].instanceId, target: 'ally', revision: before.revision };
  assert.throws(() => rooms.action(id, 1, action), { code: 'FRIENDLY_FIRE_CONFIRMATION' });
  assert.deepEqual(rooms.get(id, 1), before);
  const after = rooms.action(id, 1, { ...action, confirmedFriendlyFire: true });
  assert.ok(after.combat.ally.hp < before.combat.ally.hp);
  assert.equal(after.combat.enemy.hp, before.combat.enemy.hp);
});

test('annulation et expiration empêchent de rejoindre une invitation', async () => {
  let time = 0;
  const rooms = createCoopRooms({ load, now: () => time });
  const waiting = await rooms.create(1);
  assert.equal(rooms.action(waiting.id, 1, { type: 'forfeit' }).status, 'finished');
  await assert.rejects(rooms.join(2, waiting.code), { statusCode: 404 });
  const replacement = await rooms.create(1);
  time += 30 * 60_000;
  await assert.rejects(rooms.join(2, replacement.code), { statusCode: 404 });
});

test('deux demandes concurrentes ne peuvent pas prendre la même place', async () => {
  const rooms = createCoopRooms({ load });
  const waiting = await rooms.create(1);
  const requests = await Promise.allSettled([rooms.join(2, waiting.code), rooms.join(3, waiting.code)]);
  assert.equal(requests.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(requests.find(result => result.status === 'rejected').reason.statusCode, 409);
});
