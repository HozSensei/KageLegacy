import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessBalanceRows,
  extractSimRows,
  normalizeSimPayload,
  useAdminBalanceResults,
} from './useAdminBalanceResults.js';

test('extractSimRows lit rows au premier niveau ou sous body/data', () => {
  assert.deepEqual(extractSimRows(null), []);
  assert.deepEqual(extractSimRows({ rows: [{ rank: 'D' }] }), [{ rank: 'D' }]);
  assert.deepEqual(extractSimRows({ body: { rows: [{ rank: 'C' }] } }), [{ rank: 'C' }]);
  assert.deepEqual(extractSimRows({ data: { rows: [{ rank: 'B' }] } }), [{ rank: 'B' }]);
});

test('normalizeSimPayload aplatit les wrappers API', () => {
  const nested = normalizeSimPayload({ body: { rows: [{ rank: 'A' }], branch: 'taijutsu' } });
  assert.equal(nested.branch, 'taijutsu');
  assert.equal(nested.rows[0].rank, 'A');
});

test('setPayload stocke durablement et ignore un payload sans rows', () => {
  const store = useAdminBalanceResults();
  store.clear();
  assert.equal(store.hasResults.value, false);

  const empty = store.setPayload({ branch: 'ninjutsu', rows: [] });
  assert.equal(empty, null);
  assert.equal(store.hasResults.value, false);

  const stored = store.setPayload({
    branch: 'taijutsu',
    branchAuto: true,
    runsPerCell: 4,
    rows: [
      { strength: 'moyen', rank: 'D', clearanceRate: 0.8 },
      { strength: 'moyen', rank: 'C', clearanceRate: 0.5 },
      { strength: 'moyen', rank: 'B', clearanceRate: 0.3 },
      { strength: 'moyen', rank: 'A', clearanceRate: 0.15 },
    ],
  });
  assert.ok(stored);
  assert.equal(store.rows.value.length, 4);
  assert.equal(store.hasResults.value, true);
  assert.equal(store.assessment.value?.code, 'balanced');

  // Nouvelle instance = même singleton module-level
  const again = useAdminBalanceResults();
  assert.equal(again.rows.value.length, 4);

  again.clear();
  assert.equal(store.hasResults.value, false);
});

test('assessBalanceRows détecte trop dur', () => {
  const a = assessBalanceRows([
    { rank: 'D', clearanceRate: 0.02 },
    { rank: 'A', clearanceRate: 0.01 },
  ]);
  assert.equal(a.code, 'tooHard');
});
