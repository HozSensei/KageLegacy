/**
 * Saison 1 — L'Éveil des Ombres
 * Noms originaux, ~50 tiers free + premium (subset dense MVP).
 */

function tier(level, rewards) {
  return [level, rewards];
}

/** Construit { free: { "1": [...] }, premium: { ... } } */
export function buildSeason1Rewards() {
  const freeEntries = [
    tier(1, [{ type: 'card', rarity: 'rare', count: 1 }]),
    tier(2, [{ type: 'ryos', amount: 500 }]),
    tier(3, [{ type: 'dust', amount: 50 }]),
    tier(4, [{ type: 'ryos', amount: 250 }]),
    tier(5, [{ type: 'booster', boosterType: 'standard' }]),
    tier(6, [{ type: 'dust', amount: 25 }]),
    tier(7, [{ type: 'ryos', amount: 300 }]),
    tier(8, [{ type: 'essence', amount: 2 }]),
    tier(9, [{ type: 'dust', amount: 30 }]),
    tier(10, [{ type: 'card', rarity: 'legendary', count: 1 }]),
    tier(11, [{ type: 'ryos', amount: 400 }]),
    tier(12, [{ type: 'dust', amount: 40 }]),
    tier(13, [{ type: 'ryos', amount: 400 }]),
    tier(14, [{ type: 'dust', amount: 40 }]),
    tier(15, [{ type: 'ryos', amount: 1000 }]),
    tier(16, [{ type: 'essence', amount: 3 }]),
    tier(17, [{ type: 'ryos', amount: 350 }]),
    tier(18, [{ type: 'dust', amount: 50 }]),
    tier(19, [{ type: 'ryos', amount: 350 }]),
    tier(20, [{ type: 'card', rarity: 'rare', count: 1 }]),
    tier(21, [{ type: 'dust', amount: 50 }]),
    tier(22, [{ type: 'ryos', amount: 450 }]),
    tier(23, [{ type: 'essence', amount: 3 }]),
    tier(24, [{ type: 'dust', amount: 60 }]),
    tier(25, [{ type: 'essence', amount: 5 }]),
    tier(26, [{ type: 'ryos', amount: 500 }]),
    tier(27, [{ type: 'dust', amount: 60 }]),
    tier(28, [{ type: 'ryos', amount: 500 }]),
    tier(29, [{ type: 'dust', amount: 70 }]),
    tier(30, [{ type: 'booster', boosterType: 'premium' }]),
    tier(31, [{ type: 'ryos', amount: 600 }]),
    tier(32, [{ type: 'dust', amount: 70 }]),
    tier(33, [{ type: 'essence', amount: 4 }]),
    tier(34, [{ type: 'ryos', amount: 600 }]),
    tier(35, [{ type: 'card', rarity: 'rare', count: 1 }]),
    tier(36, [{ type: 'dust', amount: 80 }]),
    tier(37, [{ type: 'ryos', amount: 700 }]),
    tier(38, [{ type: 'essence', amount: 5 }]),
    tier(39, [{ type: 'dust', amount: 80 }]),
    tier(40, [{ type: 'card', rarity: 'legendary', count: 1 }]),
    tier(41, [{ type: 'ryos', amount: 800 }]),
    tier(42, [{ type: 'dust', amount: 90 }]),
    tier(43, [{ type: 'ryos', amount: 800 }]),
    tier(44, [{ type: 'essence', amount: 5 }]),
    tier(45, [{ type: 'booster', boosterType: 'standard' }]),
    tier(46, [{ type: 'dust', amount: 100 }]),
    tier(47, [{ type: 'ryos', amount: 900 }]),
    tier(48, [{ type: 'essence', amount: 5 }]),
    tier(49, [{ type: 'dust', amount: 100 }]),
    tier(50, [
      { type: 'cosmetic', cosmeticType: 'avatar', key: 'shadow_awaken_free' },
      { type: 'card', rarity: 'legendary', count: 1 },
    ]),
  ];

  const premiumEntries = [
    tier(1, [
      { type: 'card', rarity: 'rare', count: 2 },
      { type: 'cosmetic', cosmeticType: 'card_back', key: 'ancestral_shadows' },
    ]),
    tier(2, [{ type: 'ryos', amount: 750 }]),
    tier(3, [{ type: 'dust', amount: 75 }]),
    tier(4, [{ type: 'kage_coins', amount: 25 }]),
    tier(5, [{ type: 'booster', boosterType: 'premium' }]),
    tier(6, [{ type: 'essence', amount: 5 }]),
    tier(7, [{ type: 'ryos', amount: 500 }]),
    tier(8, [{ type: 'dust', amount: 80 }]),
    tier(9, [{ type: 'ryos', amount: 500 }]),
    tier(10, [
      { type: 'card', rarity: 'legendary', count: 2 },
      { type: 'kage_coins', amount: 100 },
    ]),
    tier(11, [{ type: 'dust', amount: 90 }]),
    tier(12, [{ type: 'ryos', amount: 600 }]),
    tier(13, [{ type: 'essence', amount: 5 }]),
    tier(14, [{ type: 'dust', amount: 90 }]),
    tier(15, [{ type: 'cosmetic', cosmeticType: 'avatar', key: 'animated_shadow_veil' }]),
    tier(16, [{ type: 'ryos', amount: 700 }]),
    tier(17, [{ type: 'dust', amount: 100 }]),
    tier(18, [{ type: 'kage_coins', amount: 25 }]),
    tier(19, [{ type: 'essence', amount: 8 }]),
    tier(20, [{ type: 'booster', boosterType: 'legendary' }]),
    tier(21, [{ type: 'ryos', amount: 800 }]),
    tier(22, [{ type: 'dust', amount: 110 }]),
    tier(23, [{ type: 'card', rarity: 'rare', count: 1 }]),
    tier(24, [{ type: 'ryos', amount: 800 }]),
    tier(25, [{ type: 'essence', amount: 20 }]),
    tier(26, [{ type: 'dust', amount: 120 }]),
    tier(27, [{ type: 'kage_coins', amount: 50 }]),
    tier(28, [{ type: 'ryos', amount: 900 }]),
    tier(29, [{ type: 'dust', amount: 120 }]),
    tier(30, [
      { type: 'card', rarity: 'legendary', count: 3 },
      { type: 'cosmetic', cosmeticType: 'emote', key: 'too_easy' },
    ]),
    tier(31, [{ type: 'ryos', amount: 1000 }]),
    tier(32, [{ type: 'dust', amount: 130 }]),
    tier(33, [{ type: 'essence', amount: 10 }]),
    tier(34, [{ type: 'ryos', amount: 1000 }]),
    tier(35, [{ type: 'booster', boosterType: 'premium' }]),
    tier(36, [{ type: 'dust', amount: 140 }]),
    tier(37, [{ type: 'kage_coins', amount: 50 }]),
    tier(38, [{ type: 'ryos', amount: 1100 }]),
    tier(39, [{ type: 'essence', amount: 10 }]),
    tier(40, [{ type: 'kage_coins', amount: 200 }]),
    tier(41, [{ type: 'dust', amount: 150 }]),
    tier(42, [{ type: 'ryos', amount: 1200 }]),
    tier(43, [{ type: 'card', rarity: 'rare', count: 2 }]),
    tier(44, [{ type: 'dust', amount: 150 }]),
    tier(45, [{ type: 'booster', boosterType: 'legendary' }]),
    tier(46, [{ type: 'essence', amount: 15 }]),
    tier(47, [{ type: 'ryos', amount: 1500 }]),
    tier(48, [{ type: 'cosmetic', cosmeticType: 'emote', key: 'on_fire' }]),
    tier(49, [{ type: 'dust', amount: 200 }]),
    tier(50, [
      { type: 'card', rarity: 'mythic', count: 1 },
      { type: 'cosmetic', cosmeticType: 'card_effect', key: 'golden_particles' },
    ]),
  ];

  const freeTrack = {};
  for (const [level, rewards] of freeEntries) freeTrack[String(level)] = rewards;
  const premiumTrack = {};
  for (const [level, rewards] of premiumEntries) premiumTrack[String(level)] = rewards;

  return { free: freeTrack, premium: premiumTrack };
}

