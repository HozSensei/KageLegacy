/**
 * Garde ready invité sur nœuds non-combat (logique pure extraite).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

function requireGuestReady(guestNodeReady) {
  if (!guestNodeReady) {
    const err = new Error('L’invité doit être prêt avant d’avancer.');
    err.statusCode = 409;
    err.code = 'GUEST_NOT_READY';
    throw err;
  }
}

test('avance refusée sans ready', () => {
  assert.throws(() => requireGuestReady(false), err => err.code === 'GUEST_NOT_READY');
});

test('avance autorisée avec ready', () => {
  assert.doesNotThrow(() => requireGuestReady(true));
});
