import { query } from '../config/database.js';
import { getClockRow } from './gameClock.js';
import { clanTierLabel } from './clanRecruitment.js';
import { createNinjaFromAcademyCandidate, parseCandidateJson } from './academyRecruit.js';
import { getClanMembership } from './playerClanService.js';
import { isTacticsLocked } from './gameClock.js';

import { nextUtcMidnightIso } from './dailyUtc.js';
function mapBoardRow(row, viewerUserId) {
  const candidate = parseCandidateJson(row.candidate_json);
  return {
    id: row.id,
    posterUserId: row.poster_user_id,
    posterSenseiName: row.poster_sensei_name,
    price: row.price,
    expiresAt: row.expires_at,
    recruited: Boolean(row.recruited_by_user_id),
    recruitedByUserId: row.recruited_by_user_id,
    isMine: row.poster_user_id === viewerUserId,
    canRecruit:
      !row.recruited_by_user_id &&
      row.poster_user_id !== viewerUserId &&
      new Date(row.expires_at) > new Date(),
    candidate: {
      name: candidate.name,
      clanTier: candidate.clanTier,
      clanTierLabel: clanTierLabel(candidate.clanTier, candidate.language || 'fr'),
      potential: candidate.potential,
      primaryArt: candidate.primary_art,
      element: candidate.element_affinity,
      characterTrait: candidate.character_trait,
      profile: candidate.displayProfile,
    },
  };
}

export async function getBoardRecommendationStatus(userId) {
  const clockRow = await getClockRow();
  if (!clockRow?.cycle_start_at) {
    return { canRecommend: false, usedThisCycle: false, cycleStartAt: null };
  }

  const senseiRows = await query(
    'SELECT clan_board_recommended_cycle FROM sensei WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const usedCycle = senseiRows[0]?.clan_board_recommended_cycle;
  const usedThisCycle =
    usedCycle &&
    new Date(usedCycle).getTime() === new Date(clockRow.cycle_start_at).getTime();

  const membership = await getClanMembership(userId);
  const tacticsLocked = await isTacticsLocked();

  return {
    canRecommend: Boolean(membership) && !usedThisCycle && !tacticsLocked,
    usedThisCycle: Boolean(usedThisCycle),
    cycleStartAt: clockRow.cycle_start_at,
  };
}

export async function listClanAcademyBoard(userId) {
  const membership = await getClanMembership(userId);
  if (!membership) {
    return { posts: [], recommendation: await getBoardRecommendationStatus(userId) };
  }

  await query(
    `DELETE FROM clan_academy_board
     WHERE clan_id = ? AND recruited_by_user_id IS NULL AND expires_at <= UTC_TIMESTAMP()`,
    [membership.clanId]
  );

  const rows = await query(
    `SELECT cab.*, s.name AS poster_sensei_name
     FROM clan_academy_board cab
     JOIN sensei s ON s.user_id = cab.poster_user_id
     WHERE cab.clan_id = ?
     ORDER BY cab.expires_at ASC, cab.id ASC`,
    [membership.clanId]
  );

  return {
    posts: rows.map((row) => mapBoardRow(row, userId)),
    recommendation: await getBoardRecommendationStatus(userId),
  };
}

export async function recommendAspirantToClan(userId, drawId) {
  const membership = await getClanMembership(userId);
  if (!membership) {
    const error = new Error('Rejoignez un clan pour recommander un aspirant.');
    error.statusCode = 403;
    throw error;
  }

  if (await isTacticsLocked()) {
    const error = new Error('Recommandations closes pendant l\'opération (à partir de H71).');
    error.statusCode = 423;
    throw error;
  }

  const status = await getBoardRecommendationStatus(userId);
  if (status.usedThisCycle) {
    const error = new Error('Vous avez déjà recommandé un aspirant ce cycle.');
    error.statusCode = 409;
    throw error;
  }

  const drawRows = await query(
    'SELECT * FROM academy_draws WHERE id = ? AND user_id = ? AND purchased = FALSE LIMIT 1',
    [drawId, userId]
  );
  const draw = drawRows[0];
  if (!draw) {
    const error = new Error('Aspirant introuvable dans votre Académie.');
    error.statusCode = 404;
    throw error;
  }

  const clockRow = await getClockRow();
  if (!clockRow?.cycle_start_at) {
    const error = new Error('Cycle introuvable.');
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = nextUtcMidnightIso();

  await query(
    `INSERT INTO clan_academy_board
      (clan_id, poster_user_id, source_draw_id, cycle_start_at, candidate_json, price, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membership.clanId,
      userId,
      draw.id,
      clockRow.cycle_start_at,
      draw.candidate_json,
      draw.price,
      expiresAt,
    ]
  );

  await query('UPDATE sensei SET clan_board_recommended_cycle = ? WHERE user_id = ?', [
    clockRow.cycle_start_at,
    userId,
  ]);

  return listClanAcademyBoard(userId);
}

export async function recruitFromClanBoard(userId, postId) {
  if (await isTacticsLocked()) {
    const error = new Error('Recrutement fermé pendant l\'opération (à partir de H71).');
    error.statusCode = 423;
    throw error;
  }

  const membership = await getClanMembership(userId);
  if (!membership) {
    const error = new Error('Rejoignez un clan pour recruter depuis le tableau.');
    error.statusCode = 403;
    throw error;
  }

  const postRows = await query(
    `SELECT cab.*, s.language
     FROM clan_academy_board cab
     JOIN sensei s ON s.user_id = ?
     WHERE cab.id = ? AND cab.clan_id = ?
     LIMIT 1`,
    [userId, postId, membership.clanId]
  );
  const post = postRows[0];
  if (!post) {
    const error = new Error('Publication introuvable sur le tableau du clan.');
    error.statusCode = 404;
    throw error;
  }
  if (post.recruited_by_user_id) {
    const error = new Error('Cet aspirant a déjà été recruté par un allié.');
    error.statusCode = 409;
    throw error;
  }
  if (post.poster_user_id === userId) {
    const error = new Error('Recrutez cet aspirant depuis votre propre Académie.');
    error.statusCode = 400;
    throw error;
  }
  if (new Date(post.expires_at) <= new Date()) {
    const error = new Error('Cette recommandation a expiré.');
    error.statusCode = 410;
    throw error;
  }

  const claim = await query(
    `UPDATE clan_academy_board
     SET recruited_by_user_id = ?, recruited_at = UTC_TIMESTAMP()
     WHERE id = ? AND recruited_by_user_id IS NULL`,
    [userId, postId]
  );
  if (!claim.affectedRows) {
    const error = new Error('Cet aspirant a déjà été recruté.');
    error.statusCode = 409;
    throw error;
  }

  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ? LIMIT 1', [userId]);
  const ryos = senseiRows[0]?.ryos ?? 0;
  if (ryos < post.price) {
    await query(
      'UPDATE clan_academy_board SET recruited_by_user_id = NULL, recruited_at = NULL WHERE id = ?',
      [postId]
    );
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const candidate = parseCandidateJson(post.candidate_json);

  try {
    await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [post.price, userId]);
    const ninja = await createNinjaFromAcademyCandidate(userId, candidate, post.language || 'fr');
    return { ninjaId: ninja.id, name: ninja.name, price: post.price };
  } catch (error) {
    await query(
      'UPDATE clan_academy_board SET recruited_by_user_id = NULL, recruited_at = NULL WHERE id = ?',
      [postId]
    );
    throw error;
  }
}
