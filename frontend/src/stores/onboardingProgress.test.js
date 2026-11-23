import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mergeOnboardingSteps, metaFromSteps } from './onboardingProgress.js';

const here = dirname(fileURLToPath(import.meta.url));

function step(key, { completed = false, claimed = false } = {}) {
  return {
    key,
    completed,
    claimed,
    claimable: completed && !claimed,
    completedAt: completed ? '2026-01-01T00:00:00.000Z' : null,
    claimedAt: claimed ? '2026-01-01T00:00:00.000Z' : null,
  };
}

test('merge keeps a completed visit when a stale GET says otherwise', () => {
  const current = [step('visit_collection', { completed: true })];
  const stale = [step('visit_collection', { completed: false })];
  const merged = mergeOnboardingSteps(current, stale);
  assert.equal(merged[0].completed, true);
  assert.equal(merged[0].claimable, true);
});

test('merge keeps claimed flag once set', () => {
  const current = [step('visit_profile', { completed: true, claimed: true })];
  const stale = [step('visit_profile', { completed: true, claimed: false })];
  const merged = mergeOnboardingSteps(current, stale);
  assert.equal(merged[0].claimed, true);
  assert.equal(merged[0].claimable, false);
});

test('metaFromSteps counts claimable from merged flags', () => {
  const steps = [
    step('visit_profile', { completed: true, claimed: true }),
    step('visit_collection', { completed: true }),
    step('visit_shop'),
  ];
  const meta = metaFromSteps(steps);
  assert.equal(meta.total, 3);
  assert.equal(meta.completed, 2);
  assert.equal(meta.claimed, 1);
  assert.equal(meta.claimable, 1);
  assert.equal(meta.finished, false);
  assert.equal(meta.allCompleted, false);
});

test('CollectionView records the visit_collection onboarding step', () => {
  const src = readFileSync(join(here, '../views/CollectionView.vue'), 'utf8');
  assert.match(src, /useOnboardingVisit\(['"]visit_collection['"]\)/);
});

test('useOnboardingVisit triggers recordVisit during setup and onMounted', () => {
  const src = readFileSync(join(here, '../composables/useOnboardingVisit.js'), 'utf8');
  assert.match(src, /recordVisit\(stepKey\)/);
  assert.match(src, /onMounted/);
  const calls = [...src.matchAll(/recordVisit\(stepKey\)/g)];
  assert.ok(calls.length >= 2, 'expected setup + onMounted recordVisit calls');
});
