/**
 * Template de saison Battle Pass — rewards + quêtes générés sans seed artisanal.
 */
import { BATTLE_PASS, BATTLE_PASS_QUEST_XP } from '../config/economyConfig.js';
import { seasonFreeNicknameId, seasonNicknameId } from './characterAppearance.js';

export const SEASON_THEMES = Object.freeze([
  Object.freeze({
    theme: 'shadow_clan',
    nameFr: "L'Éveil des Ombres",
    nameEn: 'Awakening of Shadows',
  }),
  Object.freeze({
    theme: 'iron_leaf',
    nameFr: 'Feuille de Fer',
    nameEn: 'Iron Leaf',
  }),
  Object.freeze({
    theme: 'mist_veil',
    nameFr: 'Voile de Brume',
    nameEn: 'Mist Veil',
  }),
  Object.freeze({
    theme: 'storm_scroll',
    nameFr: 'Parchemin de l’Orage',
    nameEn: 'Storm Scroll',
  }),
]);

function tier(level, rewards) {
  return [level, rewards];
}

function softFreeReward(level, seasonFreeNicknameIdValue) {
  if (level === 4) {
    return [
      { type: 'ryos', amount: 200 + level * 8 },
      { type: 'nickname', nicknameId: seasonFreeNicknameIdValue, source: 'battle_pass' },
    ];
  }
  if (level === 10) {
    return [
      { type: 'card', rarity: 'legendary', count: 1 },
      { type: 'frame', frameId: 'frame_leaf', source: 'battle_pass' },
    ];
  }
  if (level % 10 === 0) {
    if (level === 40) return [{ type: 'card', rarity: 'legendary', count: 1 }];
    if (level === 20 || level === 30) return [{ type: 'card', rarity: 'rare', count: 1 }];
    return [{ type: 'card', rarity: 'legendary', count: 1 }];
  }
  if (level % 5 === 0) {
    if (level === 5 || level === 45) return [{ type: 'booster', boosterType: 'standard' }];
    return [{ type: 'ryos', amount: 400 + level * 10 }];
  }
  if (level % 3 === 0) return [{ type: 'dust', amount: 20 + level }];
  if (level % 4 === 0) return [{ type: 'essence', amount: Math.max(1, Math.floor(level / 10)) }];
  return [{ type: 'ryos', amount: 200 + level * 8 }];
}

function softPremiumReward(level, seasonNicknameIdValue) {
  if (level === 1) {
    return [
      { type: 'card', rarity: 'rare', count: 2 },
      { type: 'nickname', nicknameId: seasonNicknameIdValue, source: 'battle_pass' },
    ];
  }
  if (level === 15) {
    return [
      { type: 'dust', amount: 70 + level },
      { type: 'frame', frameId: 'frame_volt', source: 'battle_pass' },
    ];
  }
  if (level === 50) {
    return [
      { type: 'card', rarity: 'mythic', count: 1 },
      { type: 'nickname', nicknameId: seasonNicknameIdValue, source: 'battle_pass' },
    ];
  }
  if (level % 10 === 0) {
    if (level === 10) {
      return [
        { type: 'card', rarity: 'legendary', count: 2 },
        { type: 'kage_coins', amount: 100 },
      ];
    }
    if (level === 20 || level === 45) return [{ type: 'booster', boosterType: 'legendary' }];
    if (level === 30) return [{ type: 'card', rarity: 'legendary', count: 3 }];
    if (level === 40) return [{ type: 'kage_coins', amount: 200 }];
  }
  if (level % 5 === 0) {
    if (level === 5 || level === 35) return [{ type: 'booster', boosterType: 'premium' }];
    return [{ type: 'essence', amount: 5 + Math.floor(level / 10) }];
  }
  if (level % 7 === 0) return [{ type: 'kage_coins', amount: 25 }];
  if (level % 3 === 0) return [{ type: 'dust', amount: 70 + level }];
  return [{ type: 'ryos', amount: 500 + level * 12 }];
}

/**
 * @param {{ seasonNumber: number, theme?: string }} opts
 */
