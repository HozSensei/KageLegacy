import { query } from '../config/database.js';
import { getClockRow } from './gameClock.js';
import { getUserMatchForCycle } from './matchService.js';
import { findUserPool } from './poolService.js';
import { getUserReconMissionForCycle } from './reconnaissanceService.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { analyzeDomainMix, dominantElement, dominantArt } from './scoutSquadAnalysis.js';

const HISTORY_LIMIT = 5;

function parseJson(value) {
  if (!value) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export function computeReliability(sampleSize) {
  if (sampleSize <= 0) return 'none';
  if (sampleSize === 1) return 'very_low';
  if (sampleSize === 2) return 'low';
  if (sampleSize <= 4) return 'medium';
  return 'high';
}

export function buildSquadSnapshotFromNinjas(ninjas, lang = 'fr') {
  return ninjas.map((ninja) => {
    const profile = describeNinjaProfile(ninja, lang);
    return {
      ninjaId: ninja.id,
      element_affinity: ninja.element_affinity,
      primaryArt: profile.primaryArt,
      speed: Number(ninja.vitesse ?? 0) + Number(ninja.intelligence ?? 0),
    };
  });
}

export function buildDeckSnapshotFromOperationDeck(deck) {
  const techniques = deck?.techniquesByNinjaId || {};
  const primaryDomains = { taijutsu: 0, ninjutsu: 0, genjutsu: 0, medecine: 0 };
  for (const tech of Object.values(techniques)) {
    const primary = tech?.primary || 'taijutsu';
    primaryDomains[primary] = (primaryDomains[primary] || 0) + 1;
  }
  return {
    elementCount: deck?.elementCardIds?.length ?? deck?.elementCards?.length ?? 0,
    elementSlugs: (deck?.elementCards || []).map((c) => c.slug).filter(Boolean),
    primaryDomains,
  };
}

export function extractOpponentDeckFromMatch(matchRow, opponentId) {
  const log = parseJson(matchRow.combat_log);
  if (!log?.deckSnapshots) return null;
  return matchRow.home_user_id === opponentId ? log.deckSnapshots.home : log.deckSnapshots.away;
}

export function extractOpponentSquadFromMatch(matchRow, opponentId) {
  const log = parseJson(matchRow.combat_log);
  if (!log?.squadSnapshots) return null;
  return matchRow.home_user_id === opponentId ? log.squadSnapshots.home : log.squadSnapshots.away;
}

export async function loadOpponentAppliedMatches(opponentId, poolId, limit = HISTORY_LIMIT) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || HISTORY_LIMIT));
  return query(
    `SELECT m.season_cycle, m.home_user_id, m.away_user_id, m.combat_log
     FROM matches m
     WHERE m.pool_id = ? AND m.status = 'applied'
       AND (m.home_user_id = ? OR m.away_user_id = ?)
     ORDER BY m.season_cycle DESC
     LIMIT ${safeLimit}`,
    [poolId, opponentId, opponentId]
  );
}

