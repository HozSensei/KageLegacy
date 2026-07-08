import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { createNinja, findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { clanTierLabel, getClanTier } from './clanRecruitment.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { generateNinjaProfile } from './ninjaGenerator.js';
import { collectIdentityKeys, ninjaIdentityKey } from './ninjaNaming.js';
import { pickUniqueCivName, hasRemainingGlobalNames } from './ninjaNameGenerator.js';

export const ACADEMY_WINDOW_END_HOUR = 12;

const CURRENT_CYCLE_SQL = '(SELECT cycle_start_at FROM game_clock WHERE id = 1 LIMIT 1)';

function isPurchased(row) {
  return row?.purchased === true || row?.purchased === 1;
}

function priceForCandidate(clanTier, potential) {
  if (clanTier === 'noble') return 2500 + randomInt(1501);
  if (clanTier === 'common') return 1200;
  if (potential === 'prodige') return 900;
  if (potential === 'prometteur') return 650;
  return 400;
}

async function buildRandomAspirant(clans, userId) {
  const existing = userId ? await findNinjasByUserId(userId) : [];
  const globalKeys = await loadGlobalIdentityKeySet();
  const profile = await generateNinjaProfile({
    clans,
    grade: 'Genin',
    forbiddenIdentityKeys: collectIdentityKeys(existing),
    forbiddenGlobalKeys: globalKeys,
  });
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
    recruited: isPurchased(row),
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

export async function getAcademyDrawForCurrentCycle(userId) {
  const rows = await query(
    `SELECT * FROM academy_draws
     WHERE user_id = ? AND cycle_start_at = ${CURRENT_CYCLE_SQL}`,
    [userId]
  );
  return rows[0] || null;
}

export async function ensureAcademyDrawForUser(userId) {
  const existing = await getAcademyDrawForCurrentCycle(userId);
  if (existing) return existing;

  const clockRow = await getClockRow();
  if (!clockRow?.cycle_start_at) return null;

  const clans = await query('SELECT * FROM clan_traits ORDER BY id');
  const aspirant = await buildRandomAspirant(clans, userId);
  const { displayProfile, clanTier, clanName, price, ...profile } = aspirant;

  await query(
    `INSERT INTO academy_draws (user_id, cycle_start_at, candidate_json, price)
     VALUES (?, ${CURRENT_CYCLE_SQL}, ?, ?)`,
    [userId, JSON.stringify({ ...profile, clanTier, clanName, displayProfile }), price]
  );

  return getAcademyDrawForCurrentCycle(userId);
}

export async function ensureAcademyForAllUsers(cycleStartAt) {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    await ensureAcademyDrawForUser(user.id);
    results.push({ userId: user.id, cycleStartAt });
  }
  return results;
}

export async function getAcademyPayload(userId) {
  const clockRow = await getClockRow();
  if (!clockRow?.cycle_start_at) {
    return { draw: null, windowOpen: false, recruitedThisCycle: false };
  }

  const row = await ensureAcademyDrawForUser(userId);
  const clock = await getGameClock();

  return {
    draw: mapDrawRow(row),
    windowOpen: clock.hour < ACADEMY_WINDOW_END_HOUR,
    recruitedThisCycle: isPurchased(row),
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

  const draw = await getAcademyDrawForCurrentCycle(userId);
  if (!draw) {
    const error = new Error('Aucun aspirant à l\'Académie ce cycle.');
    error.statusCode = 404;
    throw error;
  }
  if (isPurchased(draw)) {
    const error = new Error('Cet aspirant a déjà rejoint votre effectif.');
    error.statusCode = 409;
    throw error;
  }

  const claim = await query(
    `UPDATE academy_draws
     SET purchased = TRUE
     WHERE id = ? AND purchased = FALSE AND cycle_start_at = ${CURRENT_CYCLE_SQL}`,
    [draw.id]
  );
  if (!claim.affectedRows) {
    const error = new Error('Cet aspirant a déjà rejoint votre effectif.');
    error.statusCode = 409;
    throw error;
  }

  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ? LIMIT 1', [userId]);
  const ryos = senseiRows[0]?.ryos ?? 0;
  if (ryos < draw.price) {
    await query('UPDATE academy_draws SET purchased = FALSE WHERE id = ?', [draw.id]);
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const candidate =
    typeof draw.candidate_json === 'string'
      ? JSON.parse(draw.candidate_json)
      : draw.candidate_json;

  try {
    await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [draw.price, userId]);
    const globalKeys = await loadGlobalIdentityKeySet();
    const localKeys = collectIdentityKeys(await findNinjasByUserId(userId));
    const clan = { name: candidate.clanName || 'Roturier' };
    let recruitName = candidate.name;
    if (globalKeys.has(ninjaIdentityKey(recruitName)) && hasRemainingGlobalNames(globalKeys, clan)) {
      recruitName = pickUniqueCivName({
        forbiddenIdentityKeys: localKeys,
        globalForbiddenKeys: globalKeys,
        clan,
      });
    }

    const ninja = await createNinja({
      user_id: userId,
      name: recruitName,
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

    return { ninjaId: ninja.id, name: ninja.name, price: draw.price };
  } catch (error) {
    await query('UPDATE academy_draws SET purchased = FALSE WHERE id = ?', [draw.id]);
    throw error;
  }
}
