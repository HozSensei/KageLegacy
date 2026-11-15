import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { clanTierLabel, getClanTier } from './clanRecruitment.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { generateNinjaProfile } from './ninjaGenerator.js';
import { collectIdentityKeys } from './ninjaNaming.js';
import { createNinjaFromAcademyCandidate, parseCandidateJson } from './academyRecruit.js';
import { isTacticsLocked } from './gameClock.js';
import { utcDateString, nextUtcMidnightIso } from './dailyUtc.js';

export const ACADEMY_SLOT_COUNT = 3;
/** slot 0 = plus récent, slot 2 = expire en premier à la rotation */
export const ACADEMY_NEWEST_SLOT = 0;
export const ACADEMY_OLDEST_SLOT = ACADEMY_SLOT_COUNT - 1;

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

async function hasJackpotToken(userId) {
  const rows = await query(
    'SELECT academy_jackpot_token FROM sensei WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return Boolean(rows[0]?.academy_jackpot_token);
}

async function consumeJackpotToken(userId) {
  await query('UPDATE sensei SET academy_jackpot_token = 0 WHERE user_id = ?', [userId]);
}

async function buildRandomAspirant(clans, userId, { forceJackpot = false } = {}) {
  const existing = userId ? await findNinjasByUserId(userId) : [];
  const globalKeys = await loadGlobalIdentityKeySet();

  let recruitmentOptions = {};
  let forcedPotential = null;

  if (forceJackpot) {
    const noble = clans.filter((c) => c.is_noble && c.name !== 'Roturier');
    if (noble.length && randomInt(2) === 0) {
      recruitmentOptions = { forceNoble: true };
    } else {
      forcedPotential = 'prodige';
    }
  }

  const profile = await generateNinjaProfile({
    clans,
    grade: 'Genin',
    forbiddenIdentityKeys: collectIdentityKeys(existing),
    forbiddenGlobalKeys: globalKeys,
    recruitmentOptions,
    forcedPotential,
  });

  const clan = clans.find((c) => c.id === profile.clan_trait_id);
  const clanTier = getClanTier(clan);
  const price = priceForCandidate(clanTier, profile.potential);

  return {
    ...profile,
    clanTier,
    clanName: clan?.name,
    jackpotForced: forceJackpot,
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
    slotIndex: row.slot_index,
    price: row.price,
    recruited: isPurchased(row),
    spawnedAt: row.spawned_at,
    expiresSoon: row.slot_index === ACADEMY_OLDEST_SLOT,
    candidate: {
      name: candidate.name,
      clanTier: candidate.clanTier,
      clanTierLabel: clanTierLabel(candidate.clanTier, candidate.language || 'fr'),
      potential: candidate.potential,
      primaryArt: candidate.primary_art,
      profile: candidate.displayProfile,
      element: candidate.element_affinity,
      characterTrait: candidate.character_trait,
      traitBoost: candidate.trait_boost,
      jackpotForced: Boolean(candidate.jackpotForced),
    },
  };
}

export async function listAcademyDraws(userId) {
  const rows = await query(
    `SELECT * FROM academy_draws
     WHERE user_id = ? AND purchased = FALSE
     ORDER BY slot_index ASC`,
    [userId]
  );
  return rows;
}

async function insertAspirant(userId, slotIndex, aspirant) {
  const { displayProfile, clanTier, clanName, price, ...profile } = aspirant;
  await query(
    `INSERT INTO academy_draws (user_id, slot_index, candidate_json, price, spawned_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      userId,
      slotIndex,
      JSON.stringify({ ...profile, clanTier, clanName, displayProfile, jackpotForced: aspirant.jackpotForced }),
      price,
    ]
  );
}

/** Première visite uniquement : remplit les 3 emplacements vides. */
async function seedInitialRoster(userId, clans) {
  const rows = await listAcademyDraws(userId);
  if (rows.length > 0) return;

  const hasToken = await hasJackpotToken(userId);
  for (let slot = ACADEMY_NEWEST_SLOT; slot < ACADEMY_SLOT_COUNT; slot += 1) {
    const useJackpot = hasToken && slot === ACADEMY_NEWEST_SLOT;
    const aspirant = await buildRandomAspirant(clans, userId, { forceJackpot: useJackpot });
    if (useJackpot) await consumeJackpotToken(userId);
    await insertAspirant(userId, slot, aspirant);
  }
}

async function shiftSlotsForDailyRotation(userId, rows) {
  const bySlot = Object.fromEntries(rows.map((r) => [r.slot_index, r]));

  await query('DELETE FROM academy_draws WHERE user_id = ? AND slot_index = ?', [
    userId,
    ACADEMY_OLDEST_SLOT,
  ]);

  const slot1 = bySlot[1];
  const slot0 = bySlot[0];

  if (slot1) {
    await query('UPDATE academy_draws SET slot_index = ? WHERE id = ?', [ACADEMY_OLDEST_SLOT, slot1.id]);
  }
  if (slot0) {
    await query('UPDATE academy_draws SET slot_index = ? WHERE id = ?', [1, slot0.id]);
  }
}

export async function rotateAcademyForUser(userId) {
  const today = utcDateString();
  const senseiRows = await query(
    'SELECT academy_last_rotation_date FROM sensei WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const lastRotation = senseiRows[0]?.academy_last_rotation_date
    ? utcDateString(new Date(senseiRows[0].academy_last_rotation_date))
    : null;

  const clans = await query('SELECT * FROM clan_traits ORDER BY id');

  if (!lastRotation) {
    await query('UPDATE sensei SET academy_last_rotation_date = ? WHERE user_id = ?', [today, userId]);
    await seedInitialRoster(userId, clans);
    return { rotated: false, seeded: true };
  }

  if (lastRotation === today) {
    return { rotated: false };
  }

  const rows = await listAcademyDraws(userId);
  await shiftSlotsForDailyRotation(userId, rows);

  const hasToken = await hasJackpotToken(userId);
  const aspirant = await buildRandomAspirant(clans, userId, { forceJackpot: hasToken });
  if (hasToken) await consumeJackpotToken(userId);
  await insertAspirant(userId, ACADEMY_NEWEST_SLOT, aspirant);

  await query('UPDATE sensei SET academy_last_rotation_date = ? WHERE user_id = ?', [today, userId]);

  return { rotated: true };
}

export async function ensureAcademyDrawForUser(userId) {
  await rotateAcademyForUser(userId);
  return listAcademyDraws(userId);
}

export async function ensureAcademyForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    await rotateAcademyForUser(user.id);
    results.push({ userId: user.id });
  }
  return results;
}

export async function getAcademyPayload(userId) {
  const rows = await ensureAcademyDrawForUser(userId);
  const draws = rows.map(mapDrawRow).filter(Boolean);
  const tacticsLocked = await isTacticsLocked();

  return {
    draws,
    aspirantCount: draws.length,
    rotationOpen: !tacticsLocked,
    nextRotationAt: nextUtcMidnightIso(),
    recruitedCount: draws.filter((d) => d.recruited).length,
  };
}

export async function recruitAcademyAspirant(userId, drawId) {
  if (await isTacticsLocked()) {
    const error = new Error('L\'Académie est fermée pendant l\'opération (à partir de H71).');
    error.statusCode = 423;
    throw error;
  }

  const drawRows = await query(
    'SELECT * FROM academy_draws WHERE id = ? AND user_id = ? LIMIT 1',
    [drawId, userId]
  );
  const draw = drawRows[0];
  if (!draw) {
    const error = new Error('Aspirant introuvable à l\'Académie.');
    error.statusCode = 404;
    throw error;
  }
  if (isPurchased(draw)) {
    const error = new Error('Cet aspirant a déjà rejoint votre effectif.');
    error.statusCode = 409;
    throw error;
  }

  const claim = await query(
    'UPDATE academy_draws SET purchased = TRUE WHERE id = ? AND purchased = FALSE',
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

  const candidate = parseCandidateJson(draw.candidate_json);

  try {
    await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [draw.price, userId]);
    const ninja = await createNinjaFromAcademyCandidate(userId, candidate);

    await query('DELETE FROM academy_draws WHERE id = ?', [draw.id]);

    return { ninjaId: ninja.id, name: ninja.name, price: draw.price };
  } catch (error) {
    await query('UPDATE academy_draws SET purchased = FALSE WHERE id = ?', [draw.id]);
    throw error;
  }
}
