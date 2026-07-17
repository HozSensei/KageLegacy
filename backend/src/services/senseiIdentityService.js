import { query } from '../config/database.js';
import { getUnlockedRewardSlugs } from './eliteSeasonPassService.js';
import { isEliteFeatureEnabled } from './eliteSubscriptionService.js';

export const ELITE_NAME_COLORS = ['#e8ece9', '#c9a66b', '#8fad9a', '#6d9eb8', '#c97d5d'];

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

function resolveTitleLabel(row, locale) {
  if (!row?.title_slug) return null;
  return normalizeLocale(locale) === 'en' ? row.title_label_en : row.title_label_fr;
}

function isEliteForPool(activeSub, pool) {
  if (!activeSub || !pool) return false;
  return Number(activeSub.season_number) === Number(pool.season_number);
}

async function loadPoolsForUsers(userIds, poolContext = null) {
  const poolByUser = new Map();
  if (poolContext) {
    for (const userId of userIds) poolByUser.set(userId, poolContext);
    return poolByUser;
  }

  if (!userIds.length) return poolByUser;

  const placeholders = userIds.map(() => '?').join(', ');
  const rows = await query(
    `SELECT pm.user_id, p.id, p.season_number, p.division_level, p.current_cycle, p.status
     FROM pool_members pm
     JOIN pools p ON p.id = pm.pool_id
     WHERE pm.user_id IN (${placeholders})`,
    userIds
  );
  for (const row of rows) {
    poolByUser.set(row.user_id, row);
  }
  return poolByUser;
}

async function loadActiveSubscriptions(userIds) {
  const subByUser = new Map();
  if (!isEliteFeatureEnabled() || !userIds.length) return subByUser;

  const placeholders = userIds.map(() => '?').join(', ');
  const rows = await query(
    `SELECT user_id, season_number, status, pool_id, current_period_end
     FROM sensei_elite_subscriptions
     WHERE user_id IN (${placeholders}) AND status = 'active'`,
    userIds
  );
  for (const row of rows) {
    subByUser.set(row.user_id, row);
  }
  return subByUser;
}

/**
 * @param {number} userId
 * @param {string} [locale]
 * @param {object} [poolContext]
 */
export async function buildSenseiIdentity(userId, locale = 'fr', poolContext = null) {
  const map = await buildSenseiIdentities([userId], locale, poolContext);
  return map.get(userId) ?? null;
}

/**
 * @param {number[]} userIds
 * @param {string} [locale]
 * @param {object} [poolContext] — pool partagée (ex. classement ligue)
 * @returns {Promise<Map<number, object>>}
 */
export async function buildSenseiIdentities(userIds, locale = 'fr', poolContext = null) {
  const result = new Map();
  const uniqueIds = [...new Set(userIds.filter((id) => id != null))];
  if (!uniqueIds.length) return result;

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const [rows, poolByUser, subByUser] = await Promise.all([
    query(
      `SELECT s.user_id, s.name AS sensei_name, u.is_bot, u.is_guest,
              sc.title_slug, sc.banner_slug, sc.name_color,
              tc.label_fr AS title_label_fr, tc.label_en AS title_label_en
       FROM sensei s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN sensei_cosmetics sc ON sc.user_id = s.user_id
       LEFT JOIN elite_title_catalog tc ON tc.slug = sc.title_slug
       WHERE s.user_id IN (${placeholders})`,
      uniqueIds
    ),
    loadPoolsForUsers(uniqueIds, poolContext),
    loadActiveSubscriptions(uniqueIds),
  ]);

  for (const row of rows) {
    const pool = poolByUser.get(row.user_id) ?? null;
    const activeSub = subByUser.get(row.user_id) ?? null;
    const isElite = isEliteForPool(activeSub, pool);
    const titleSlug = isElite ? row.title_slug : null;
    const bannerSlug = isElite ? row.banner_slug || 'none' : 'none';
    const nameColor = isElite ? row.name_color || '#e8ece9' : '#e8ece9';

    result.set(row.user_id, {
      userId: row.user_id,
      senseiName: row.sensei_name,
      isBot: Boolean(row.is_bot),
      isGuest: Boolean(row.is_guest),
      isElite,
      gradeLabel: row.is_bot
        ? 'bot'
        : row.is_guest
          ? 'guest'
          : isElite
            ? 'jonin_elite'
            : 'jonin',
      titleSlug,
      title: isElite ? resolveTitleLabel({ ...row, title_slug: titleSlug }, locale) : null,
      bannerSlug,
      nameColor,
      profileUrl: `/sensei/${row.user_id}`,
    });
  }

  return result;
}

export async function getEquippedCosmetics(userId) {
  const rows = await query('SELECT * FROM sensei_cosmetics WHERE user_id = ? LIMIT 1', [userId]);
  return (
    rows[0] ?? {
      title_slug: null,
      banner_slug: 'none',
      name_color: '#e8ece9',
    }
  );
}

