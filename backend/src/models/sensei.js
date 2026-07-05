import { query } from '../config/database.js';
import { getGameClock } from '../services/gameClock.js';
import {
  GRADE_STAT_CAPS,
  computeBirdFlightCost,
  computeChuninExamCost,
  hasReachedTeachingPeak,
  isChuninStagnant,
  isGeninStagnant,
  meetsBirdFlightRequirements,
} from '../services/gradeProgression.js';
import { getBirdFlightProgress } from '../services/birdFlightExam.js';
import { describeNinjaProfile } from '../services/ninjaProfile.js';
import { getUnreadNotifications } from '../services/birdFlightService.js';

export { getGameClock };

function enrichNinja(ninja) {
  const language = ninja.language || 'fr';
  return {
    ...ninja,
    chuninExamCost: ninja.grade === 'Genin' ? computeChuninExamCost(ninja) : null,
    birdFlightCost: ninja.grade === 'Chunin' ? computeBirdFlightCost(ninja) : null,
    birdFlightProgress: ninja.grade === 'Chunin' ? getBirdFlightProgress(ninja) : null,
    birdFlightReady: ninja.grade === 'Chunin' ? meetsBirdFlightRequirements(ninja) : false,
    birdFlightPeak: ninja.grade === 'Chunin' ? hasReachedTeachingPeak(ninja) : false,
    gradeStatCaps: GRADE_STAT_CAPS[ninja.grade] || GRADE_STAT_CAPS.Genin,
    stagnationRisk:
      ninja.grade === 'Genin'
        ? isGeninStagnant(ninja)
        : ninja.grade === 'Chunin'
          ? isChuninStagnant(ninja)
          : false,
    stagnationKind:
      ninja.grade === 'Genin' && isGeninStagnant(ninja)
        ? 'genin_exam'
        : ninja.grade === 'Chunin' && isChuninStagnant(ninja)
          ? 'chunin_jonin'
          : null,
    profile: describeNinjaProfile(ninja, language),
  };
}

export async function findSenseiByUserId(userId) {
  const rows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

export async function findDemoUser() {
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', ['demo_sensei']);
  return rows[0] || null;
}

export async function createDemoUser({ username, senseiName, language = 'fr', trainingFocus = 'Genjutsu' }) {
  const userResult = await query(
    'INSERT INTO users (username, is_bot) VALUES (?, FALSE)',
    [username]
  );
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, ?, 15400, 120, 100, ?)`,
    [userId, senseiName, trainingFocus, language]
  );

  return findDemoUser();
}

export async function getSquadPayload(userId) {
  const senseiRows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  const sensei = senseiRows[0];
  if (!sensei) return null;

  const userRows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  const ninjas = await query(
    `SELECT n.*, c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ?
     ORDER BY n.squad_position IS NULL, n.squad_position, n.id`,
    [userId]
  );

  const activeSquad = ninjas.filter((n) => n.squad_position !== null).map(enrichNinja);
  const bench = ninjas.filter((n) => n.squad_position === null).map(enrichNinja);
  const notifications = await getUnreadNotifications(userId);

  return {
    is_bot: Boolean(userRows[0]?.is_bot),
    sensei: {
      name: sensei.name,
      trainingFocus: sensei.training_focus,
      ryos: sensei.ryos,
      reputation: sensei.reputation,
      chakraPool: sensei.chakra_pool,
      language: sensei.language,
    },
    activeSquad,
    bench,
    notifications,
  };
}
