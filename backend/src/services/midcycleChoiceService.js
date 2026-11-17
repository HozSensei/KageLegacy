/**
 * Rumeur mid-cycle (H36–H70) : info imparfaite payante sur le deck adverse.
 */

import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getGameClock } from './gameClock.js';
import { getUserMatchForCycle } from './matchService.js';
import { generateScoutReport } from './scouting.js';
import { getUserLanguage } from './narrative/viewerLocale.js';

export const RUMOR_COST = 200;
const RUMOR_ACCURACY = 0.7;

const DOMAIN_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

function shuffleHint(domains, accurate) {
  const entries = Object.entries(domains || {}).filter(([, v]) => Number(v) > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][0];
  if (accurate) return top;
  const others = DOMAIN_KEYS.filter((d) => d !== top);
  return others[Math.floor(Math.random() * others.length)];
}

export async function getMidcycleChoicePayload(userId) {
  const clock = await getGameClock();
  const hour = clock.hour ?? 0;
  const pool = await findUserPool(userId);
  const senseiRows = await query(
    'SELECT ryos, midcycle_rumor_cycle FROM sensei WHERE user_id = ?',
    [userId],
  );
  const sensei = senseiRows[0];
  if (!sensei || !pool) {
    return { available: false, reason: 'no_pool' };
  }

  const windowOpen = hour >= 36 && hour < 71;
  const alreadyUsed = sensei.midcycle_rumor_cycle === pool.current_cycle;
  const canAfford = sensei.ryos >= RUMOR_COST;

  return {
    available: windowOpen && !alreadyUsed,
    windowOpen,
    alreadyUsed,
    canAfford,
    cost: RUMOR_COST,
    hour,
    seasonCycle: pool.current_cycle,
    ryos: sensei.ryos,
  };
}

export async function purchaseMidcycleRumor(userId) {
  const status = await getMidcycleChoicePayload(userId);
  if (!status.windowOpen) {
    const error = new Error('La rumeur n\'est disponible qu\'entre H36 et H70.');
    error.statusCode = 400;
    throw error;
  }
  if (status.alreadyUsed) {
    const error = new Error('Vous avez déjà acheté une rumeur ce cycle.');
    error.statusCode = 400;
    throw error;
  }
  if (!status.canAfford) {
    const error = new Error('Ryos insuffisants pour la rumeur.');
    error.statusCode = 400;
    throw error;
  }

  const pool = await findUserPool(userId);
  const lang = await getUserLanguage(userId);
  const scout = await generateScoutReport(userId, pool.current_cycle, lang);
  const domainCounts =
    scout?.deckReport?.domainCounts || scout?.deckReport?.primaryDomains || {};

  const accurate = Math.random() < RUMOR_ACCURACY;
  const hintedDomain = shuffleHint(domainCounts, accurate);

  await query(
    'UPDATE sensei SET ryos = ryos - ?, midcycle_rumor_cycle = ? WHERE user_id = ? AND ryos >= ?',
    [RUMOR_COST, pool.current_cycle, userId, RUMOR_COST],
  );

  const match = await getUserMatchForCycle(userId, pool.current_cycle);
  const opponentName = match
    ? match.home_user_id === userId
      ? match.away_sensei
      : match.home_sensei
    : null;

  const labels = {
    fr: {
      taijutsu: 'Taijutsu',
      ninjutsu: 'Ninjutsu',
      genjutsu: 'Genjutsu',
      medecine: 'Médecine',
    },
    en: {
      taijutsu: 'Taijutsu',
      ninjutsu: 'Ninjutsu',
      genjutsu: 'Genjutsu',
      medecine: 'Medicine',
    },
  };
  const locale = lang === 'en' ? 'en' : 'fr';
  const domainLabel = hintedDomain ? labels[locale][hintedDomain] : null;

  const line = domainLabel
    ? locale === 'en'
      ? `Street rumor: ${opponentName || 'the opponent'} leans ${domainLabel}… (unreliable).`
      : `Rumeur de rue : ${opponentName || 'l\'adversaire'} penche ${domainLabel}… (fiabilité douteuse).`
    : locale === 'en'
      ? 'The informants came back empty-handed.'
      : 'Les informateurs sont revenus bredouilles.';

  return {
    cost: RUMOR_COST,
    line,
    hintedDomain,
    reliable: false,
    opponentName,
    status: await getMidcycleChoicePayload(userId),
  };
}
