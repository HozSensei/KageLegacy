import { query } from '../config/database.js';
import { getUserMatchForCycle } from './matchService.js';
import { getScoutEnvironmentLine } from './matchEnvironment.js';
import { getClockRow } from './gameClock.js';
import { describeNinjaProfile } from './ninjaProfile.js';

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
  const ninjutsuHeavy = strategies.Offensive >= 2;
  if (ninjutsuHeavy) {
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

export async function generateScoutReport(userId, seasonCycle, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const match = await getUserMatchForCycle(userId, seasonCycle);
  if (!match) return null;

  const opponentId =
    match.home_user_id === userId ? match.away_user_id : match.home_user_id;
  const opponentName =
    match.home_user_id === userId ? match.away_sensei : match.home_sensei;

  const ninjas = await query(
    `SELECT n.battle_strategy, n.element_affinity, n.taijutsu, n.ninjutsu, n.genjutsu,
            n.medecine, n.vitesse, n.intelligence, n.grade,
            c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ? AND n.squad_position IS NOT NULL
     ORDER BY n.squad_position`,
    [opponentId]
  );

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
    opponentIsBot: Boolean(match.home_user_id === userId ? match.away_is_bot : match.home_is_bot),
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

export async function generateScoutReportsForAllUsers() {
  const users = await query(
    `SELECT u.id FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = FALSE AND p.status = 'active'`
  );
  const reports = [];
  for (const user of users) {
    const pool = await query(
      `SELECT p.current_cycle FROM pools p
       JOIN pool_members pm ON pm.pool_id = p.id WHERE pm.user_id = ?`,
      [user.id]
    );
    const cycle = pool[0]?.current_cycle ?? 1;
    const report = await generateScoutReport(user.id, cycle);
    if (report) reports.push({ userId: user.id, report });
  }
  return reports;
}
