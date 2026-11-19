import assert from 'node:assert/strict';
import test from 'node:test';
import { needsFriendlyFireConfirmation as needsConfirmation } from './coopCards.js';

test('damaging cards and harmful targeted effects require confirmation', () => {
  assert.equal(needsConfirmation({ damage: 4 }), true);
  assert.equal(needsConfirmation({ effects: [{ type: 'multi_strike' }] }), true);
  assert.equal(needsConfirmation({ effects: [{ type: 'combo_previous', damage: 5 }] }), true);
  assert.equal(needsConfirmation({ effects: [{ type: 'apply_status', status: 'burn' }] }), true);
});

test('support effects and purely self-targeted statuses do not need confirmation', () => {
  assert.equal(needsConfirmation({ heal: 4, block: 3 }), false);
  assert.equal(
    needsConfirmation({ effects: [{ type: 'apply_status', target: 'self', status: 'weak' }] }),
    false
  );
  assert.equal(needsConfirmation({ effects: [{ type: 'apply_status', status: 'force' }] }), false);
});
