import { query } from '../config/database.js';
import { getOperationDeck } from './operationDeckService.js';
import { DOMAIN_LABELS } from './combat/pli/constants.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { getClockRow } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { getIntelForUser } from './scoutIntelService.js';
import { getUserMatchForCycle } from './matchService.js';

function parseJson(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function countPrimaryDomains(techniquesByNinjaId, ninjas) {
  const counts = { taijutsu: 0, ninjutsu: 0, genjutsu: 0, medecine: 0 };
  for (const ninja of ninjas) {
    const tech = techniquesByNinjaId?.[ninja.id] || techniquesByNinjaId?.[String(ninja.id)] || {};
    const primary = tech.primary || 'taijutsu';
    counts[primary] = (counts[primary] || 0) + 1;
  }
  return counts;
}

function domainSummaryLines(counts, lang) {
  const labels =
    lang === 'en'
      ? { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Medicine' }
      : { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Médecine' };
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `${count}× ${labels[domain]}`);
}

export async function buildDeckReport(opponentId, seasonCycle, ninjas, lang, tier = 'full') {
  const deck = await getOperationDeck(opponentId, seasonCycle);
  const elementCount = deck.elementCardIds?.length ?? 0;
  const domainCounts = countPrimaryDomains(deck.techniquesByNinjaId, ninjas);

  const slots = ninjas.map((ninja, index) => {
    const profile = describeNinjaProfile(ninja, lang);
    const tech = deck.techniquesByNinjaId?.[ninja.id] || deck.techniquesByNinjaId?.[String(ninja.id)] || {};
    const primary = tech.primary || 'taijutsu';
    const secondary = tech.secondary || 'ninjutsu';
    return {
      slot: index + 1,
      artKey: profile.primaryArt,
      artLabel: profile.artLabel,
      primary,
      secondary,
      primaryLabel: DOMAIN_LABELS[primary] || primary,
      secondaryLabel: DOMAIN_LABELS[secondary] || secondary,
    };
  });

  const lines = [];
  if (tier === 'partial') {
    lines.push(
      lang === 'en'
        ? `Fragmentary deck intel — ${elementCount}/5 element cards configured.`
        : `Renseignements deck fragmentaires — ${elementCount}/5 éléments configurés.`
    );
    const summary = domainSummaryLines(domainCounts, lang);
    if (summary.length) {
      lines.push(
        lang === 'en'
          ? `Primary technique lean (estimated): ${summary.join(', ')}.`
          : `Orientation des techniques principales (estimée) : ${summary.join(', ')}.`
      );
    }
    return {
      tier: 'partial',
      elementCount,
      domainCounts,
      slots: slots.map((slot) => ({
        slot: slot.slot,
        artLabel: slot.artLabel,
        primaryLabel: null,
        secondaryLabel: null,
      })),
      elementCards: [],
      lines,
    };
  }

  lines.push(
    lang === 'en'
      ? `Operation deck: ${elementCount}/5 element cards in the shuffle.`
      : `Deck d'opération : ${elementCount}/5 éléments dans le mélange.`
  );
  const summary = domainSummaryLines(domainCounts, lang);
  if (summary.length) {
    lines.push(
      lang === 'en'
        ? `Primary techniques: ${summary.join(', ')}.`
        : `Techniques principales : ${summary.join(', ')}.`
    );
  }
  for (const slot of slots) {
    lines.push(
      lang === 'en'
        ? `Slot ${slot.slot} (${slot.artLabel}): ${slot.primaryLabel} / ${slot.secondaryLabel}.`
        : `Emplacement ${slot.slot} (${slot.artLabel}) : ${slot.primaryLabel} / ${slot.secondaryLabel}.`
    );
  }
  const elementCards = (deck.elementCards || []).map((card) => ({
    slug: card.slug,
    name: lang === 'en' ? card.nameEn || card.nameFr : card.nameFr || card.nameEn,
    statType: card.statType,
  }));
  if (elementCards.length) {
    lines.push(
      lang === 'en'
        ? `Deck elements: ${elementCards.map((c) => c.name).join(', ')}.`
        : `Éléments de deck : ${elementCards.map((c) => c.name).join(', ')}.`
    );
  }

  return {
    tier: 'full',
    elementCount,
    domainCounts,
    slots,
    elementCards,
    lines,
  };
}

export function buildPartialDeckReport(fullReport, lang) {
  return {
    ...fullReport,
    tier: 'partial',
    lines: fullReport.lines.slice(0, Math.min(2, fullReport.lines.length)),
    slots: fullReport.slots.map((slot) => ({
      ...slot,
      primaryLabel: null,
      secondaryLabel: null,
    })),
    elementCards: [],
  };
}

async function loadIntelRow(userId, poolId, seasonCycle, cycleStartAt) {
  const rows = await query(
    `SELECT id, roster_report_json FROM cycle_scout_intel
     WHERE viewer_user_id = ? AND pool_id = ? AND season_cycle = ? AND cycle_start_at = ?
     LIMIT 1`,
    [userId, poolId, seasonCycle, cycleStartAt]
  );
  return rows[0] ?? null;
}

export async function persistFrozenDeckReport(userId, seasonCycle, deckReport) {
  const pool = await findUserPool(userId);
  if (!pool) return null;
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) return null;

  const row = await loadIntelRow(userId, pool.id, seasonCycle, cycleStartAt);
  if (!row) return null;

  const rosterReport = parseJson(row.roster_report_json) || {};
  rosterReport.deckReport = deckReport;
  rosterReport.deckFrozenAt = new Date().toISOString();

  await query('UPDATE cycle_scout_intel SET roster_report_json = ? WHERE id = ?', [
    JSON.stringify(rosterReport),
    row.id,
  ]);
  return rosterReport;
}

export async function freezeDeckIntelForAllUsers() {
  const users = await query(
    `SELECT u.id FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = FALSE AND p.status = 'active'`
  );
  const results = [];
  for (const user of users) {
    const pool = await findUserPool(user.id);
    if (!pool) continue;
    const intel = await getIntelForUser(user.id, pool.current_cycle, 'fr');
    if (!intel?.rosterReport || intel.rosterReport.deckFrozenAt) continue;

    const match = await getUserMatchForCycle(user.id, pool.current_cycle);
    if (!match) continue;
    const opponentId =
      match.home_user_id === user.id ? match.away_user_id : match.home_user_id;

    const ninjas = await query(
      `SELECT id, element_affinity, taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence, grade
       FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
      [opponentId]
    );
    const tier = intel.rosterReport.tier === 'full' ? 'full' : 'partial';
    const fullDeck = await buildDeckReport(opponentId, pool.current_cycle, ninjas, 'fr', tier);
    const deckReport = tier === 'full' ? fullDeck : buildPartialDeckReport(fullDeck, 'fr');
    await persistFrozenDeckReport(user.id, pool.current_cycle, deckReport);
    results.push({ userId: user.id, deckReport });
  }
  return results;
}
