import { query } from '../config/database.js';
import { findUserPool } from './poolService.js';
import { getUserMatchForCycle } from './matchService.js';
import { getScoutEnvironmentLine } from './matchEnvironment.js';
import { getClockRow, isTacticsLocked } from './gameClock.js';
import { generateScoutReport } from './scouting.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { describeNinjaProfile } from './ninjaProfile.js';
import { getTacticCardsForNinjas } from './tacticCards/tacticCardService.js';

export const OPERATION_POSTURES = ['balanced', 'offensive', 'tank', 'protect'];

const POSTURE_LABELS = {
  fr: {
    balanced: 'Équilibrée',
    offensive: 'Offensive',
    tank: 'Défensive',
    protect: 'Protection',
  },
  en: {
    balanced: 'Balanced',
    offensive: 'Offensive',
    tank: 'Defensive',
    protect: 'Protection',
  },
};

const ORDER_LABELS = {
  fr: { Offensive: 'Offensive', Tank: 'Défensive', Protect: 'Protection', Normal: 'Normal' },
  en: { Offensive: 'Offensive', Tank: 'Defensive', Protect: 'Protection', Normal: 'Normal' },
};

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

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

function summarizeOrders(ninjas) {
  const counts = { Offensive: 0, Tank: 0, Protect: 0, Normal: 0 };
  for (const n of ninjas) {
    const key = n.battle_strategy || 'Normal';
    if (counts[key] != null) counts[key] += 1;
    else counts.Normal += 1;
  }
  return counts;
}

function buildOwnSquadSummary(ninjas, cardByNinjaId, lang) {
  const orderCounts = summarizeOrders(ninjas);
  const L = ORDER_LABELS[lang] || ORDER_LABELS.fr;
  const speed = ninjas.reduce((s, n) => s + Number(n.vitesse) + Number(n.intelligence), 0);
  const members = ninjas.map((n) => {
    const profile = describeNinjaProfile(n, lang);
    const card = cardByNinjaId.get(n.id);
    return {
      name: n.name,
      battleStrategy: n.battle_strategy || 'Normal',
      element: n.element_affinity,
      artLabel: profile.artLabel,
      potentialLabel: profile.potentialLabel,
      tacticCard: card
        ? {
            slug: card.slug,
            nameFr: card.name_fr,
            nameEn: card.name_en,
            chargesRemaining: card.charges_remaining,
          }
        : null,
    };
  });

  return {
    orderCounts,
    ordersLabel: `${orderCounts.Offensive} ${L.Offensive} · ${orderCounts.Tank} ${L.Tank} · ${orderCounts.Protect} ${L.Protect} · ${orderCounts.Normal} ${L.Normal}`,
    teamSpeed: speed,
    members,
    cardsEquipped: members.filter((m) => m.tacticCard).length,
  };
}

