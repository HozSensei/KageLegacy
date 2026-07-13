import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getUserMatchForCycle } from './matchService.js';
import { getScoutEnvironmentLine } from './matchEnvironment.js';
import { getClockRow, getGameClock, isTacticsLocked } from './gameClock.js';
import { generateScoutReport } from './scouting.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { dominantElement } from './scoutSquadAnalysis.js';
import { getOperationDeck } from './operationDeckService.js';
import { DOMAIN_LABELS } from './combat/pli/constants.js';

async function loadOwnActiveSquad(userId) {
  return query(
    `SELECT n.*, c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ? AND n.squad_position IS NOT NULL
     ORDER BY n.squad_position`,
    [userId]
  );
}

function buildDeckSummary(ninjas, deck, lang) {
  const speed = ninjas.reduce((s, n) => s + Number(n.vitesse) + Number(n.intelligence), 0);
  const element = dominantElement(ninjas);
  const members = ninjas.map((n) => {
    const profile = describeNinjaProfile(n, lang);
    const techniques = deck.techniquesByNinjaId?.[n.id] || {};
    const primary = techniques.primary || 'taijutsu';
    const secondary = techniques.secondary || 'ninjutsu';
    return {
      ninjaId: n.id,
      name: n.name,
      element: n.element_affinity,
      artLabel: profile.artLabel,
      potentialLabel: profile.potentialLabel,
      primaryDomain: primary,
      secondaryDomain: secondary,
      primaryLabel: DOMAIN_LABELS[primary] || primary,
      secondaryLabel: DOMAIN_LABELS[secondary] || secondary,
    };
  });

  const elementCount = deck.elementCardIds?.length ?? 0;
  const pliCount = ninjas.length * 3 + elementCount;

  return {
    teamSpeed: speed,
    dominantElement: element,
    elementCount,
    pliCount,
    members,
    techniquesConfigured: members.every((m) => m.primaryDomain && m.secondaryDomain),
  };
}

function buildAdvice({ ownDeck, scout, environmentSlug, lang }) {
  const tips = [];
  const tendencies = scout?.rosterReport?.tendencies ?? scout?.tendencies;

  if (scout?.anomalyFlags?.length) {
    tips.push(scout.anomalyFlags[0]);
  }

  if (ownDeck.elementCount < 5) {
    tips.push(
      lang === 'en'
        ? 'Pick 5 squad deck elements before H71 — each adds a tactical pli to your shuffle.'
        : 'Choisissez 5 éléments de deck avant H71 — chacun ajoute un pli tactique au mélange.'
    );
  }

  if (tendencies?.speedBand === 'fast') {
    tips.push(
      lang === 'en'
        ? 'Fast opponent — favor Tai or Med elements to survive tempo.'
        : 'Adversaire rapide — privilégiez des éléments Tai ou Médecine pour tenir le tempo.'
    );
  }

  if (tendencies?.dominantElement && environmentSlug) {
    tips.push(
      lang === 'en'
        ? `Enemy leans ${tendencies.dominantElement} — check cycle gear and your deck affinities.`
        : `L'adversaire penche ${tendencies.dominantElement} — vérifiez objets cycle et affinités du deck.`
    );
  }

  const deck = scout?.deckReport;
  if (deck?.domainCounts?.medecine >= 2) {
    tips.push(
      lang === 'en'
        ? 'Enemy deck favors Medicine plis — prepare Tai or Gen counters.'
        : 'Le deck adverse privilégie la Médecine — prévoyez des contre-plis Tai ou Gen.'
    );
  }
  if (deck?.elementCards?.length >= 4) {
    tips.push(
      lang === 'en'
        ? 'Full element deck spotted — expect tactical pli surprises.'
        : 'Deck éléments quasi complet repéré — anticipez des plis tactiques surprises.'
    );
  }

  const profiles = scout?.rosterReport?.profiles ?? scout?.profiles ?? [];
  if (
    profiles.some(
      (p) =>
        p.potentialHint === 'very_high' ||
        p.potentialHint === 'high' ||
        p.potentialHint === 'très élevé' ||
        p.potentialHint === 'élevé'
    )
  ) {
    tips.push(
      lang === 'en'
        ? 'Scout reports high potential profiles — Med plis help in long exchanges.'
        : 'L\'espionnage signale des profils à fort potentiel — les plis Médecine aident dans les échanges longs.'
    );
  }

  if (!tips.length) {
    tips.push(
      lang === 'en'
        ? 'Deck looks coherent — lock composition and deck before H71.'
        : 'Deck cohérent — verrouillez composition et deck avant H71.'
    );
  }

  return tips.slice(0, 4);
}

export async function getOperationBriefing(userId, locale = 'fr') {
  const lang = locale === 'en' ? 'en' : 'fr';
  const pool = await findUserPool(userId);
  if (!pool) return null;

  const match = await getUserMatchForCycle(userId, pool.current_cycle);
  const scoutReport = await generateScoutReport(userId, pool.current_cycle, lang);
  const ownNinjas = await loadOwnActiveSquad(userId);
  const deck = await getOperationDeck(userId, pool.current_cycle);
  const ownDeck = buildDeckSummary(ownNinjas, deck, lang);

  const clockRow = await getClockRow();
  const clock = await getGameClock();
  const tacticsLocked = clock.tacticsLocked;
  const compositionLocked = clock.compositionLocked;

  let environment = null;
  if (match?.environment_slug) {
    const senseiRows = await query(
      'SELECT scout_env_confirmed_cycle FROM sensei WHERE user_id = ?',
      [userId]
    );
    const confirmed =
      senseiRows[0]?.scout_env_confirmed_cycle &&
      clockRow?.cycle_start_at &&
      new Date(senseiRows[0].scout_env_confirmed_cycle).getTime() ===
        new Date(clockRow.cycle_start_at).getTime();
    environment = {
      slug: match.environment_slug,
      confirmed,
      line: getScoutEnvironmentLine(match.environment_slug, { confirmed }),
    };
  }

  const opponentName = match
    ? match.home_user_id === userId
      ? match.away_sensei
      : match.home_sensei
    : null;

  return {
    poolId: pool.id,
    seasonCycle: pool.current_cycle,
    hour: clock.hour ?? 0,
    tacticsLocked,
    compositionLocked,
    scoutAvailable: (clock.hour ?? 0) >= 36,
    nextMatch: match
      ? {
          id: match.id,
          cycle: match.season_cycle,
          status: match.status,
          opponentName,
          opponentIsBot: Boolean(
            match.home_user_id === userId ? match.away_is_bot : match.home_is_bot
          ),
          isHome: match.home_user_id === userId,
        }
      : null,
    environment,
    scout: scoutReport,
    ownDeck,
    opponentDeck: scoutReport?.deckReport ?? null,
    deck,
    advice: buildAdvice({
      ownDeck,
      scout: scoutReport,
      environmentSlug: environment?.slug,
      lang,
    }),
  };
}

export async function getOperationBriefingForUser(userId) {
  const locale = await getUserLanguage(userId);
  return getOperationBriefing(userId, locale);
}