export const SEASON_1_META = {
  seasonNumber: 1,
  name: "Saison 1 : L'Éveil des Ombres",
  theme: 'shadow_clan',
  maxLevel: 50,
  baseXpPerLevel: 1000,
};

/**
 * Quêtes saison 1 — daily ×5, weekly ×5, milestone ×4.
 * Objectifs variés : wins, cartes, boosters, upgrades, file PvP, parcours.
 * Clés alignées sur BATTLE_PASS_QUEST_ACTIONS (battlePassQuestService).
 */
export function buildSeason1QuestDefs(seasonStart, seasonEnd) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + dayMs - 1);

  const weekStart = new Date(dayStart);
  const dow = weekStart.getUTCDay(); // 0=dim
  const toMonday = dow === 0 ? -6 : 1 - dow;
  weekStart.setUTCDate(weekStart.getUTCDate() + toMonday);
  const weekEnd = new Date(weekStart.getTime() + 7 * dayMs - 1);

  const dailies = [
    {
      quest_type: 'daily',
      quest_key: 'win_3_combats',
      description_fr: 'Remporter 3 duels sous le voile',
      description_en: 'Win 3 combats under the veil',
      goal_value: 3,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'play_20_cards',
      description_fr: 'Jouer 20 cartes en mission',
      description_en: 'Play 20 cards on mission',
      goal_value: 20,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'deal_500_damage',
      description_fr: 'Infliger 500 dégâts au total',
      description_en: 'Deal 500 total damage',
      goal_value: 500,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'open_1_booster',
      description_fr: 'Ouvrir 1 booster du clan',
      description_en: 'Open 1 clan booster',
      goal_value: 1,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'upgrade_1_card',
      description_fr: 'Améliorer 1 carte de votre collection',
      description_en: 'Upgrade 1 card in your collection',
      goal_value: 1,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'complete_1_run',
      description_fr: 'Achever 1 parcours de mission',
      description_en: 'Complete 1 mission run',
      goal_value: 1,
      xp_reward: 200,
    },
    {
      quest_type: 'daily',
      quest_key: 'join_pvp_queue',
      description_fr: 'Rejoindre la file d’honneur PvP',
      description_en: 'Join the PvP honor queue',
      goal_value: 1,
      xp_reward: 200,
    },
  ].map((q) => ({
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
      xp_reward: 1000,
    },
    {
      quest_type: 'weekly',
      quest_key: 'complete_5_missions_b',
      description_fr: 'Terminer 5 missions de rang B ou plus',
      description_en: 'Finish 5 rank B+ missions',
      goal_value: 5,
      xp_reward: 1000,
    },
    {
      quest_type: 'weekly',
      quest_key: 'collect_10_cards',
      description_fr: 'Découvrir 10 nouvelles cartes',
      description_en: 'Discover 10 new cards',
      goal_value: 10,
      xp_reward: 1000,
      bonus_reward_json: JSON.stringify({ type: 'dust', amount: 50 }),
    },
    {
      quest_type: 'weekly',
      quest_key: 'open_5_boosters',
      description_fr: 'Ouvrir 5 boosters',
      description_en: 'Open 5 boosters',
      goal_value: 5,
      xp_reward: 1000,
    },
    {
      quest_type: 'weekly',
      quest_key: 'complete_3_runs',
      description_fr: 'Achever 3 parcours de mission',
      description_en: 'Complete 3 mission runs',
      goal_value: 3,
      xp_reward: 1000,
    },
    {
      quest_type: 'weekly',
      quest_key: 'upgrade_5_cards',
      description_fr: 'Améliorer 5 cartes',
      description_en: 'Upgrade 5 cards',
      goal_value: 5,
      xp_reward: 1000,
      bonus_reward_json: JSON.stringify({ type: 'essence', amount: 2 }),
    },
    {
      quest_type: 'weekly',
      quest_key: 'join_pvp_queue_5',
      description_fr: 'Entrer 5 fois dans la file PvP',
      description_en: 'Enter the PvP queue 5 times',
      goal_value: 5,
      xp_reward: 1000,
    },
  ].map((q) => ({
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
      xp_reward: 5000,
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
      xp_reward: 5000,
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
      xp_reward: 5000,
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
      xp_reward: 5000,
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
      xp_reward: 5000,
      bonus_reward_json: JSON.stringify({ type: 'card', rarity: 'rare', count: 1 }),
      available_from: seasonStart,
      available_until: seasonEnd,
    },
  ];

  return [...dailies, ...weeklies, ...milestones];
}
