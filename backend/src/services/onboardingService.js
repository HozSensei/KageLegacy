/**
 * Guide du novice — progression one-shot + claim ryos/XP.
 */
import { query } from '../config/database.js';
import {
  ONBOARDING_STEPS,
  getOnboardingStep,
  onboardingStepsForAction,
} from '../../scripts/data/onboardingSteps.js';
import { addXP } from './playerCharacterService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function ensureOnboardingTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS user_onboarding (
      user_id INT UNSIGNED NOT NULL,
      step_key VARCHAR(64) NOT NULL,
      completed_at TIMESTAMP NULL DEFAULT NULL,
      claimed_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, step_key),
      KEY idx_uo_user (user_id),
      CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function requireTable() {
  if (!(await tableExists('user_onboarding'))) {
    try {
      await ensureOnboardingTable();
    } catch {
      throw httpError(503, 'Table onboarding absente — lancez les migrations.');
    }
  }
}

async function getStepRow(userId, stepKey) {
  const rows = await query(
    'SELECT * FROM user_onboarding WHERE user_id = ? AND step_key = ? LIMIT 1',
    [userId, stepKey],
  );
  return rows[0] || null;
}

function serializeStep(def, row) {
  const completed = Boolean(row?.completed_at);
  const claimed = Boolean(row?.claimed_at);
  return {
    key: def.key,
    kind: def.kind,
    action: def.action || null,
    route: def.route,
    sortOrder: def.sortOrder,
    nameFr: def.nameFr,
    nameEn: def.nameEn,
    hintFr: def.hintFr,
    hintEn: def.hintEn,
    rewards: def.rewards.map(r => ({ ...r })),
    completed,
    claimed,
    claimable: completed && !claimed,
    completedAt: row?.completed_at || null,
    claimedAt: row?.claimed_at || null,
  };
}

export async function getOnboardingProgress(userId) {
  await requireTable();
  const rows = await query('SELECT * FROM user_onboarding WHERE user_id = ?', [userId]);
  const byKey = new Map(rows.map(r => [r.step_key, r]));
  const steps = ONBOARDING_STEPS.map(def => serializeStep(def, byKey.get(def.key)));
  const completedCount = steps.filter(s => s.completed).length;
  const claimedCount = steps.filter(s => s.claimed).length;
  const claimableCount = steps.filter(s => s.claimable).length;
  return {
    steps,
    meta: {
      total: steps.length,
      completed: completedCount,
      claimed: claimedCount,
      claimable: claimableCount,
      finished: claimedCount >= steps.length,
      allCompleted: completedCount >= steps.length,
    },
  };
}

