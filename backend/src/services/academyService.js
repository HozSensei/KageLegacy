import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { createNinja } from '../models/ninja.js';
import { clanTierLabel, getClanTier } from './clanRecruitment.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { generateNinjaProfile } from './ninjaGenerator.js';

export const ACADEMY_WINDOW_END_HOUR = 12;

function priceForCandidate(clanTier, potential) {
  if (clanTier === 'noble') return 2500 + randomInt(1501);
  if (clanTier === 'common') return 1200;
  if (potential === 'prodige') return 900;
  if (potential === 'prometteur') return 650;
  return 400;
}

function buildRandomAspirant(clans) {
  const profile = generateNinjaProfile({ clans, grade: 'Genin' });
  const clan = clans.find((c) => c.id === profile.clan_trait_id);
  const clanTier = getClanTier(clan);
  const price = priceForCandidate(clanTier, profile.potential);
  return {
    ...profile,
    clanTier,
    clanName: clan?.name,
    price,
    displayProfile: describeNinjaProfile(
      { ...profile, clan_name: clan?.name, clan_is_noble: clan?.is_noble },
      profile.language
    ),
  };
}

function mapDrawRow(row) {
  if (!row) return null;
  const candidate =
    typeof row.candidate_json === 'string'
      ? JSON.parse(row.candidate_json)
      : row.candidate_json;
  return {
    id: row.id,
    price: row.price,
    recruited: Boolean(row.purchased),
    candidate: {
      name: candidate.name,
      clanTier: candidate.clanTier,
      clanTierLabel: clanTierLabel(candidate.clanTier, candidate.language || 'fr'),
      potential: candidate.potential,
      primaryArt: candidate.primary_art,
      profile: candidate.displayProfile,
      element: candidate.element_affinity,
      characterTrait: candidate.character_trait,
    },
  };
}

export async function getAcademyDraw(userId, cycleStartAt) {
  const rows = await query(
    `SELECT * FROM academy_draws WHERE user_id = ? AND cycle_start_at = ?`,
    [userId, cycleStartAt]
  );
  return rows[0] || null;
}

export async function ensureAcademyDrawForUser(userId, cycleStartAt) {
  const existing = await getAcademyDraw(userId, cycleStartAt);
  if (existing) return existing;

  const clans = await query('SELECT * FROM clan_traits ORDER BY id');
  const aspirant = buildRandomAspirant(clans);
  const { displayProfile, clanTier, clanName, price, ...profile } = aspirant;

  await query(
    `INSERT INTO academy_draws (user_id, cycle_start_at, candidate_json, price)
     VALUES (?, ?, ?, ?)`,
    [userId, cycleStartAt, JSON.stringify({ ...profile, clanTier, clanName, displayProfile }), price]
  );

  return getAcademyDraw(userId, cycleStartAt);
}

export async function ensureAcademyForAllUsers(cycleStartAt) {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    await ensureAcademyDrawForUser(user.id, cycleStartAt);
    results.push({ userId: user.id });
  }
  return results;
}

export async function getAcademyPayload(userId) {
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) {
    return { draw: null, windowOpen: false, recruitedThisCycle: false };
  }

  const row = await ensureAcademyDrawForUser(userId, cycleStartAt);
  const clock = await getGameClock();

  return {
    draw: mapDrawRow(row),
    windowOpen: clock.hour < ACADEMY_WINDOW_END_HOUR,
    recruitedThisCycle: Boolean(row?.purchased),
    windowEndsAtHour: ACADEMY_WINDOW_END_HOUR,
  };
}

export async function recruitAcademyAspirant(userId) {
  const clock = await getGameClock();
  if (clock.hour >= ACADEMY_WINDOW_END_HOUR) {
    const error = new Error('L\'Académie est fermée pour ce cycle (après H12).');
    error.statusCode = 423;
    throw error;
  }

  const clockRow = await getClockRow();
  const rows = await query(
    `SELECT ad.*, s.ryos
     FROM academy_draws ad
     JOIN sensei s ON s.user_id = ad.user_id
     WHERE ad.user_id = ? AND ad.cycle_start_at = ?`,
    [userId, clockRow.cycle_start_at]
  );
  const draw = rows[0];
  if (!draw) {
    const error = new Error('Aucun aspirant à l\'Académie ce cycle.');
    error.statusCode = 404;
    throw error;
  }
  if (draw.purchased) {
    const error = new Error('Cet aspirant a déjà rejoint votre effectif.');
    error.statusCode = 409;
    throw error;
  }

  if (draw.ryos < draw.price) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const candidate =
    typeof draw.candidate_json === 'string'
      ? JSON.parse(draw.candidate_json)
      : draw.candidate_json;

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [draw.price, userId]);
  const ninja = await createNinja({
    user_id: userId,
    name: candidate.name,
    age: candidate.age,
    grade: candidate.grade,
    clan_trait_id: candidate.clan_trait_id,
    element_affinity: candidate.element_affinity,
    character_trait: candidate.character_trait,
    language: candidate.language || 'fr',
    taijutsu: candidate.taijutsu,
    ninjutsu: candidate.ninjutsu,
    genjutsu: candidate.genjutsu,
    medecine: candidate.medecine,
    vitesse: candidate.vitesse,
    intelligence: candidate.intelligence,
    weekly_forme: candidate.weekly_forme,
    moral: candidate.moral,
    squad_position: null,
  });

  await query('UPDATE academy_draws SET purchased = TRUE WHERE id = ?', [draw.id]);

  return { ninjaId: ninja.id, name: ninja.name, price: draw.price };
}