export function buildHistoricalTendencies(opponentId, matchRows, lang = 'fr') {
  const squads = [];
  const decks = [];
  for (const row of matchRows) {
    const squad = extractOpponentSquadFromMatch(row, opponentId);
    if (squad?.length) squads.push(squad);
    const deck = extractOpponentDeckFromMatch(row, opponentId);
    if (deck) decks.push(deck);
  }

  const sampleSize = squads.length;
  const reliability = computeReliability(sampleSize);
  const lines = [];
  const header =
    lang === 'en'
      ? reliability === 'none'
        ? 'No past league matches on record — tendencies unavailable.'
        : reliability === 'very_low'
          ? `Based on ${sampleSize} past match — very unreliable (first league outing).`
          : reliability === 'low'
            ? `Based on ${sampleSize} past matches — limited reliability (early season).`
            : `Based on ${sampleSize} past league matches.`
      : reliability === 'none'
        ? 'Aucun match de ligue passé — tendances indisponibles.'
        : reliability === 'very_low'
          ? `Calculé sur ${sampleSize} match passé — très peu fiable (première sortie en ligue).`
          : reliability === 'low'
            ? `Calculé sur ${sampleSize} matchs passés — fiabilité limitée (début de saison).`
            : `Calculé sur ${sampleSize} derniers matchs de ligue.`;

  lines.push(header);

  if (!sampleSize) {
    return {
      sampleSize: 0,
      reliability,
      lines,
      summary: null,
    };
  }

  const allNinjas = squads.flat();
  const domains = analyzeDomainMix(allNinjas);
  const matchCount = squads.length;
  const avgTaiLean = domains.taijutsu / matchCount;
  const avgNinLean = domains.ninjutsu / matchCount;
  const avgMedLean = domains.medecine / matchCount;
  const element = dominantElement(allNinjas);
  const art = dominantArt(allNinjas);
  const avgSpeed = allNinjas.reduce((s, n) => s + (n.speed ?? 0), 0) / allNinjas.length;

  if (avgTaiLean >= 1.2) {
    lines.push(
      lang === 'en'
        ? 'Usually fields multiple Taijutsu specialists.'
        : 'Dispose souvent de plusieurs spécialistes Taijutsu.'
    );
  }
  if (avgNinLean >= 1.2) {
    lines.push(
      lang === 'en'
        ? 'Often leans on Ninjutsu pressure.'
        : 'S\'appuie souvent sur la pression Ninjutsu.'
    );
  }
  if (avgMedLean >= 0.8) {
    lines.push(
      lang === 'en'
        ? 'Frequently includes Medicine-oriented ninjas.'
        : 'Inclut fréquemment des ninjas orientés Médecine.'
    );
  }
  if (art) {
    const artLabel =
      lang === 'en'
        ? { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Medicine' }[art]
        : { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Médecine' }[art];
    lines.push(
      lang === 'en'
        ? `Dominant art across recent lineups: ${artLabel}.`
        : `Voie dominante sur les dernières compositions : ${artLabel}.`
    );
  }
  if (element) {
    lines.push(
      lang === 'en'
        ? `Recurring ${element} affinity in recent trios.`
        : `Affinité ${element} récurrente dans les trios récents.`
    );
  }
  if (avgSpeed >= 55) {
    lines.push(
      lang === 'en' ? 'Historically fast tactical tempo.' : 'Tempo tactique historiquement rapide.'
    );
  } else   if (avgSpeed <= 40) {
    lines.push(
      lang === 'en' ? 'Historically slow tactical tempo.' : 'Tempo tactique historiquement lent.'
    );
  }

  if (decks.length) {
    const avgElements = decks.reduce((s, d) => s + (d.elementCount || 0), 0) / decks.length;
    const domainTotals = { taijutsu: 0, ninjutsu: 0, genjutsu: 0, medecine: 0 };
    for (const deck of decks) {
      for (const [domain, count] of Object.entries(deck.primaryDomains || {})) {
        domainTotals[domain] = (domainTotals[domain] || 0) + count;
      }
    }
    const dominantDeckDomain = Object.entries(domainTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (avgElements >= 3) {
      lines.push(
        lang === 'en'
          ? `Often fields ~${Math.round(avgElements)} deck element cards per match.`
          : `Dispose souvent d'environ ${Math.round(avgElements)} éléments de deck par match.`
      );
    }
    if (dominantDeckDomain) {
      const label =
        lang === 'en'
          ? { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Medicine' }[
              dominantDeckDomain
            ]
          : { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Médecine' }[
              dominantDeckDomain
            ];
      lines.push(
        lang === 'en'
          ? `Deck techniques often lean ${label} as primary domain.`
          : `Les techniques de deck penchent souvent vers ${label} en domaine principal.`
      );
    }
  }

  return {
    sampleSize,
    reliability,
    lines,
    summary: {
      avgTaiLean,
      avgNinLean,
      avgMedLean,
      dominantElement: element,
      dominantArt: art,
      avgSpeed,
    },
  };
}

async function loadIntelRow(userId, poolId, seasonCycle, cycleStartAt) {
  const rows = await query(
    `SELECT * FROM cycle_scout_intel
     WHERE viewer_user_id = ? AND pool_id = ? AND season_cycle = ? AND cycle_start_at = ?
     LIMIT 1`,
    [userId, poolId, seasonCycle, cycleStartAt]
  );
  return rows[0] ?? null;
}

async function upsertIntelRow({
  cycleStartAt,
  poolId,
  viewerUserId,
  opponentUserId,
  seasonCycle,
  tendencies = undefined,
  tendenciesSampleSize = undefined,
  tendenciesReliability = undefined,
  rosterReport = undefined,
  rosterFrozenAt = undefined,
  tendenciesGeneratedAt = undefined,
}) {
  const existing = await loadIntelRow(viewerUserId, poolId, seasonCycle, cycleStartAt);
  const rosterAlreadyFrozen = Boolean(existing?.roster_frozen_at);

  if (existing) {
    if (rosterAlreadyFrozen) {
      rosterReport = undefined;
      rosterFrozenAt = undefined;
    }
    if (existing.tendencies_generated_at && tendencies !== undefined) {
      tendencies = undefined;
      tendenciesSampleSize = undefined;
      tendenciesReliability = undefined;
      tendenciesGeneratedAt = undefined;
    }
  }

  if (!existing) {
    await query(
      `INSERT INTO cycle_scout_intel
         (cycle_start_at, pool_id, viewer_user_id, opponent_user_id, season_cycle,
          tendencies_json, tendencies_sample_size, tendencies_reliability,
          roster_report_json, roster_frozen_at, tendencies_generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cycleStartAt,
        poolId,
        viewerUserId,
        opponentUserId,
        seasonCycle,
        tendencies ? JSON.stringify(tendencies) : null,
        tendenciesSampleSize ?? 0,
        tendenciesReliability ?? 'none',
        rosterReport ? JSON.stringify(rosterReport) : null,
        rosterFrozenAt ?? null,
        tendenciesGeneratedAt ?? null,
      ]
    );
    return;
  }

  const fields = [];
  const params = [];
  const set = (col, val) => {
    if (val !== undefined) {
      fields.push(`${col} = ?`);
      params.push(val);
    }
  };

  set('opponent_user_id', opponentUserId);
  set('tendencies_json', tendencies ? JSON.stringify(tendencies) : undefined);
  set('tendencies_sample_size', tendenciesSampleSize);
  set('tendencies_reliability', tendenciesReliability);
  set('roster_report_json', rosterReport ? JSON.stringify(rosterReport) : undefined);
  set('roster_frozen_at', rosterFrozenAt);
  set('tendencies_generated_at', tendenciesGeneratedAt);

  if (!fields.length) return;
  params.push(existing.id);
  await query(`UPDATE cycle_scout_intel SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function generateTendenciesIntelForUser(userId, seasonCycle, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const pool = await findUserPool(userId);
  if (!pool) return null;

  const match = await getUserMatchForCycle(userId, seasonCycle);
  if (!match) return null;

  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) return null;

  const existing = await loadIntelRow(userId, pool.id, seasonCycle, cycleStartAt);
  if (existing?.tendencies_generated_at) {
    return parseJson(existing.tendencies_json);
  }

  const opponentId =
    match.home_user_id === userId ? match.away_user_id : match.home_user_id;
  const history = await loadOpponentAppliedMatches(opponentId, pool.id);
  const tendencies = buildHistoricalTendencies(opponentId, history, lang);

  await upsertIntelRow({
    cycleStartAt,
    poolId: pool.id,
    viewerUserId: userId,
    opponentUserId: opponentId,
    seasonCycle,
    tendencies,
    tendenciesSampleSize: tendencies.sampleSize,
    tendenciesReliability: tendencies.reliability,
    tendenciesGeneratedAt: new Date(),
  });

  return tendencies;
}

export async function generateTendenciesIntelForAllUsers() {
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
    const tendencies = await generateTendenciesIntelForUser(user.id, pool.current_cycle, 'fr');
    if (tendencies) results.push({ userId: user.id, tendencies });
  }
  return results;
}

export async function getIntelForUser(userId, seasonCycle, locale = 'fr') {
  const pool = await findUserPool(userId);
  if (!pool) return null;
  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) return null;
  const row = await loadIntelRow(userId, pool.id, seasonCycle, cycleStartAt);
  if (!row) return null;
  return {
    tendencies: parseJson(row.tendencies_json),
    tendenciesSampleSize: row.tendencies_sample_size,
    tendenciesReliability: row.tendencies_reliability,
    rosterReport: parseJson(row.roster_report_json),
    rosterFrozenAt: row.roster_frozen_at,
    tendenciesGeneratedAt: row.tendencies_generated_at,
  };
}

export async function ensureIntelForHour(userId, seasonCycle, hour, locale = 'fr') {
  if (hour < 36) return getIntelForUser(userId, seasonCycle, locale);
  let intel = await getIntelForUser(userId, seasonCycle, locale);
  if (hour >= 36 && !intel?.tendenciesGeneratedAt) {
    await generateTendenciesIntelForUser(userId, seasonCycle, locale);
    intel = await getIntelForUser(userId, seasonCycle, locale);
  }
  return intel;
}

export { upsertIntelRow };