async function markCompleted(userId, stepKey) {
  const def = getOnboardingStep(stepKey);
  if (!def) return null;
  await requireTable();
  const existing = await getStepRow(userId, stepKey);
  if (existing?.completed_at) return serializeStep(def, existing);

  await query(
    `INSERT INTO user_onboarding (user_id, step_key, completed_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       completed_at = IFNULL(completed_at, CURRENT_TIMESTAMP),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, stepKey],
  );
  const row = await getStepRow(userId, stepKey);
  const step = serializeStep(def, row);
  if (step?.completed && !step?.claimed) {
    try {
      const { ensureUserNotification, NOTIFICATION_KIND } = await import(
        './userNotificationService.js'
      );
      await ensureUserNotification(userId, {
        kind: NOTIFICATION_KIND.ONBOARDING_READY,
        dedupeKey: `onboarding:${stepKey}`,
        href: '/home',
        payload: {
          stepKey,
          label: def.nameFr || stepKey,
          labelEn: def.nameEn || def.nameFr || stepKey,
        },
      });
    } catch {
      /* notifications optionnelles */
    }
  }
  return step;
}

/**
 * Complète une étape « visite » (appel client sur montage de la page).
 */
export async function completeOnboardingVisit(userId, stepKey) {
  const def = getOnboardingStep(stepKey);
  if (!def) throw httpError(404, 'Étape introuvable.');
  if (def.kind !== 'visit') throw httpError(400, 'Cette étape n’est pas une visite.');
  const step = await markCompleted(userId, stepKey);
  return { step, progress: await getOnboardingProgress(userId) };
}

/**
 * Hook jeu : deck_edit, deck_create, talent_spent, pouch_item, pouch_ryos,
 * combat_win, booster_open.
 */
export async function onOnboardingAction(userId, action) {
  if (!userId || !action) return { skipped: true, reason: 'bad_args' };
  const defs = onboardingStepsForAction(action);
  if (!defs.length) return { skipped: true, reason: 'unknown_action' };
  try {
    await requireTable();
  } catch {
    return { skipped: true, reason: 'table_missing' };
  }
  const completed = [];
  for (const def of defs) {
    try {
      completed.push(await markCompleted(userId, def.key));
    } catch (err) {
      completed.push({ key: def.key, error: err?.message || 'error' });
    }
  }
  return { action, completed };
}

async function grantReward(userId, reward) {
  const type = reward?.type;
  const amount = Math.max(0, Number(reward?.amount) || 0);
  if (!type || !amount) return { type, skipped: true };
  if (type === 'ryos') {
    await query('UPDATE player_profiles SET ryos = ryos + ? WHERE user_id = ?', [amount, userId]);
    return { type, amount };
  }
  if (type === 'xp') {
    try {
      await addXP(userId, Math.floor(amount));
      return { type, amount: Math.floor(amount) };
    } catch {
      return { type, amount: Math.floor(amount), skipped: true };
    }
  }
  return { type, skipped: true };
}

export async function claimOnboardingStep(userId, stepKey) {
  const def = getOnboardingStep(stepKey);
  if (!def) throw httpError(404, 'Étape introuvable.');
  await requireTable();
  const row = await getStepRow(userId, stepKey);
  if (!row?.completed_at) throw httpError(400, 'Étape non terminée.');
  if (row.claimed_at) throw httpError(409, 'Récompense déjà réclamée.');

  const granted = [];
  for (const reward of def.rewards) {
    granted.push(await grantReward(userId, reward));
  }
  await query(
    `UPDATE user_onboarding
     SET claimed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND step_key = ? AND claimed_at IS NULL`,
    [userId, stepKey],
  );
  const refreshed = await getStepRow(userId, stepKey);
  const progress = await getOnboardingProgress(userId);
  let finishTitle = null;
  if (progress.meta.finished) {
    finishTitle = await maybeGrantOnboardingNickname(userId);
    if (finishTitle?.granted) granted.push(finishTitle);
  }
  try {
    const { deleteNotificationByDedupe, notifyGain } = await import(
      './userNotificationService.js'
    );
    await deleteNotificationByDedupe(userId, `onboarding:${stepKey}`);
    await notifyGain(userId, {
      source: 'onboarding',
      grants: granted,
      label: def.nameFr || stepKey,
      labelEn: def.nameEn || def.nameFr || stepKey,
      href: finishTitle?.granted ? '/profil' : '/home',
    });
  } catch {
    /* notifications optionnelles */
  }
  return {
    step: serializeStep(def, refreshed),
    rewards: granted,
    finishTitle,
    progress,
  };
}

/** Titre « Initié du Village » une fois toutes les étapes du guide réclamées. */
async function maybeGrantOnboardingNickname(userId) {
  try {
    const { grantNicknameUnlock, ONBOARDING_NICKNAME } = await import(
      './nicknameUnlockService.js'
    );
    const result = await grantNicknameUnlock(userId, ONBOARDING_NICKNAME.id, {
      source: 'onboarding',
      sourceRef: 'guide',
    });
    return {
      type: 'nickname',
      nicknameId: ONBOARDING_NICKNAME.id,
      nameFr: ONBOARDING_NICKNAME.name.fr,
      nameEn: ONBOARDING_NICKNAME.name.en,
      ...result,
    };
  } catch {
    return null;
  }
}
