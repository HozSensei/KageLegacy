/**
 * Onboarding cycle 1 : checklist deck + mission, masquage soft des systèmes secondaires.
 */

import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getOperationDeck } from './operationDeckService.js';
import { getGameClock } from './gameClock.js';

export async function getOnboardingPayload(userId) {
  const senseiRows = await query(
    `SELECT onboarding_deck_done, onboarding_mission_done, onboarding_dismissed
     FROM sensei WHERE user_id = ?`,
    [userId]
  );
  const sensei = senseiRows[0];
  if (!sensei) return null;

  const pool = await findUserPool(userId);
  const clock = await getGameClock();
  const seasonCycle = pool?.current_cycle ?? 1;
  const isEarlyCareer = seasonCycle <= 2 && !sensei.onboarding_dismissed;

  const deck = await getOperationDeck(userId, seasonCycle);
  const deckConfigured =
    Boolean(sensei.onboarding_deck_done) ||
    (deck?.techniqueCount ?? 0) >= 1;

  const missionRows = await query(
    `SELECT COUNT(*) AS c FROM idle_missions
     WHERE user_id = ? AND cycle_start_at = (
       SELECT cycle_start_at FROM game_clock WHERE id = 1
     )`,
    [userId]
  );
  const missionDone =
    Boolean(sensei.onboarding_mission_done) || Number(missionRows[0]?.c || 0) > 0;

  // Auto-sync flags if player already did the steps
  if (deckConfigured && !sensei.onboarding_deck_done) {
    await query('UPDATE sensei SET onboarding_deck_done = 1 WHERE user_id = ?', [userId]);
  }
  if (missionDone && !sensei.onboarding_mission_done) {
    await query('UPDATE sensei SET onboarding_mission_done = 1 WHERE user_id = ?', [userId]);
  }

  const steps = [
    {
      key: 'deck',
      done: deckConfigured,
      route: '/squad',
    },
    {
      key: 'mission',
      done: missionDone,
      route: '/missions',
    },
  ];

  const allDone = steps.every((s) => s.done);
  const active = isEarlyCareer && !sensei.onboarding_dismissed && !allDone;

  return {
    active,
    dismissed: Boolean(sensei.onboarding_dismissed),
    allDone,
    seasonCycle,
    hour: clock.hour ?? 0,
    steps,
    softHideSecondary: active,
  };
}

export async function markOnboardingStep(userId, step) {
  if (step === 'deck') {
    await query('UPDATE sensei SET onboarding_deck_done = 1 WHERE user_id = ?', [userId]);
  } else if (step === 'mission') {
    await query('UPDATE sensei SET onboarding_mission_done = 1 WHERE user_id = ?', [userId]);
  } else if (step === 'dismiss') {
    await query('UPDATE sensei SET onboarding_dismissed = 1 WHERE user_id = ?', [userId]);
  } else {
    const error = new Error('Étape d\'onboarding inconnue.');
    error.statusCode = 400;
    throw error;
  }
  return getOnboardingPayload(userId);
}
