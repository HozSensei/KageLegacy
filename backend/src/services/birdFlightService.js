/**
 * M7 — Vol d'Oiseau : départ Chunin → Jonin, prime Ryos/réputation, relève Genin.
 */

import { query } from '../config/database.js';
import { findAllClanTraits } from '../models/clanTrait.js';
import { createNinja, findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { combatStat } from './chuninExam.js';
import { meetsBirdFlightRequirements } from './birdFlightExam.js';
import { generateNinjaProfile } from './ninjaGenerator.js';
import { collectIdentityKeys } from './ninjaNaming.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { createDojoNotification } from './dojoNotifications.js';
import { createHeritageScroll, getDominantStat } from './heritageService.js';

const MAJOR_STATS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

const RYOS_BASE = 3000;
const RYOS_PER_STAT = 150;
const REPUTATION_BASE = 10;
const REPUTATION_NOBLE_BONUS = 5;

export function computeBirdFlightRewards(ninja, { clanIsNoble = false } = {}) {
  const statSum =
    ninja.taijutsu +
    ninja.ninjutsu +
    ninja.genjutsu +
    ninja.medecine +
    ninja.vitesse +
    ninja.intelligence;
  const ryos = RYOS_BASE + statSum * RYOS_PER_STAT;
  const reputation = REPUTATION_BASE + (clanIsNoble ? REPUTATION_NOBLE_BONUS : 0);
  return { ryos, reputation, statSum };
}

export function getBirdFlightPeakStat(ninja) {
  return Math.max(...MAJOR_STATS.map((s) => ninja[s]));
}

async function spawnReplacementGenin(userId, squadPosition, language) {
  const clans = await findAllClanTraits();
  const existing = await findNinjasByUserId(userId);
  const globalKeys = await loadGlobalIdentityKeySet();
  const profile = await generateNinjaProfile({
    clans,
    grade: 'Genin',
    language,
    recruitmentOptions: { forceRoturier: true },
    forbiddenIdentityKeys: collectIdentityKeys(existing),
    forbiddenGlobalKeys: globalKeys,
  });

  const moral = 20;
  const ninja = await createNinja({
    user_id: userId,
    ...profile,
    moral,
    weekly_forme: 'Excellent',
    squad_position: squadPosition,
  });

  return {
    ...ninja,
    profile: describeNinjaProfile(ninja, language),
  };
}

export async function processBirdFlightsForUser(userId) {
  const candidates = await query(
    `SELECT n.*, c.is_noble AS clan_is_noble, s.language
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     JOIN sensei s ON s.user_id = n.user_id
     WHERE n.user_id = ? AND n.grade = 'Chunin' AND n.bird_flight_requested = TRUE`,
    [userId]
  );

  const results = [];

  for (const ninja of candidates) {
    if (!meetsBirdFlightRequirements(ninja)) {
      await query('UPDATE ninjas SET bird_flight_requested = FALSE WHERE id = ?', [ninja.id]);
      results.push({
        ninjaId: ninja.id,
        name: ninja.name,
        outcome: 'cancelled',
        reason: 'requirements_not_met',
      });
      continue;
    }

    const rewards = computeBirdFlightRewards(ninja, { clanIsNoble: Boolean(ninja.clan_is_noble) });
    const squadPosition = ninja.squad_position;
    const peakStat = getBirdFlightPeakStat(ninja);
    const dominantStat = getDominantStat(ninja);

    await query('UPDATE sensei SET ryos = ryos + ?, reputation = reputation + ? WHERE user_id = ?', [
      rewards.ryos,
      rewards.reputation,
      userId,
    ]);

    await createHeritageScroll(userId, ninja);

    await query('DELETE FROM ninjas WHERE id = ?', [ninja.id]);

    const arrival = await spawnReplacementGenin(userId, squadPosition, ninja.language || 'fr');

    const payload = {
      departed: {
        name: ninja.name,
        grade: 'Chunin',
        peakStat,
        dominantStat,
        combatStat: combatStat(ninja),
        heritageGranted: true,
        ryosReward: rewards.ryos,
        reputationReward: rewards.reputation,
        clanNoble: Boolean(ninja.clan_is_noble),
      },
      arrival: {
        id: arrival.id,
        name: arrival.name,
        grade: arrival.grade,
        clanName: arrival.clan_name,
        potential: arrival.profile?.potentialLabel,
        primaryArt: arrival.profile?.artLabel,
      },
    };

    await createDojoNotification(userId, 'bird_flight', payload);

    results.push({
      ninjaId: ninja.id,
      name: ninja.name,
      outcome: 'graduated',
      rewards,
      replacementId: arrival.id,
      replacementName: arrival.name,
    });
  }

  return results;
}

export async function processBirdFlightsForAllUsers() {
  const users = await query('SELECT id FROM users WHERE is_bot = FALSE');
  const all = [];
  for (const user of users) {
    all.push(...(await processBirdFlightsForUser(user.id)));
  }
  return all;
}

export { BIRD_FLIGHT_COMBAT_REQUIRED, BIRD_FLIGHT_IQ_REQUIRED } from './birdFlightExam.js';
export { MAJOR_STATS };
