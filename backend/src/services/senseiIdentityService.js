import { query } from '../config/database.js';
import { isEliteFeatureEnabled } from './eliteSubscriptionService.js';

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
      `SELECT s.user_id, s.name AS sensei_name, s.village_id, s.village_title, u.is_bot, u.is_guest,
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
      villageId: row.village_id || 'leaf',
      villageTitle: row.village_title || null,
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