function buildAdvice({ posture, ownSquad, scout, environmentSlug, lang }) {
  const tips = [];
  const tendencies = scout?.tendencies;
  if (!tendencies) return tips;

  if (posture === 'offensive' && tendencies.offensive >= 2) {
    tips.push(
      lang === 'en'
        ? 'Mirror matchup: both sides lean offensive — initiative and burst decide the fight.'
        : 'Miroir offensif : les deux camps pressent — initiative et burst feront la différence.'
    );
  }
  if (posture === 'tank' && tendencies.offensive >= 2) {
    tips.push(
      lang === 'en'
        ? 'Your Defensive posture counters their offensive spread — keep a durable front line.'
        : 'Votre posture Défensive contre leur disposition offensive — tenez une ligne solide.'
    );
  }
  if (posture === 'protect' && tendencies.speedBand === 'fast') {
    tips.push(
      lang === 'en'
        ? 'Fast opponent — Protection orders and healing cards help survive the tempo.'
        : 'Adversaire rapide — consignes Protection et cartes de soin pour tenir le tempo.'
    );
  }
  if (ownSquad.cardsEquipped < ninjasMinCards(ownSquad) && lang === 'fr') {
    tips.push('Équipez des cartes tactiques sur vos ninjas actifs avant H71.');
  } else if (ownSquad.cardsEquipped < ninjasMinCards(ownSquad)) {
    tips.push('Equip tactic cards on active ninjas before H71.');
  }
  if (tendencies.dominantElement && environmentSlug) {
    tips.push(
      lang === 'en'
        ? `Dominant enemy element: ${tendencies.dominantElement} — check cycle gear and card affinities.`
        : `Élément dominant adverse : ${tendencies.dominantElement} — vérifiez objets cycle et affinités cartes.`
    );
  }
  if (scout?.profiles?.some((p) => p.potentialHint === 'very_high' || p.potentialHint === 'high')) {
    tips.push(
      lang === 'en'
        ? 'Scout reports high potential profiles — avoid prolonged trades without healing.'
        : 'L\'espionnage signale des profils à fort potentiel — évitez les échanges longs sans soin.'
    );
  }
  if (!tips.length) {
    tips.push(
      lang === 'en'
        ? 'No glaring mismatch — refine orders and training focus, then lock before H71.'
        : 'Pas de déséquilibre flagrant — affinez consignes et entraînement, puis verrouillez avant H71.'
    );
  }
  return tips.slice(0, 4);
}

function ninjasMinCards(ownSquad) {
  return Math.min(3, ownSquad.members?.length ?? 0);
}

async function getSavedPosture(userId, poolId, seasonCycle) {
  const rows = await query(
    `SELECT operation_posture FROM operation_dossiers
     WHERE user_id = ? AND pool_id = ? AND season_cycle = ?`,
    [userId, poolId, seasonCycle]
  );
  const posture = rows[0]?.operation_posture;
  return OPERATION_POSTURES.includes(posture) ? posture : 'balanced';
}

export async function setOperationPosture(userId, operationPosture) {
  if (await isTacticsLocked()) {
    const error = new Error('Le dossier est verrouillé (H71+).');
    error.statusCode = 423;
    throw error;
  }
  if (!OPERATION_POSTURES.includes(operationPosture)) {
    const error = new Error('Posture invalide.');
    error.statusCode = 400;
    throw error;
  }

  const pool = await findUserPool(userId);
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 404;
    throw error;
  }

  await query(
    `INSERT INTO operation_dossiers (user_id, pool_id, season_cycle, operation_posture)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE operation_posture = VALUES(operation_posture)`,
    [userId, pool.id, pool.current_cycle, operationPosture]
  );

  return { operationPosture, seasonCycle: pool.current_cycle };
}

export async function getOperationDossier(userId, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const pool = await findUserPool(userId);
  if (!pool) return null;

  const match = await getUserMatchForCycle(userId, pool.current_cycle);
  const scoutReport = await generateScoutReport(userId, pool.current_cycle, lang);
  const ownNinjas = await loadOwnActiveSquad(userId);
  const cardRows = await getTacticCardsForNinjas(userId);
  const cardByNinjaId = new Map(cardRows.map((r) => [r.ninja_id, r]));

  const operationPosture = await getSavedPosture(userId, pool.id, pool.current_cycle);
  const ownSquad = buildOwnSquadSummary(ownNinjas, cardByNinjaId, lang);
  const clockRow = await getClockRow();
  const tacticsLocked = await isTacticsLocked();

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
    hour: clockRow?.hour ?? 0,
    tacticsLocked,
    scoutAvailable: (clockRow?.hour ?? 0) >= 36,
    operationPosture,
    postureLabel: POSTURE_LABELS[lang][operationPosture],
    postureOptions: OPERATION_POSTURES.map((value) => ({
      value,
      label: POSTURE_LABELS[lang][value],
    })),
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
    ownSquad,
    advice: buildAdvice({
      posture: operationPosture,
      ownSquad,
      scout: scoutReport,
      environmentSlug: environment?.slug,
      lang,
    }),
  };
}

export async function getOperationDossierForUser(userId) {
  const locale = await getUserLanguage(userId);
  return getOperationDossier(userId, locale);
}