export function buildSeasonRewards({ seasonNumber, theme: _theme } = {}) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  const nickId = seasonNicknameId(n);
  const freeNickId = seasonFreeNicknameId(n);
  const max = BATTLE_PASS.maxLevel;
  const freeTrack = {};
  const premiumTrack = {};

  for (let level = 1; level <= max; level += 1) {
    freeTrack[String(level)] =
      level === 50
        ? [{ type: 'card', rarity: 'legendary', count: 1 }, { type: 'ryos', amount: 1500 }]
        : softFreeReward(level, freeNickId);
    premiumTrack[String(level)] = softPremiumReward(level, nickId);
  }

  return { free: freeTrack, premium: premiumTrack };
}

export function pickSeasonTheme(seasonNumber) {
  const idx = (Math.max(1, Number(seasonNumber) || 1) - 1) % SEASON_THEMES.length;
  return SEASON_THEMES[idx];
}

export function buildSeasonMeta(seasonNumber) {
  const n = Math.max(1, Number(seasonNumber) || 1);
  const theme = pickSeasonTheme(n);
  return {
    seasonNumber: n,
    name: `Saison ${n} : ${theme.nameFr}`,
    nameEn: `Season ${n}: ${theme.nameEn}`,
    theme: theme.theme,
    maxLevel: BATTLE_PASS.maxLevel,
    baseXpPerLevel: BATTLE_PASS.baseXpPerLevel,
    nicknameId: seasonNicknameId(n),
  };
}

/**
 * Pool de quêtes réutilisable (daily / weekly / milestone).
 * @param {Date|string|number} seasonStart
 * @param {Date|string|number} seasonEnd
 */
