import { createHash } from 'node:crypto';
import { query } from '../config/database.js';
import { getUserMatchForCycle } from './matchService.js';
import { getScoutEnvironmentLine } from './matchEnvironment.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { getUserReconMissionForCycle } from './reconnaissanceService.js';
import {
  ensureIntelForHour,
  getIntelForUser,
  upsertIntelRow,
} from './scoutIntelService.js';
import { findUserPool } from './poolService.js';

function analyzeStrategies(ninjas) {
  const counts = { Tank: 0, Offensive: 0, Protect: 0, Normal: 0 };
  for (const n of ninjas) {
    const key = n.battle_strategy || 'Normal';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function dominantElement(ninjas) {
  const freq = {};
  for (const n of ninjas) {
    freq[n.element_affinity] = (freq[n.element_affinity] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function fuzzyPotentialHint(potential, lang) {
  const map = {
    fr: { ordinaire: 'modéré', prometteur: 'élevé', prodige: 'très élevé' },
    en: { ordinaire: 'moderate', prometteur: 'high', prodige: 'very high' },
  };
  return map[lang]?.[potential] || potential;
}

function speedBand(speed, lang) {
  if (speed >= 55) return 'fast';
  if (speed <= 40) return 'slow';
  return 'medium';
}

function buildFuzzyProfiles(ninjas, lang) {
  return ninjas.map((ninja) => {
    const profile = describeNinjaProfile(ninja, lang);
    return {
      artKey: profile.primaryArt,
      artLabel: profile.artLabel,
      potentialHint: fuzzyPotentialHint(profile.potential, lang),
      element: ninja.element_affinity,
      strategy: ninja.battle_strategy || 'Normal',
    };
  });
}

function buildProfileSummaryLines(profiles, lang) {
  const artCounts = {};
  for (const p of profiles) {
    artCounts[p.artKey] = (artCounts[p.artKey] || 0) + 1;
  }
  const lines = [];
  const arts = Object.entries(artCounts)
    .map(([art, count]) => ({ art, count }))
    .sort((a, b) => b.count - a.count);

  if (arts.length) {
    const parts = arts.map(({ art, count }) => {
      const label =
        lang === 'en'
          ? { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Medicine' }[art]
          : { taijutsu: 'Taijutsu', ninjutsu: 'Ninjutsu', genjutsu: 'Genjutsu', medecine: 'Médecine' }[art];
      return count > 1 ? `${count}× ${label}` : `1× ${label}`;
    });
    lines.push(
      lang === 'en'
        ? `Estimated squad profiles: ${parts.join(', ')}.`
        : `Profils estimés dans l'escouade adverse : ${parts.join(', ')}.`
    );
  }

  const highPotential = profiles.filter(
    (p) => p.potentialHint === 'élevé' || p.potentialHint === 'high' || p.potentialHint === 'très élevé' || p.potentialHint === 'very high'
  ).length;
  if (highPotential >= 1) {
    lines.push(
      lang === 'en'
        ? `${highPotential} member(s) show high estimated potential (promising or prodigy).`
        : `${highPotential} membre(s) affichent un potentiel estimé élevé (prometteur ou prodige).`
    );
  }

  return lines;
}

function buildTendencyLines(strategies, speed, element, lang) {
  const lines = [];
  if (strategies.Offensive >= 2) {
    lines.push(
      lang === 'en'
        ? 'Marked offensive disposition on several members.'
        : 'Disposition offensive marquée sur plusieurs membres.'
    );
  }
  if (strategies.Tank >= 1) {
    lines.push(
      lang === 'en'
        ? 'At least one Defensive order detected.'
        : 'Au moins une consigne Défensive repérée.'
    );
  }
  if (strategies.Protect >= 1) {
    lines.push(
      lang === 'en'
        ? 'Protection orders spotted — expect targeted heals under pressure.'
        : 'Consignes Protection repérées — soins ciblés probables sous pression.'
    );
  }
  if (speedBand(speed, lang) === 'fast') {
    lines.push(
      lang === 'en'
        ? 'Very fast squad — watch initiative.'
        : 'Escouade très rapide — attention à l\'initiative.'
    );
  } else if (speedBand(speed, lang) === 'slow') {
    lines.push(
      lang === 'en'
        ? 'Modest tactical speed — slower match likely.'
        : 'Vitesse tactique modeste — match probablement lent.'
    );
  }
  if (element) {
    lines.push(
      lang === 'en'
        ? `Dominant ${element} affinity in the trio.`
        : `Affinité ${element} dominante dans le trio.`
    );
  }
  return lines;
}

function scoutQualityRoll(missionId, userId) {
  const hash = createHash('sha256').update(`scout:${missionId}:${userId}`).digest();
  return hash.readUInt32BE(0) % 100;
}

export function resolveScoutTier(mission, userId) {
  const { outcome, scorePct, missionId } = mission;
  if (outcome === 'loss' || outcome === 'draw') {
    return {
      tier: 'partial',
      reconOutcome: outcome,
      reconScorePct: scorePct,
      fullReportChance: null,
      fullReportRoll: null,
    };
  }
  const chance = Math.max(0, Math.min(100, Math.round(scorePct ?? 50)));
  const roll = scoutQualityRoll(missionId, userId);
  return {
    tier: roll < chance ? 'full' : 'partial',
    reconOutcome: 'win',
    reconScorePct: scorePct,
    fullReportChance: chance,
    fullReportRoll: roll,
  };
}

function buildPartialRosterReport(fullReport, lang) {
  const unknownPotential = lang === 'en' ? 'unknown' : 'inconnu';
  const lines = fullReport.lines.slice(0, Math.min(2, fullReport.lines.length));
  if (!lines.length) {
    lines.push(
      lang === 'en'
        ? 'Fragmentary intel — the recon mission did not yield a clear picture.'
        : 'Renseignements fragmentaires — la reconnaissance n\'a pas donné une image nette.'
    );
  }
  const profiles = fullReport.profiles
    .slice(0, 2)
    .map((profile) => ({
      ...profile,
      potentialHint: unknownPotential,
      strategy: null,
    }));
  return { ...fullReport, tier: 'partial', lines, profiles };
}

export async function buildRosterReportFromNinjas(userId, opponentId, opponentName, opponentIsBot, match, ninjas, lang) {
  const strategies = analyzeStrategies(ninjas);
  const speed = ninjas.reduce((s, n) => s + n.vitesse + n.intelligence, 0);
  const element = dominantElement(ninjas);
  const profiles = buildFuzzyProfiles(ninjas, lang);

  const lines = [
    ...buildProfileSummaryLines(profiles, lang),
    ...buildTendencyLines(strategies, speed, element, lang),
  ];

  if (match.environment_slug) {
    const clockRow = await getClockRow();
    const senseiRows = await query(
      'SELECT scout_env_confirmed_cycle FROM sensei WHERE user_id = ?',
      [userId]
    );
    const confirmed =
      senseiRows[0]?.scout_env_confirmed_cycle &&
      clockRow?.cycle_start_at &&
      new Date(senseiRows[0].scout_env_confirmed_cycle).getTime() ===
        new Date(clockRow.cycle_start_at).getTime();
    const envLine = getScoutEnvironmentLine(match.environment_slug, { confirmed });
    if (envLine) lines.push(envLine);
  }

  return {
    opponentName,
    opponentIsBot,
    lines,
    profiles,
    tendencies: {
      ...strategies,
      speed,
      speedBand: speedBand(speed, lang),
      dominantElement: element || null,
      offensive: strategies.Offensive,
    },
  };
}

async function loadOpponentNinjas(opponentId) {
  return query(
    `SELECT n.battle_strategy, n.element_affinity, n.taijutsu, n.ninjutsu, n.genjutsu,
            n.medecine, n.vitesse, n.intelligence, n.grade,
            c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ? AND n.squad_position IS NOT NULL
     ORDER BY n.squad_position`,
    [opponentId]
  );
}

export async function buildAndPersistRosterIntel(userId, seasonCycle, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const pool = await findUserPool(userId);
  if (!pool) return null;

  const match = await getUserMatchForCycle(userId, seasonCycle);
  if (!match) return null;

  const clockRow = await getClockRow();
  const cycleStartAt = clockRow?.cycle_start_at;
  if (!cycleStartAt) return null;

  const opponentId =
    match.home_user_id === userId ? match.away_user_id : match.home_user_id;
  const opponentName =
    match.home_user_id === userId ? match.away_sensei : match.home_sensei;
  const opponentIsBot = Boolean(
    match.home_user_id === userId ? match.away_is_bot : match.home_is_bot
  );

  const reconMission = await getUserReconMissionForCycle(userId, cycleStartAt);
  const reconMeta = reconMission ? resolveScoutTier(reconMission, userId) : null;

  const ninjas = await loadOpponentNinjas(opponentId);
  const fullRoster = await buildRosterReportFromNinjas(
    userId,
    opponentId,
    opponentName,
    opponentIsBot,
    match,
    ninjas,
    lang
  );

  const rosterReport =
    reconMeta?.tier === 'full'
      ? { ...fullRoster, ...reconMeta }
      : reconMeta
        ? { ...buildPartialRosterReport(fullRoster, lang), ...reconMeta }
        : null;

  if (rosterReport) {
    await upsertIntelRow({
      cycleStartAt,
      poolId: pool.id,
      viewerUserId: userId,
      opponentUserId: opponentId,
      seasonCycle,
      rosterReport,
      reconMeta,
      rosterFrozenAt: new Date(),
    });
  }

  return rosterReport;
}

export async function generateRosterIntelForAllUsers() {
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
    const report = await buildAndPersistRosterIntel(user.id, pool.current_cycle, 'fr');
    if (report) results.push({ userId: user.id, report });
  }
  return results;
}

function compareRosterToHistory(rosterReport, historicalTendencies, lang) {
  if (!rosterReport?.tendencies || !historicalTendencies?.summary) return null;
  const current = rosterReport.tendencies;
  const hist = historicalTendencies.summary;
  const flags = [];

  if (hist.avgOffensive >= 1.2 && current.offensive === 0) {
    flags.push(
      lang === 'en'
        ? 'Current lineup looks less offensive than recent habits.'
        : 'La composition actuelle paraît moins offensive que les habitudes récentes.'
    );
  }
  if (hist.avgOffensive < 0.8 && current.offensive >= 2) {
    flags.push(
      lang === 'en'
        ? 'Sudden offensive spread — atypical vs recent league matches.'
        : 'Disposition offensive soudaine — atypique par rapport aux derniers matchs de ligue.'
    );
  }
  if (hist.dominantElement && current.dominantElement && hist.dominantElement !== current.dominantElement) {
    flags.push(
      lang === 'en'
        ? `Element shift: usually ${hist.dominantElement}, now ${current.dominantElement}.`
        : `Changement d'élément : habituellement ${hist.dominantElement}, désormais ${current.dominantElement}.`
    );
  }

  return flags.length ? flags : null;
}

export async function generateScoutReport(userId, seasonCycle, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const match = await getUserMatchForCycle(userId, seasonCycle);
  if (!match) return null;

  const opponentName =
    match.home_user_id === userId ? match.away_sensei : match.home_sensei;
  const opponentIsBot = Boolean(
    match.home_user_id === userId ? match.away_is_bot : match.home_is_bot
  );

  const clock = await getGameClock();
  const clockRow = await getClockRow();
  const hour = clock.hour ?? 0;

  if (hour < 36) {
    return {
      phase: 'locked',
      hour,
      opponentName,
      opponentIsBot,
      lockReason: 'before_h36',
    };
  }

  const reconMission = await getUserReconMissionForCycle(userId, clockRow?.cycle_start_at);
  if (!reconMission) {
    return {
      phase: 'none',
      hour,
      tier: 'none',
      lockReason: 'no_recon',
      opponentName,
      opponentIsBot,
      historicalTendencies: null,
      rosterReport: null,
      anomalyFlags: null,
      lines: [],
      profiles: [],
    };
  }

  await ensureIntelForHour(userId, seasonCycle, hour, lang);
  const intel = await getIntelForUser(userId, seasonCycle, lang);

  const historicalTendencies = intel?.tendencies ?? null;

  const tendenciesPayload = historicalTendencies
    ? {
        lines: historicalTendencies.lines ?? [],
        sampleSize: intel?.tendenciesSampleSize ?? historicalTendencies.sampleSize ?? 0,
        reliability: intel?.tendenciesReliability ?? historicalTendencies.reliability ?? 'none',
        summary: historicalTendencies.summary ?? null,
      }
    : null;

  if (hour < 54) {
    return {
      phase: 'tendencies',
      hour,
      tier: 'none',
      lockReason: null,
      opponentName,
      opponentIsBot,
      reconOutcome: resolveScoutTier(reconMission, userId).reconOutcome,
      historicalTendencies: tendenciesPayload,
      rosterReport: null,
      rosterPending: true,
      anomalyFlags: null,
      lines: tendenciesPayload?.lines ?? [],
      profiles: [],
    };
  }

  let rosterReport = intel?.rosterReport ?? null;

  if (!rosterReport) {
    rosterReport = await buildAndPersistRosterIntel(userId, seasonCycle, lang);
  }

  const anomalyFlags = compareRosterToHistory(rosterReport, historicalTendencies, lang);

  return {
    phase: 'roster',
    hour,
    opponentName,
    opponentIsBot,
    historicalTendencies: tendenciesPayload,
    rosterReport,
    anomalyFlags,
    tier: rosterReport?.tier ?? 'partial',
    reconOutcome: rosterReport?.reconOutcome ?? null,
    reconScorePct: rosterReport?.reconScorePct ?? null,
    fullReportChance: rosterReport?.fullReportChance ?? null,
    fullReportRoll: rosterReport?.fullReportRoll ?? null,
    lines: [
      ...(tendenciesPayload?.lines ?? []),
      ...(rosterReport?.lines ?? []),
    ],
    profiles: rosterReport?.profiles ?? [],
    tendencies: rosterReport?.tendencies ?? null,
    rosterFrozen: Boolean(intel?.rosterFrozenAt),
  };
}

export async function generateScoutReportsForAllUsers() {
  const tendencies = await import('./scoutIntelService.js').then((m) =>
    m.generateTendenciesIntelForAllUsers()
  );
  return { tendencies };
}
