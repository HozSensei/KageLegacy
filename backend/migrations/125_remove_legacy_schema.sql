-- Retire les tables de l'ancien jeu et conserve les profils/ressources TCG.
-- Sauvegarder la base avant application : les tables legacy sont supprimées.

RENAME TABLE sensei TO player_profiles;

ALTER TABLE player_profiles
  DROP FOREIGN KEY fk_sensei_user,
  RENAME COLUMN name TO display_name,
  DROP COLUMN training_focus,
  DROP COLUMN global_training_type,
  DROP COLUMN salary_debt,
  DROP COLUMN scout_env_confirmed_cycle,
  DROP COLUMN last_daily_seal_grant_date,
  DROP COLUMN academy_last_rotation_date,
  DROP COLUMN academy_jackpot_token,
  DROP COLUMN clan_board_recommended_cycle,
  DROP COLUMN reputation,
  DROP COLUMN chakra_pool,
  DROP COLUMN onboarding_deck_done,
  DROP COLUMN onboarding_mission_done,
  DROP COLUMN onboarding_dismissed,
  DROP COLUMN midcycle_rumor_cycle,
  DROP COLUMN onboarding_training_done,
  DROP COLUMN onboarding_recon_done,
  DROP COLUMN onboarding_league_done,
  DROP COLUMN village_id,
  DROP COLUMN village_retake_used,
  DROP COLUMN village_title,
  ADD CONSTRAINT fk_player_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS academy_draws;
DROP TABLE IF EXISTS clan_academy_board;
DROP TABLE IF EXISTS clan_traits;
DROP TABLE IF EXISTS cycle_job_runs;
DROP TABLE IF EXISTS cycle_scout_intel;
DROP TABLE IF EXISTS dojo_notifications;
DROP TABLE IF EXISTS elite_banner_catalog;
DROP TABLE IF EXISTS elite_quest_catalog;
DROP TABLE IF EXISTS elite_quest_progress;
DROP TABLE IF EXISTS elite_season_passes;
DROP TABLE IF EXISTS elite_title_catalog;
DROP TABLE IF EXISTS elite_unlocked_rewards;
DROP TABLE IF EXISTS game_clock;
DROP TABLE IF EXISTS heritage_scrolls;
DROP TABLE IF EXISTS idle_missions;
DROP TABLE IF EXISTS item_definitions;
DROP TABLE IF EXISTS market_offers;
DROP TABLE IF EXISTS match_narrative_segments;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS ninja_equipment;
DROP TABLE IF EXISTS ninja_tactic_cards;
DROP TABLE IF EXISTS ninjas;
DROP TABLE IF EXISTS operation_decks;
DROP TABLE IF EXISTS operation_dossiers;
DROP TABLE IF EXISTS player_clan_members;
DROP TABLE IF EXISTS player_clans;
DROP TABLE IF EXISTS player_listings;
DROP TABLE IF EXISTS recruitment_offers;
DROP TABLE IF EXISTS pool_members;
DROP TABLE IF EXISTS pool_standings;
DROP TABLE IF EXISTS pool_wall_posts;
DROP TABLE IF EXISTS pools;
DROP TABLE IF EXISTS reconnaissance_challenges;
DROP TABLE IF EXISTS reconnaissance_missions;
DROP TABLE IF EXISTS reconnaissance_narrative_segments;
DROP TABLE IF EXISTS reconnaissance_registrations;
DROP TABLE IF EXISTS sensei_cosmetics;
DROP TABLE IF EXISTS sensei_cycle_objectives;
DROP TABLE IF EXISTS sensei_elite_subscriptions;
DROP TABLE IF EXISTS sensei_notifications;
DROP TABLE IF EXISTS sensei_rivalries;
DROP TABLE IF EXISTS tactic_card_definitions;
DROP TABLE IF EXISTS user_cosmetic_loadout;
DROP TABLE IF EXISTS user_cosmetics;
DROP TABLE IF EXISTS user_items;
DROP TABLE IF EXISTS user_tactic_cards;
DROP TABLE IF EXISTS village_cycle_totals;
DROP TABLE IF EXISTS village_rivalries;
DROP TABLE IF EXISTS village_score_events;
DROP TABLE IF EXISTS village_shop_card_stock;
DROP TABLE IF EXISTS village_shop_promos;
DROP TABLE IF EXISTS village_shop_stock;

SET FOREIGN_KEY_CHECKS = 1;

-- Le marqueur ne sert qu'aux anciens comptes NPC ; leurs données restent conservées.
ALTER TABLE users DROP COLUMN is_bot;
