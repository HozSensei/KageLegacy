/**
 * Guide du novice — defs + totaux (sans DB).
 * Usage: node scripts/testOnboarding.js
 */
import assert from 'node:assert/strict';
import {
  ONBOARDING_STEPS,
  getOnboardingStep,
  onboardingStepsForAction,
  totalOnboardingRewards,
} from './data/onboardingSteps.js';

assert.equal(ONBOARDING_STEPS.length, 10);
assert.ok(getOnboardingStep('visit_profile'));
assert.equal(getOnboardingStep('nope'), null);

assert.equal(onboardingStepsForAction('deck_edit')[0]?.key, 'edit_deck');
assert.equal(onboardingStepsForAction('deck_create')[0]?.key, 'create_deck');
assert.equal(onboardingStepsForAction('talent_spent')[0]?.key, 'spend_talent');
assert.equal(onboardingStepsForAction('combat_win')[0]?.key, 'win_combat');
assert.equal(onboardingStepsForAction('unknown').length, 0);

const visits = ONBOARDING_STEPS.filter(s => s.kind === 'visit');
const actions = ONBOARDING_STEPS.filter(s => s.kind === 'action');
assert.equal(visits.length, 6);
assert.equal(actions.length, 4);

for (const step of ONBOARDING_STEPS) {
  assert.ok(step.route);
  assert.ok(step.rewards.length >= 1);
  assert.ok(step.rewards.every(r => r.type === 'ryos' || r.type === 'xp'));
}

const totals = totalOnboardingRewards();
assert.ok(totals.ryos >= 250 && totals.ryos <= 500, `ryos total ${totals.ryos}`);
assert.ok(totals.xp >= 150 && totals.xp <= 400, `xp total ${totals.xp}`);

console.log(`testOnboarding: OK (${totals.ryos} ryos / ${totals.xp} XP total)`);
