/**
 * Onboarding early-career : checklist des gestes essentiels du cycle.
 * Aucun masquage de features — orientation seulement.
 */

import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getOperationDeck } from './operationDeckService.js';
import { getGameClock } from './gameClock.js';

const STEP_DEFS = [
  { key: 'deck', route: '/squad' },
  { key: 'training', route: '/training' },
  { key: 'mission', route: '/missions' },
  { key: 'recon', route: '/reconnaissance' },
  { key: 'league', route: '/league' },
];

async function detectTrainingDone(userId) {
  const senseiRows = await query(
    'SELECT global_training_type FROM sensei WHERE user_id = ?',
    [userId],
  );
  if (senseiRows[0]?.global_training_type) return true;

  const prepRows = await query(
    `SELECT COUNT(*) AS c FROM ninjas
     WHERE user_id = ? AND preparation_type IS NOT NULL`,
    [userId],
  );
  return Number(prepRows[0]?.c || 0) > 0;
}

async function detectReconDone(userId) {
  const regRows = await query(
    `SELECT COUNT(*) AS c FROM reconnaissance_registrations
     WHERE user_id = ? AND cycle_start_at = (
       SELECT cycle_start_at FROM game_clock WHERE id = 1
     )`,
    [userId],
  );
  if (Number(regRows[0]?.c || 0) > 0) return true;

  const challengeRows = await query(
    `SELECT COUNT(*) AS c FROM reconnaissance_challenges
     WHERE challenger_user_id = ? OR defender_user_id = ?`,
    [userId, userId],
  );
  return Number(challengeRows[0]?.c || 0) > 0;
}

export async function getOnboardingPayload(userId) {
  const senseiRows = await query(
    `SELECT onboarding_deck_done, onboarding_mission_done, onboarding_dismissed,
            onboarding_training_done, onboarding_recon_done, onboarding_league_done
     FROM sensei WHERE user_id = ?`,
    [userId],
  );
  const sensei = senseiRows[0];
  if (!sensei) return null;

  const pool = await findUserPool(userId);
  const clock = await getGameClock();
  const seasonCycle = pool?.current_cycle ?? 1;
  const isEarlyCareer = seasonCycle <= 2 && !sensei.onboarding_dismissed;

  const deck = await getOperationDeck(userId, seasonCycle);
  const deckConfigured =
    Boolean(sensei.onboarding_deck_done) || (deck?.techniqueCount ?? 0) >= 1;

  const missionRows = await query(
    `SELECT COUNT(*) AS c FROM idle_missions
     WHERE user_id = ? AND cycle_start_at = (
       SELECT cycle_start_at FROM game_clock WHERE id = 1
     )`,
    [userId],
  );
  const missionDone =
    Boolean(sensei.onboarding_mission_done) || Number(missionRows[0]?.c || 0) > 0;

  const trainingDone =
    Boolean(sensei.onboarding_training_done) || (await detectTrainingDone(userId));
  const reconDone =
    Boolean(sensei.onboarding_recon_done) || (await detectReconDone(userId));
  const leagueDone = Boolean(sensei.onboarding_league_done);

  // Auto-sync flags if player already did the steps
  if (deckConfigured && !sensei.onboarding_deck_done) {
    await query('UPDATE sensei SET onboarding_deck_done = 1 WHERE user_id = ?', [userId]);
  }
  if (missionDone && !sensei.onboarding_mission_done) {
    await query('UPDATE sensei SET onboarding_mission_done = 1 WHERE user_id = ?', [userId]);
  }
  if (trainingDone && !sensei.onboarding_training_done) {
    await query('UPDATE sensei SET onboarding_training_done = 1 WHERE user_id = ?', [userId]);
  }
  if (reconDone && !sensei.onboarding_recon_done) {
    await query('UPDATE sensei SET onboarding_recon_done = 1 WHERE user_id = ?', [userId]);
  }

  const doneByKey = {
    deck: deckConfigured,
    training: trainingDone,
    mission: missionDone,
    recon: reconDone,
    league: leagueDone,
  };

  const steps = STEP_DEFS.map((def) => ({
    key: def.key,
    done: Boolean(doneByKey[def.key]),
    route: def.route,
  }));

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = steps.every((s) => s.done);
  const active = isEarlyCareer && !sensei.onboarding_dismissed && !allDone;

  return {
    active,
    dismissed: Boolean(sensei.onboarding_dismissed),
    allDone,
    doneCount,
    totalCount: steps.length,
    seasonCycle,
    hour: clock.hour ?? 0,
    steps,
  };
}

export async function markOnboardingStep(userId, step) {
  const columnByStep = {
    deck: 'onboarding_deck_done',
    training: 'onboarding_training_done',
    mission: 'onboarding_mission_done',
    recon: 'onboarding_recon_done',
    league: 'onboarding_league_done',
    dismiss: 'onboarding_dismissed',
  };
  const column = columnByStep[step];
  if (!column) {
    const error = new Error("Étape d'onboarding inconnue.");
    error.statusCode = 400;
    throw error;
  }
  await query(`UPDATE sensei SET ${column} = 1 WHERE user_id = ?`, [userId]);
  return getOnboardingPayload(userId);
}