export async function getCosmeticsCatalog(userId, locale = 'fr') {
  const lang = normalizeLocale(locale);
  const poolRows = await query(
    `SELECT p.season_number FROM pool_members pm
     JOIN pools p ON p.id = pm.pool_id WHERE pm.user_id = ? LIMIT 1`,
    [userId]
  );
  const pool = poolRows[0] ?? null;

  const subRows =
    isEliteFeatureEnabled() && pool
      ? await query(
          `SELECT * FROM sensei_elite_subscriptions
         WHERE user_id = ? AND season_number = ? AND status = 'active' LIMIT 1`,
          [userId, pool.season_number]
        )
      : [];
  const isElite = Boolean(subRows[0]);
  const unlocked = await getUnlockedRewardSlugs(userId);

  const senseiRows = await query('SELECT reputation FROM sensei WHERE user_id = ? LIMIT 1', [userId]);
  const reputation = senseiRows[0]?.reputation ?? 0;

  const titles = await query(
    `SELECT slug, label_fr, label_en, unlock_rule, unlock_threshold
     FROM elite_title_catalog WHERE is_active = TRUE ORDER BY sort_order ASC`
  );
  const banners = await query(
    `SELECT slug, label_fr, label_en, unlock_rule
     FROM elite_banner_catalog WHERE is_active = TRUE ORDER BY sort_order ASC`
  );

  const titleUnlocked = (row) => {
    if (!isElite) return false;
    if (unlocked.titles.has(row.slug)) return true;
    if (row.unlock_rule === 'elite_default') return true;
    if (row.unlock_rule === 'reputation' && reputation >= (row.unlock_threshold ?? 0)) return true;
    return false;
  };

  const bannerUnlocked = (row) => {
    if (!isElite) return false;
    if (row.slug === 'none') return true;
    if (unlocked.banners.has(row.slug)) return true;
    return row.unlock_rule === 'elite_default';
  };

  return {
    titles: titles.map((row) => ({
      slug: row.slug,
      label: lang === 'en' ? row.label_en : row.label_fr,
      unlocked: titleUnlocked(row),
      unlockRule: row.unlock_rule,
    })),
    banners: banners.map((row) => ({
      slug: row.slug,
      label: lang === 'en' ? row.label_en : row.label_fr,
      unlocked: bannerUnlocked(row),
      unlockRule: row.unlock_rule,
    })),
    nameColors: ELITE_NAME_COLORS.map((hex) => ({ hex, unlocked: isElite })),
  };
}

export async function updateEquippedCosmetics(userId, { titleSlug, bannerSlug, nameColor }) {
  const poolRows = await query(
    `SELECT p.id, p.season_number FROM pool_members pm
     JOIN pools p ON p.id = pm.pool_id WHERE pm.user_id = ? LIMIT 1`,
    [userId]
  );
  const pool = poolRows[0];
  if (!pool) {
    const error = new Error('Aucune ligue active.');
    error.statusCode = 404;
    throw error;
  }

  if (!isEliteFeatureEnabled()) {
    const error = new Error('Pack Élite temporairement indisponible.');
    error.statusCode = 503;
    throw error;
  }

  const subRows = await query(
    `SELECT id FROM sensei_elite_subscriptions
     WHERE user_id = ? AND season_number = ? AND status = 'active' LIMIT 1`,
    [userId, pool.season_number]
  );
  if (!subRows[0]) {
    const error = new Error('Pack Élite requis pour personnaliser votre identité.');
    error.statusCode = 403;
    throw error;
  }

  const catalog = await getCosmeticsCatalog(userId);
  if (titleSlug) {
    const title = catalog.titles.find((t) => t.slug === titleSlug);
    if (!title?.unlocked) {
      const error = new Error('Titre non débloqué.');
      error.statusCode = 400;
      throw error;
    }
  }
  if (bannerSlug && bannerSlug !== 'none') {
    const banner = catalog.banners.find((b) => b.slug === bannerSlug);
    if (!banner?.unlocked) {
      const error = new Error('Bannière non débloquée.');
      error.statusCode = 400;
      throw error;
    }
  }
  if (nameColor && !ELITE_NAME_COLORS.includes(nameColor)) {
    const error = new Error('Couleur non autorisée.');
    error.statusCode = 400;
    throw error;
  }

  await query(
    `INSERT INTO sensei_cosmetics (user_id, title_slug, banner_slug, name_color)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title_slug = VALUES(title_slug),
       banner_slug = VALUES(banner_slug),
       name_color = VALUES(name_color)`,
    [userId, titleSlug ?? null, bannerSlug ?? 'none', nameColor ?? '#e8ece9']
  );

  return getEquippedCosmetics(userId);
}
