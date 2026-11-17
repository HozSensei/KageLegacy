import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getUserMatchForCycle } from './matchService.js';
import { getScoutEnvironmentLine } from './matchEnvironment.js';
import { getClockRow, getGameClock } from './gameClock.js';
import { generateScoutReport } from './scouting.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { dominantElement } from './scoutSquadAnalysis.js';
import { getOperationDeck } from './operationDeckService.js';
import { MAX_PLIS, TECHNIQUE_CARDS_PER_NINJA } from './combat/pli/constants.js';
import { buildDeckMatchupPreview } from './deckMatchupPreview.js';

async function loadOwnActiveSquad(userId) {
  return query(
    `SELECT n.*, c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     LEFT JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ? AND n.squad_position IS NOT NULL
     ORDER BY n.squad_position`,
    [userId],
  );
}

function buildDeckSummary(ninjas, deck, lang) {
  const speed = ninjas.reduce((s, n) => s + Number(n.vitesse) + Number(n.intelligence), 0);
  const element = dominantElement(ninjas);
  const cardsById = Object.fromEntries(
    (deck.techniqueCards || []).map((c) => [c.userTacticCardId, c]),
  );
  const members = ninjas.map((n) => {
    const profile = describeNinjaProfile(n, lang);
    const assignedIds = deck.techniqueSlotsByNinjaId?.[n.id] || [];
    const techniques = assignedIds
      .map((id) => cardsById[id])
      .filter(Boolean)
      .map((card) => ({
        slug: card.slug,
        name: lang === 'en' ? card.nameEn : card.nameFr,
        statType: card.statType,
        bonusPct: card.pliBonusPct,
      }));
    const domains = deck.techniquesByNinjaId?.[n.id];
    return {
      ninjaId: n.id,
      name: n.name,
      element: n.element_affinity,
      artLabel: profile.artLabel,
      potentialLabel: profile.potentialLabel,
      techniques,
      primaryDomain: domains?.primary,
      secondaryDomain: domains?.secondary,
    };
  });

  const techniqueCount = deck.techniqueCount ?? 0;
  const maxTechniques = ninjas.length * TECHNIQUE_CARDS_PER_NINJA;
  const configuredPlis = deck.configuredPlis ?? techniqueCount;
  const relaisPadding = Math.max(0, MAX_PLIS - configuredPlis);

  return {
    teamSpeed: speed,
    dominantElement: element,
    techniqueCount,
    maxTechniques,
    pliCount: MAX_PLIS,
    configuredPlis,
    relaisPadding,
    members,
    techniquesConfigured: techniqueCount >= maxTechniques,
  };
}

function buildAdvice({ ownDeck, scout, environmentSlug, lang }) {
  const tips = [];
  const tendencies = scout?.rosterReport?.tendencies ?? scout?.tendencies;

  if (scout?.anomalyFlags?.length) {
    tips.push(scout.anomalyFlags[0]);
  }

  if (ownDeck.techniqueCount < ownDeck.maxTechniques) {
    tips.push(
      lang === 'en'
        ? 'Assign 1 inventory technique card per active ninja before H71 — empty slots become relay plis.'
        : 'Assignez 1 carte technique inventaire par ninja actif avant H71 — les emplacements vides deviennent des relais.',
    );
  }

  if (tendencies?.speedBand === 'fast') {
    tips.push(
      lang === 'en'
        ? 'Fast opponent — favor Tai or Med elements to survive tempo.'
        : 'Adversaire rapide — privilégiez des éléments Tai ou Médecine pour tenir le tempo.',
    );
  }

  if (tendencies?.dominantElement && environmentSlug) {
    tips.push(
      lang === 'en'
        ? `Enemy leans ${tendencies.dominantElement} — check cycle gear and your deck affinities.`
        : `L'adversaire penche ${tendencies.dominantElement} — vérifiez objets cycle et affinités du deck.`,
    );
  }

  const deck = scout?.deckReport;
  if (deck?.domainCounts?.medecine >= 2) {
    tips.push(
      lang === 'en'
        ? 'Enemy deck favors Medicine plis — prepare Tai or Gen counters.'
        : 'Le deck adverse privilégie la Médecine — prévoyez des contre-plis Tai ou Gen.',
    );
  }
  if (deck?.techniqueCount >= 7) {
    tips.push(
      lang === 'en'
        ? 'Dense technique deck spotted — expect strong pli power swings.'
        : 'Deck technique dense repéré — anticipez des écarts de puissance marqués.',
    );
  }

  const profiles = scout?.rosterReport?.profiles ?? scout?.profiles ?? [];
  if (
    profiles.some(
      (p) =>
        p.potentialHint === 'very_high' ||
        p.potentialHint === 'high' ||
        p.potentialHint === 'très élevé' ||
        p.potentialHint === 'élevé',
    )
  ) {
    tips.push(
      lang === 'en'
        ? 'Scout reports high potential profiles — Med plis help in long exchanges.'
        : 'L\'espionnage signale des profils à fort potentiel — les plis Médecine aident dans les échanges longs.',
    );
  }

  if (!tips.length) {
    tips.push(
      lang === 'en'
        ? 'Deck looks coherent — lock composition and deck before H71.'
        : 'Deck cohérent — verrouillez composition et deck avant H71.',
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
      [userId],
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
            match.home_user_id === userId ? match.away_is_bot : match.home_is_bot,
          ),
          isHome: match.home_user_id === userId,
        }
      : null,
    environment,
    scout: scoutReport,
    ownDeck,
    opponentDeck: scoutReport?.deckReport ?? null,
    matchupPreview: buildDeckMatchupPreview(ownDeck, scoutReport?.deckReport, lang),
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
