import { query } from '../config/database.js';
import { getOperationDeck } from './operationDeckService.js';
import {
  DOMAIN_LABELS,
  MAX_PLIS,
  TECHNIQUE_CARDS_PER_NINJA,
  PRIMARY_STAT_COPIES,
  SECONDARY_STAT_COPIES,
} from './combat/pli/constants.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { getClockRow } from './gameClock.js';
import { findUserPool } from './poolService.js';
import { getIntelForUser } from './scoutIntelService.js';
import { getUserMatchForCycle } from './matchService.js';

function parseJson(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function cardName(card, lang) {
  return lang === 'en' ? card.nameEn || card.nameFr : card.nameFr || card.nameEn;
}

function rawTechniquesForNinja(rawTechniquesByNinjaId, ninjaId) {
  return rawTechniquesByNinjaId?.[ninjaId] || rawTechniquesByNinjaId?.[String(ninjaId)] || null;
}

function isDomainConfigured(rawTechniquesByNinjaId, ninjaId) {
  const raw = rawTechniquesForNinja(rawTechniquesByNinjaId, ninjaId);
  return Boolean(raw?.primary && raw?.secondary);
}

function countInventoryAssigned(techniqueSlotsByNinjaId, ninjas) {
  return ninjas.filter((ninja) => {
    const ids = techniqueSlotsByNinjaId?.[ninja.id] || techniqueSlotsByNinjaId?.[String(ninja.id)] || [];
    return ids.length > 0;
  }).length;
}

function countDomainsFromDeck(deck, ninjas) {
  const counts = { taijutsu: 0, ninjutsu: 0, genjutsu: 0, medecine: 0 };
  for (const card of deck.techniqueCards || []) {
    const domain = card.statType || card.stat_type;
    if (domain) counts[domain] = (counts[domain] || 0) + 1;
  }
  for (const ninja of ninjas) {
    if (!isDomainConfigured(deck.rawTechniquesByNinjaId, ninja.id)) continue;
    const domains = deck.techniquesByNinjaId?.[ninja.id];
    if (domains?.primary) counts[domains.primary] = (counts[domains.primary] || 0) + PRIMARY_STAT_COPIES;
    if (domains?.secondary) counts[domains.secondary] = (counts[domains.secondary] || 0) + SECONDARY_STAT_COPIES;
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

export function buildDeckReportFromDeck(deck, ninjas, lang, tier = 'full') {
  const techniqueCount = deck.techniqueCount ?? 0;
  const maxTechniques = ninjas.length * TECHNIQUE_CARDS_PER_NINJA;
  const inventoryAssigned = countInventoryAssigned(deck.techniqueSlotsByNinjaId || {}, ninjas);
  const domainsConfigured = ninjas.filter((ninja) =>
    isDomainConfigured(deck.rawTechniquesByNinjaId, ninja.id)
  ).length;
  const relaisInventory = Math.max(0, maxTechniques - inventoryAssigned);
  const cardsById = Object.fromEntries(
    (deck.techniqueCards || []).map((c) => [c.userTacticCardId, c])
  );
  const domainCounts = countDomainsFromDeck(deck, ninjas);

  const slots = ninjas.map((ninja, index) => {
    const profile = describeNinjaProfile(ninja, lang);
    const assignedIds = deck.techniqueSlotsByNinjaId?.[ninja.id] || [];
    const techniques = assignedIds
      .map((id) => cardsById[id])
      .filter(Boolean)
      .map((card) => ({
        slug: card.slug,
        name: cardName(card, lang),
        statType: card.statType,
        bonusPct: card.pliBonusPct,
      }));
    const domains = deck.techniquesByNinjaId?.[ninja.id];
    return {
      slot: index + 1,
      artKey: profile.primaryArt,
      artLabel: profile.artLabel,
      techniques,
      primaryDomain: domains?.primary,
      secondaryDomain: domains?.secondary,
      domainsConfigured: isDomainConfigured(deck.rawTechniquesByNinjaId, ninja.id),
    };
  });

  const lines = [];
  if (tier === 'partial') {
    lines.push(
      lang === 'en'
        ? `Fragmentary deck intel — ${inventoryAssigned}/${maxTechniques} inventory technique cards assigned.`
        : `Renseignements deck fragmentaires — ${inventoryAssigned}/${maxTechniques} cartes technique inventaire assignées.`
    );
    const summary = domainSummaryLines(domainCounts, lang);
    if (summary.length) {
      lines.push(
        lang === 'en'
          ? `Technique lean (confirmed): ${summary.join(', ')}.`
          : `Orientation des techniques (confirmée) : ${summary.join(', ')}.`
      );
    } else if (inventoryAssigned === 0) {
      lines.push(
        lang === 'en'
          ? 'No inventory cards assigned — relay plis expected for empty slots.'
          : 'Aucune carte inventaire assignée — relais de comblement attendus sur les emplacements vides.'
      );
    }
    return {
      tier: 'partial',
      techniqueCount,
      inventoryAssigned,
      domainsConfigured,
      relaisInventory,
      pliCount: MAX_PLIS,
      domainCounts,
      slots: slots.map((slot) => ({
        slot: slot.slot,
        artLabel: slot.artLabel,
        techniques: [],
      })),
      techniqueCards: [],
      lines,
    };
  }

  lines.push(
    lang === 'en'
      ? `Spotted deck: ${inventoryAssigned}/${ninjas.length} inventory technique cards · ${domainsConfigured}/${ninjas.length} ninjas with saved stat domains · ${MAX_PLIS} plis per match.`
      : `Deck repéré : ${inventoryAssigned}/${ninjas.length} cartes technique inventaire · ${domainsConfigured}/${ninjas.length} ninjas avec domaines enregistrés · ${MAX_PLIS} plis par match.`
  );
  if (relaisInventory > 0) {
    lines.push(
      lang === 'en'
        ? `${relaisInventory} empty inventory slot(s) — relay padding plis expected.`
        : `${relaisInventory} emplacement(s) inventaire vide(s) — relais de comblement attendus.`
    );
  }
  const summary = domainSummaryLines(domainCounts, lang);
  if (summary.length) {
    lines.push(
      lang === 'en'
        ? `Techniques in deck (confirmed): ${summary.join(', ')}.`
        : `Techniques dans le deck (confirmées) : ${summary.join(', ')}.`
    );
  }
  for (const slot of slots) {
    if (!slot.techniques.length) {
      lines.push(
        lang === 'en'
          ? `Slot ${slot.slot} (${slot.artLabel}): no inventory card — relay plis expected.`
          : `Emplacement ${slot.slot} (${slot.artLabel}) : pas de carte inventaire — relais de comblement attendus.`
      );
      continue;
    }
    const domainSuffix = slot.domainsConfigured
      ? ''
      : lang === 'en'
        ? ' · stat domains auto'
        : ' · domaines stat auto';
    lines.push(
      lang === 'en'
        ? `Slot ${slot.slot} (${slot.artLabel}): ${slot.techniques.map((t) => t.name).join(', ') || '—'} · ${DOMAIN_LABELS[slot.primaryDomain] || slot.primaryDomain}/${DOMAIN_LABELS[slot.secondaryDomain] || slot.secondaryDomain}${domainSuffix}.`
        : `Emplacement ${slot.slot} (${slot.artLabel}) : ${slot.techniques.map((t) => t.name).join(', ') || '—'} · ${DOMAIN_LABELS[slot.primaryDomain] || slot.primaryDomain}/${DOMAIN_LABELS[slot.secondaryDomain] || slot.secondaryDomain}${domainSuffix}.`
    );
  }

  const techniqueCards = (deck.techniqueCards || []).map((card) => ({
    slug: card.slug,
    name: cardName(card, lang),
    statType: card.statType,
    bonusPct: card.pliBonusPct,
  }));

  return {
    tier: 'full',
    techniqueCount,
    inventoryAssigned,
    domainsConfigured,
    relaisInventory,
    pliCount: MAX_PLIS,
    domainCounts,
    slots,
    techniqueCards,
    lines,
  };
}

export async function buildDeckReport(opponentId, seasonCycle, ninjas, lang, tier = 'full') {
  const deck = await getOperationDeck(opponentId, seasonCycle);
  return buildDeckReportFromDeck(deck, ninjas, lang, tier);
}

export function buildPartialDeckReport(fullReport, lang) {
  return {
    ...fullReport,
    tier: 'partial',
    lines: fullReport.lines.slice(0, Math.min(2, fullReport.lines.length)),
    slots: fullReport.slots.map((slot) => ({
      ...slot,
      techniques: [],
    })),
    techniqueCards: [],
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