export function buildSeasonQuestDefs(seasonStart, seasonEnd) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + dayMs - 1);

  const weekStart = new Date(dayStart);
  const dow = weekStart.getUTCDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  weekStart.setUTCDate(weekStart.getUTCDate() + toMonday);
  const weekEnd = new Date(weekStart.getTime() + 7 * dayMs - 1);

  const dailyXp = BATTLE_PASS_QUEST_XP.daily;
  const weeklyXp = BATTLE_PASS_QUEST_XP.weekly;
  const milestoneXp = BATTLE_PASS_QUEST_XP.milestone;

  const dailies = [
    {
      quest_type: 'daily',
      quest_key: 'win_3_combats',
      description_fr: 'Remporter 3 duels sous le voile',
      description_en: 'Win 3 combats under the veil',
      goal_value: 3,
      xp_reward: dailyXp,
    },
    {
      quest_type: 'daily',
      quest_key: 'play_20_cards',
      description_fr: 'Jouer 20 cartes en mission',
      description_en: 'Play 20 cards on mission',
      goal_value: 20,
      xp_reward: dailyXp,
    },
    {
      quest_type: 'daily',
      quest_key: 'deal_500_damage',
      description_fr: 'Infliger 500 dégâts au total',
      description_en: 'Deal 500 total damage',
      goal_value: 500,
      xp_reward: dailyXp,
    },
    {
      quest_type: 'daily',
      quest_key: 'open_1_booster',
      description_fr: 'Ouvrir 1 booster du clan',
      description_en: 'Open 1 clan booster',
      goal_value: 1,
      xp_reward: dailyXp,
    },
    {
      quest_type: 'daily',
      quest_key: 'upgrade_1_card',
      description_fr: 'Améliorer 1 carte de votre collection',
      description_en: 'Upgrade 1 card in your collection',
      goal_value: 1,
      xp_reward: dailyXp,
    },
    {
      quest_type: 'daily',
      quest_key: 'complete_1_run',
      description_fr: 'Achever 1 parcours de mission',
      description_en: 'Complete 1 mission run',
      goal_value: 1,
      xp_reward: dailyXp,
    },
  ].map(q => ({
    ...q,
    available_from: dayStart,
    available_until: dayEnd,
    bonus_reward_json: null,
  }));

  const weeklies = [
    {
      quest_type: 'weekly',
      quest_key: 'win_15_combats',
      description_fr: 'Remporter 15 combats cette semaine',
      description_en: 'Win 15 combats this week',
      goal_value: 15,
      xp_reward: weeklyXp,
    },
    {
      quest_type: 'weekly',
      quest_key: 'complete_5_missions_b',
      description_fr: 'Terminer 5 missions de rang B ou plus',
      description_en: 'Finish 5 rank B+ missions',
      goal_value: 5,
      xp_reward: weeklyXp,
    },
    {
      quest_type: 'weekly',
      quest_key: 'collect_10_cards',
      description_fr: 'Découvrir 10 nouvelles cartes',
      description_en: 'Discover 10 new cards',
      goal_value: 10,
      xp_reward: weeklyXp,
      bonus_reward_json: JSON.stringify({ type: 'dust', amount: 50 }),
    },
    {
      quest_type: 'weekly',
      quest_key: 'open_5_boosters',
      description_fr: 'Ouvrir 5 boosters',
      description_en: 'Open 5 boosters',
      goal_value: 5,
      xp_reward: weeklyXp,
    },
    {
      quest_type: 'weekly',
      quest_key: 'complete_3_runs',
      description_fr: 'Achever 3 parcours de mission',
      description_en: 'Complete 3 mission runs',
      goal_value: 3,
      xp_reward: weeklyXp,
    },
    {
      quest_type: 'weekly',
      quest_key: 'upgrade_5_cards',
      description_fr: 'Améliorer 5 cartes',
      description_en: 'Upgrade 5 cards',
      goal_value: 5,
      xp_reward: weeklyXp,
      bonus_reward_json: JSON.stringify({ type: 'essence', amount: 2 }),
    },
  ].map(q => ({
    ...q,
    available_from: weekStart,
    available_until: weekEnd,
    bonus_reward_json: q.bonus_reward_json || null,
  }));

  const milestones = [
    {
      quest_type: 'milestone',
      quest_key: 'season_win_100_combats',
      description_fr: 'Remporter 100 combats cette saison',
      description_en: 'Win 100 combats this season',
      goal_value: 100,
      xp_reward: milestoneXp,
      bonus_reward_json: JSON.stringify({ type: 'ryos', amount: 1000 }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
    {
      quest_type: 'milestone',
      quest_key: 'season_complete_50_missions',
      description_fr: 'Achever 50 parcours de mission cette saison',
      description_en: 'Complete 50 mission runs this season',
      goal_value: 50,
      xp_reward: milestoneXp,
      bonus_reward_json: JSON.stringify({ type: 'booster', boosterType: 'legendary' }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
    {
      quest_type: 'milestone',
      quest_key: 'season_upgrade_20_cards',
      description_fr: 'Améliorer 20 cartes cette saison',
      description_en: 'Upgrade 20 cards this season',
      goal_value: 20,
      xp_reward: milestoneXp,
      bonus_reward_json: JSON.stringify({ type: 'essence', amount: 10 }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
    {
      quest_type: 'milestone',
      quest_key: 'season_open_25_boosters',
      description_fr: 'Ouvrir 25 boosters cette saison',
      description_en: 'Open 25 boosters this season',
      goal_value: 25,
      xp_reward: milestoneXp,
      bonus_reward_json: JSON.stringify({ type: 'dust', amount: 100 }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
    {
      quest_type: 'milestone',
      quest_key: 'season_collect_50_cards',
      description_fr: 'Découvrir 50 nouvelles cartes cette saison',
      description_en: 'Discover 50 new cards this season',
      goal_value: 50,
      xp_reward: milestoneXp,
      bonus_reward_json: JSON.stringify({ type: 'card', rarity: 'rare', count: 1 }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
  ];

  return [...dailies, ...weeklies, ...milestones];
}

/** Compat seed historique Saison 1. */
export function buildSeason1Rewards() {
  return buildSeasonRewards({ seasonNumber: 1 });
}

export function buildSeason1QuestDefs(seasonStart, seasonEnd) {
  return buildSeasonQuestDefs(seasonStart, seasonEnd);
}

export { tier };
