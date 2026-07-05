import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { createNinja } from '../models/ninja.js';
import { clanTierLabel, getClanTier } from './clanRecruitment.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { generateNinjaProfile } from './ninjaGenerator.js';

const RECRUITMENT_WINDOW_END_HOUR = 12;
const OFFER_COUNT = 3;

function priceForCandidate(clanTier, potential) {
  if (clanTier === 'noble') return 2500 + randomInt(1501);
  if (clanTier === 'common') return 1200;
  if (potential === 'prodige') return 900;
  if (potential === 'prometteur') return 650;
  return 400;
}

function buildCandidate(clans, options = {}) {
  const profile = generateNinjaProfile({
    clans,
    grade: 'Genin',
    recruitmentOptions: options,
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

export async function getRecruitmentOffers(userId, cycleStartAt) {
  return query(
    `SELECT * FROM recruitment_offers
     WHERE user_id = ? AND cycle_start_at = ?
     ORDER BY slot_index`,
    [userId, cycleStartAt]
  );
}

export async function ensureRecruitmentForUser(userId, cycleStartAt) {
  const existing = await getRecruitmentOffers(userId, cycleStartAt);
  if (existing.length >= OFFER_COUNT) return existing;

  const clans = await query('SELECT * FROM clan_traits ORDER BY id');
  const candidates = [
    buildCandidate(clans, { forceRoturier: true }),
    buildCandidate(clans),
    buildCandidate(clans),
  ];

  for (let slot = 0; slot < candidates.length; slot += 1) {
    const c = candidates[slot];
    const { displayProfile, clanTier, clanName, price, ...profile } = c;
    await query(
      `INSERT IGNORE INTO recruitment_offers (user_id, cycle_start_at, slot_index, candidate_json, price)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, cycleStartAt, slot, JSON.stringify({ ...profile, clanTier, clanName, displayProfile }), price]
    );
  }

  return getRecruitmentOffers(userId, cycleStartAt);
}

export async function ensureRecruitmentForAllUsers(cycleStartAt) {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const results = [];
  for (const user of users) {
    const offers = await ensureRecruitmentForUser(user.id, cycleStartAt);
    results.push({ userId: user.id, offers: offers.length });
  }
  return results;
}

export async function getRecruitmentPayload(userId) {
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) return { offers: [], windowOpen: false, purchasedThisCycle: false };

  const offers = await ensureRecruitmentForUser(userId, cycleStartAt);
  const clock = await getGameClock();

  const purchased = offers.some((o) => o.purchased);

  return {
    offers: offers.map((o) => {
      const candidate = typeof o.candidate_json === 'string' ? JSON.parse(o.candidate_json) : o.candidate_json;
      return {
        id: o.id,
        slotIndex: o.slot_index,
        price: o.price,
        purchased: Boolean(o.purchased),
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
    }),
    windowOpen: clock.hour < RECRUITMENT_WINDOW_END_HOUR,
    purchasedThisCycle: purchased,
    windowEndsAtHour: RECRUITMENT_WINDOW_END_HOUR,
  };
}

export async function purchaseRecruitmentOffer(userId, offerId) {
  const clock = await getGameClock();
  if (clock.hour >= RECRUITMENT_WINDOW_END_HOUR) {
    const error = new Error('La fenêtre de recrutement est fermée (H12+).');
    error.statusCode = 423;
    throw error;
  }

  const clockRow = await getClockRow();
  const rows = await query(
    `SELECT ro.*, s.ryos
     FROM recruitment_offers ro
     JOIN sensei s ON s.user_id = ro.user_id
     WHERE ro.id = ? AND ro.user_id = ? AND ro.cycle_start_at = ?`,
    [offerId, userId, clockRow.cycle_start_at]
  );
  const offer = rows[0];
  if (!offer) {
    const error = new Error('Candidat introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (offer.purchased) {
    const error = new Error('Ce candidat a déjà été recruté.');
    error.statusCode = 409;
    throw error;
  }

  const alreadyBought = await query(
    `SELECT id FROM recruitment_offers
     WHERE user_id = ? AND cycle_start_at = ? AND purchased = TRUE`,
    [userId, clockRow.cycle_start_at]
  );
  if (alreadyBought.length) {
    const error = new Error('Un seul recrutement payant par cycle.');
    error.statusCode = 409;
    throw error;
  }

  if (offer.ryos < offer.price) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const candidate =
    typeof offer.candidate_json === 'string'
      ? JSON.parse(offer.candidate_json)
      : offer.candidate_json;

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [offer.price, userId]);
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

  await query('UPDATE recruitment_offers SET purchased = TRUE WHERE id = ?', [offerId]);

  return { ninjaId: ninja.id, name: ninja.name, price: offer.price };
}
