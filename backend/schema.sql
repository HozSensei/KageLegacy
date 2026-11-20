
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `battle_pass_quests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `season_id` int unsigned NOT NULL,
  `quest_type` enum('daily','weekly','milestone') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quest_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_fr` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `goal_value` int unsigned NOT NULL,
  `xp_reward` int unsigned NOT NULL,
  `bonus_reward_json` json DEFAULT NULL,
  `available_from` timestamp NOT NULL,
  `available_until` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bpq_season_type` (`season_id`,`quest_type`),
  KEY `idx_bpq_window` (`available_from`,`available_until`),
  KEY `idx_bpq_key` (`quest_key`),
  CONSTRAINT `fk_bpq_season` FOREIGN KEY (`season_id`) REFERENCES `battle_pass_seasons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `battle_pass_quests` WRITE;
/*!40000 ALTER TABLE `battle_pass_quests` DISABLE KEYS */;
/*!40000 ALTER TABLE `battle_pass_quests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `battle_pass_seasons` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `season_number` int unsigned NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `theme` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `max_level` int unsigned NOT NULL DEFAULT '50',
  `base_xp_per_level` int unsigned NOT NULL DEFAULT '1000',
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `rewards_json` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bp_season_number` (`season_number`),
  KEY `idx_bp_seasons_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `battle_pass_seasons` WRITE;
/*!40000 ALTER TABLE `battle_pass_seasons` DISABLE KEYS */;
/*!40000 ALTER TABLE `battle_pass_seasons` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `battle_pass_stripe_purchases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `season_id` int unsigned NOT NULL,
  `stripe_session_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_eur_cents` int unsigned NOT NULL DEFAULT '500',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bps_stripe_session` (`stripe_session_id`),
  KEY `idx_bps_user` (`user_id`),
  KEY `idx_bps_season` (`season_id`),
  CONSTRAINT `fk_bps_season` FOREIGN KEY (`season_id`) REFERENCES `battle_pass_seasons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `battle_pass_stripe_purchases` WRITE;
/*!40000 ALTER TABLE `battle_pass_stripe_purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `battle_pass_stripe_purchases` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `card_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_fr` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('attack','defense','skill','summon','item') COLLATE utf8mb4_unicode_ci NOT NULL,
  `stat_type` enum('taijutsu','ninjutsu','genjutsu','medicine','common') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `element` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'katon, suiton, raiton, doton, futon, null',
  `rarity` enum('common','rare','legendary','mythic') COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_cost` int NOT NULL DEFAULT '0',
  `base_damage` int NOT NULL DEFAULT '0',
  `base_block` int NOT NULL DEFAULT '0',
  `base_heal` int NOT NULL DEFAULT '0',
  `effects_json` json DEFAULT NULL,
  `held_effect_json` json DEFAULT NULL,
  `summon_json` json DEFAULT NULL,
  `exhaust` tinyint(1) NOT NULL DEFAULT '0',
  `passive_bonus_json` json DEFAULT NULL,
  `passive_description_fr` text COLLATE utf8mb4_unicode_ci,
  `passive_description_en` text COLLATE utf8mb4_unicode_ci,
  `description_fr` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_en` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `lore_fr` text COLLATE utf8mb4_unicode_ci,
  `lore_en` text COLLATE utf8mb4_unicode_ci,
  `upgradable` tinyint(1) NOT NULL DEFAULT '1',
  `upgrade_bonuses_json` json DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `artist` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Generated',
  `season_introduced` int unsigned DEFAULT NULL,
  `is_exclusive` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_card_definitions_slug` (`slug`),
  KEY `idx_card_rarity` (`rarity`),
  KEY `idx_card_type` (`type`),
  KEY `idx_card_element` (`element`),
  KEY `idx_card_stat_type` (`stat_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `card_definitions` WRITE;
/*!40000 ALTER TABLE `card_definitions` DISABLE KEYS */;
/*!40000 ALTER TABLE `card_definitions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combat_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `combat_session_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turn` int unsigned NOT NULL DEFAULT '1',
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_data_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_combat_logs_session` (`combat_session_id`,`turn`),
  CONSTRAINT `fk_combat_logs_session` FOREIGN KEY (`combat_session_id`) REFERENCES `combat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `combat_logs` WRITE;
/*!40000 ALTER TABLE `combat_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `combat_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combat_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID',
  `user_id` int unsigned NOT NULL,
  `mission_id` int unsigned DEFAULT NULL,
  `mission_run_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Run de mission parent (récompenses en fin de parcours)',
  `deck_id` int unsigned DEFAULT NULL,
  `state` enum('in_progress','victory','defeat','forfeited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `player_state_json` json NOT NULL,
  `enemy_state_json` json NOT NULL,
  `current_turn` int unsigned NOT NULL DEFAULT '1',
  `current_phase` enum('player_turn','enemy_turn','game_over') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'player_turn',
  `stats_snapshot_json` json DEFAULT NULL,
  `talent_effects_json` json DEFAULT NULL,
  `rewards_json` json DEFAULT NULL COMMENT 'Résumé récompenses de victoire (xp/ryos/carte)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_combat_sessions_user` (`user_id`,`state`),
  KEY `idx_combat_sessions_mission` (`mission_id`),
  KEY `idx_combat_sessions_run` (`mission_run_id`),
  CONSTRAINT `fk_combat_sessions_mission` FOREIGN KEY (`mission_id`) REFERENCES `mission_definitions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_combat_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `combat_sessions` WRITE;
/*!40000 ALTER TABLE `combat_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `combat_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mission_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_fr` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_fr` text COLLATE utf8mb4_unicode_ci,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `rank` enum('D','C','B','A','S') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'D',
  `encounters_json` json NOT NULL,
  `rewards_json` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mission_definitions_slug` (`slug`),
  KEY `idx_mission_rank` (`rank`),
  KEY `idx_mission_active` (`is_active`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `mission_definitions` WRITE;
/*!40000 ALTER TABLE `mission_definitions` DISABLE KEYS */;
INSERT INTO `mission_definitions` VALUES (1,'mission-rank-d','Mission — rang D','Mission — rank D','Patrouille de bas échelon. Le parcours est tiré à chaque lancement ; le briefing s’ouvre au départ.','Low-rank patrol. The path is rolled on each launch; the briefing opens at start.','D','[]','{\"xp\":70,\"ryos\":300,\"bpPoints\":5,\"cardChance\":24,\"runBonusMult\":1.6}',1,10,'2026-11-20 00:00:00'),(2,'mission-rank-c','Mission — rang C','Mission — rank C','Opération d’avant-poste. Chemin aléatoire ; briefing révélé au lancement.','Outpost operation. Random path; briefing revealed on launch.','C','[]','{\"xp\":90,\"ryos\":540,\"bpPoints\":8,\"cardChance\":28,\"runBonusMult\":1.8}',1,20,'2026-11-20 00:00:00'),(3,'mission-rank-b','Mission — rang B','Mission — rank B','Assaut d’élite. Parcours généré à la volée, finale boss possible.','Elite assault. Path generated on the fly, possible boss finale.','B','[]','{\"xp\":360,\"ryos\":1000,\"bpPoints\":14,\"cardChance\":38,\"runBonusMult\":2.1}',1,30,'2026-11-20 00:00:00'),(4,'mission-rank-a','Mission — rang A','Mission — rank A','Raid critique. Long parcours aléatoire avec confrontations dures.','Critical raid. Long random path with hard confrontations.','A','[]','{\"xp\":580,\"ryos\":1700,\"bpPoints\":22,\"cardChance\":50,\"runBonusMult\":2.5}',1,40,'2026-11-20 00:00:00'),(5,'mission-rank-s','Mission — rang S','Mission — rank S','Ombre du Kage. Le parcours le plus exigeant, régénéré à chaque départ.','Shadow of the Kage. The harshest path, regenerated each start.','S','[]','{\"xp\":900,\"ryos\":2800,\"bpPoints\":35,\"cardChance\":60,\"runBonusMult\":3}',1,50,'2026-11-20 00:00:00');
/*!40000 ALTER TABLE `mission_definitions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mission_runs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID',
  `user_id` int unsigned NOT NULL,
  `mission_id` int unsigned NOT NULL,
  `deck_id` int unsigned DEFAULT NULL,
  `state` enum('in_progress','victory','defeat','abandoned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `current_node_index` int unsigned NOT NULL DEFAULT '0',
  `nodes_json` json NOT NULL,
  `player_run_state_json` json NOT NULL,
  `stats_snapshot_json` json DEFAULT NULL,
  `talent_effects_json` json DEFAULT NULL,
  `current_combat_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Combat en cours lié à ce run',
  `rewards_json` json DEFAULT NULL COMMENT 'Récompenses de fin de run',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mission_runs_user_state` (`user_id`,`state`),
  KEY `idx_mission_runs_mission` (`mission_id`),
  CONSTRAINT `fk_mission_runs_mission` FOREIGN KEY (`mission_id`) REFERENCES `mission_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_runs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `mission_runs` WRITE;
/*!40000 ALTER TABLE `mission_runs` DISABLE KEYS */;
/*!40000 ALTER TABLE `mission_runs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_profiles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `character_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `character_avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `character_avatar_id` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'aspirant-1-1',
  `character_background_id` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `character_nickname_id` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `character_level` int unsigned NOT NULL DEFAULT '1',
  `character_highest_level` int unsigned NOT NULL DEFAULT '1',
  `character_xp` int unsigned NOT NULL DEFAULT '0',
  `character_rank` enum('Genin','Chunin','Jonin','ANBU','Kage','Aspirant ninja') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aspirant ninja',
  `character_talent_points_available` int unsigned NOT NULL DEFAULT '1',
  `character_element_affinity` enum('Katon','Suiton','Raiton','Doton','Futon') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Katon',
  `character_faction_id` enum('midorihara','kareno','oborohama') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `character_faction_retake_used` tinyint(1) NOT NULL DEFAULT '0',
  `character_created_at` timestamp NULL DEFAULT NULL,
  `character_updated_at` timestamp NULL DEFAULT NULL,
  `ryos` int NOT NULL DEFAULT '300',
  `async_duel_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `language` enum('fr','en') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fr',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `card_dust` int unsigned NOT NULL DEFAULT '0' COMMENT 'Poussière de carte (désenchantement)',
  `card_essence` int unsigned NOT NULL DEFAULT '0' COMMENT 'Essence de carte (craft)',
  `kage_coins` int unsigned NOT NULL DEFAULT '0' COMMENT 'Monnaie premium (Battle Pass)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_sensei_card_resources` (`card_dust`,`card_essence`),
  KEY `idx_profile_character_level` (`character_level`),
  KEY `idx_profile_character_rank` (`character_rank`),
  KEY `idx_profile_character_faction` (`character_faction_id`),
  KEY `idx_profile_character_level_xp` (`character_level` DESC,`character_xp` DESC),
  CONSTRAINT `fk_player_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `player_profiles` WRITE;
/*!40000 ALTER TABLE `player_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_profiles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pvp_invites` (
  `code` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int unsigned NOT NULL,
  `player_level` smallint unsigned NOT NULL DEFAULT '1',
  `deck_id` int unsigned DEFAULT NULL,
  `level_window` tinyint unsigned NOT NULL DEFAULT '3',
  `status` enum('pending','accepted','cancelled','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `match_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`),
  KEY `idx_pvp_invites_user_status` (`user_id`,`status`),
  KEY `idx_pvp_invites_expiry` (`status`,`expires_at`),
  CONSTRAINT `fk_pvp_invites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pvp_invites` WRITE;
/*!40000 ALTER TABLE `pvp_invites` DISABLE KEYS */;
/*!40000 ALTER TABLE `pvp_invites` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pvp_matches` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID',
  `host_user_id` int unsigned NOT NULL,
  `guest_user_id` int unsigned NOT NULL,
  `host_level` smallint unsigned NOT NULL DEFAULT '1',
  `guest_level` smallint unsigned NOT NULL DEFAULT '1',
  `level_window` tinyint unsigned NOT NULL DEFAULT '3',
  `status` enum('pending','ready','in_progress','completed','cancelled','forfeited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `seed` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `host_deck_id` int unsigned DEFAULT NULL,
  `guest_deck_id` int unsigned DEFAULT NULL,
  `bootstrap_json` json NOT NULL,
  `host_ready` tinyint(1) NOT NULL DEFAULT '0',
  `guest_ready` tinyint(1) NOT NULL DEFAULT '0',
  `winner_user_id` int unsigned DEFAULT NULL,
  `winner_seat` enum('host','guest') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_reason` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'hp|forfeit|report|timeout',
  `anti_cheat_mode` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trust_host',
  `host_checksum` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guest_checksum` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_summary_json` json DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pvp_matches_host` (`host_user_id`,`status`),
  KEY `idx_pvp_matches_guest` (`guest_user_id`,`status`),
  KEY `idx_pvp_matches_status` (`status`,`created_at`),
  CONSTRAINT `fk_pvp_matches_guest` FOREIGN KEY (`guest_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pvp_matches_host` FOREIGN KEY (`host_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pvp_matches` WRITE;
/*!40000 ALTER TABLE `pvp_matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `pvp_matches` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pvp_queue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `player_level` smallint unsigned NOT NULL DEFAULT '1',
  `deck_id` int unsigned DEFAULT NULL,
  `level_window` tinyint unsigned NOT NULL DEFAULT '3' COMMENT 'Fenêtre ±N niveaux',
  `status` enum('waiting','matched','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `matched_match_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enqueued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pvp_queue_waiting` (`status`,`player_level`,`enqueued_at`),
  KEY `idx_pvp_queue_user_status` (`user_id`,`status`),
  CONSTRAINT `fk_pvp_queue_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `pvp_queue` WRITE;
/*!40000 ALTER TABLE `pvp_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `pvp_queue` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_coin_pack_purchases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `pack_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coins_granted` int unsigned NOT NULL,
  `method` enum('stub','stripe') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'stub',
  `stripe_session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_scp_stripe_session` (`stripe_session_id`),
  KEY `idx_scp_user` (`user_id`),
  KEY `idx_scp_pack` (`pack_id`),
  CONSTRAINT `fk_scp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `shop_coin_pack_purchases` WRITE;
/*!40000 ALTER TABLE `shop_coin_pack_purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_coin_pack_purchases` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `talent_tree_nodes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ex: tai_5_a, nin_keystone_berserker',
  `name_fr` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_fr` text COLLATE utf8mb4_unicode_ci,
  `description_en` text COLLATE utf8mb4_unicode_ci,
  `type` enum('stat','notable','keystone') COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_x` int NOT NULL COMMENT 'Coordonnée X dans l''arbre',
  `position_y` int NOT NULL COMMENT 'Coordonnée Y dans l''arbre',
  `branch` enum('taijutsu','ninjutsu','genjutsu','medicine','center') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Palier vertical, 0 pour les nœuds legacy archivés',
  `max_rank` tinyint unsigned NOT NULL DEFAULT '1',
  `required_branch_points` int unsigned NOT NULL DEFAULT '0',
  `stat_bonus_json` json DEFAULT NULL,
  `effect_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Code interne pour appliquer l''effet',
  `requires_nodes_json` json DEFAULT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Emoji ou classe CSS',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Couleur pour les Keystones',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `node_id` (`node_id`),
  KEY `idx_talent_node_type` (`type`),
  KEY `idx_talent_node_branch` (`branch`),
  KEY `idx_talent_node_position` (`position_x`,`position_y`),
  CONSTRAINT `chk_stat_bonus_or_effect` CHECK ((((`type` = _utf8mb4'stat') and (`stat_bonus_json` is not null)) or ((`type` in (_utf8mb4'notable',_utf8mb4'keystone')) and (`effect_code` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `talent_tree_nodes` WRITE;
/*!40000 ALTER TABLE `talent_tree_nodes` DISABLE KEYS */;
/*!40000 ALTER TABLE `talent_tree_nodes` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_onboarding` (
  `user_id` int unsigned NOT NULL,
  `step_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `claimed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`step_key`),
  KEY `idx_uo_user` (`user_id`),
  CONSTRAINT `fk_uo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_achievements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `achievement_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_progress` int unsigned NOT NULL DEFAULT '0',
  `highest_tier` int unsigned NOT NULL DEFAULT '0' COMMENT 'Highest unlocked tier index (1-based), 0 = none',
  `claimed_tiers_json` json NOT NULL,
  `meta_json` json DEFAULT NULL COMMENT 'streak counters, last sync, etc.',
  `first_unlocked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_achievement` (`user_id`,`achievement_key`),
  KEY `idx_ua_user` (`user_id`),
  KEY `idx_ua_key` (`achievement_key`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_battle_pass` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `season_id` int unsigned NOT NULL,
  `current_level` int unsigned NOT NULL DEFAULT '0',
  `current_xp` int unsigned NOT NULL DEFAULT '0',
  `is_premium` tinyint(1) NOT NULL DEFAULT '0',
  `premium_purchased_at` timestamp NULL DEFAULT NULL,
  `claimed_rewards_json` json NOT NULL,
  `missions_completed` int unsigned NOT NULL DEFAULT '0',
  `combats_won` int unsigned NOT NULL DEFAULT '0',
  `cards_obtained` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_season` (`user_id`,`season_id`),
  KEY `idx_ubp_user` (`user_id`),
  KEY `idx_ubp_season` (`season_id`),
  CONSTRAINT `fk_ubp_season` FOREIGN KEY (`season_id`) REFERENCES `battle_pass_seasons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ubp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_battle_pass` WRITE;
/*!40000 ALTER TABLE `user_battle_pass` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_battle_pass` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_battle_pass_quests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `quest_id` int unsigned NOT NULL,
  `current_progress` int unsigned NOT NULL DEFAULT '0',
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `completed_at` timestamp NULL DEFAULT NULL,
  `is_claimed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_quest` (`user_id`,`quest_id`),
  KEY `idx_ubpq_user` (`user_id`),
  KEY `idx_ubpq_quest` (`quest_id`),
  CONSTRAINT `fk_ubpq_quest` FOREIGN KEY (`quest_id`) REFERENCES `battle_pass_quests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ubpq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_battle_pass_quests` WRITE;
/*!40000 ALTER TABLE `user_battle_pass_quests` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_battle_pass_quests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_card_collection` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `card_definition_id` int unsigned NOT NULL,
  `upgrade_level` tinyint unsigned NOT NULL DEFAULT '0' COMMENT '0=base, 1=+, 2=++',
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `obtained_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `obtained_source` enum('mission','booster','craft','battle_pass','event','starter','grant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'grant',
  `times_played` int unsigned NOT NULL DEFAULT '0',
  `total_damage_dealt` int unsigned NOT NULL DEFAULT '0',
  `total_block_gained` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_card_def` (`user_id`,`card_definition_id`),
  KEY `fk_ucc_card` (`card_definition_id`),
  KEY `idx_ucc_user` (`user_id`),
  KEY `idx_ucc_upgrade` (`upgrade_level`),
  CONSTRAINT `fk_ucc_card` FOREIGN KEY (`card_definition_id`) REFERENCES `card_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ucc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_ucc_quantity` CHECK ((`quantity` >= 1)),
  CONSTRAINT `chk_upgrade_level` CHECK ((`upgrade_level` between 0 and 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_card_collection` WRITE;
/*!40000 ALTER TABLE `user_card_collection` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_card_collection` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_deck_cards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `deck_id` int unsigned NOT NULL,
  `user_card_collection_id` int unsigned NOT NULL,
  `card_definition_id` int unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `position` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deck_collection` (`deck_id`,`user_card_collection_id`),
  KEY `fk_udc_collection` (`user_card_collection_id`),
  KEY `idx_udc_deck` (`deck_id`),
  KEY `idx_udc_card_def` (`card_definition_id`),
  CONSTRAINT `fk_udc_card_def` FOREIGN KEY (`card_definition_id`) REFERENCES `card_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udc_collection` FOREIGN KEY (`user_card_collection_id`) REFERENCES `user_card_collection` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udc_deck` FOREIGN KEY (`deck_id`) REFERENCES `user_decks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_udc_quantity` CHECK ((`quantity` >= 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_deck_cards` WRITE;
/*!40000 ALTER TABLE `user_deck_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_deck_cards` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_decks` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `archetype` enum('aggro','control','combo','midrange') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'midrange',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_decks_active` (`user_id`,`is_active`),
  CONSTRAINT `fk_user_decks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_decks` WRITE;
/*!40000 ALTER TABLE `user_decks` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_decks` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_token` (`token_hash`),
  KEY `idx_session_user` (`user_id`),
  KEY `idx_session_expires` (`expires_at`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_talent_respec_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `respec_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cost_ryos` int unsigned NOT NULL DEFAULT '0',
  `cost_dust` int unsigned NOT NULL DEFAULT '0',
  `points_refunded` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_respec_history_user_date` (`user_id`,`respec_at`),
  CONSTRAINT `fk_respec_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_talent_respec_history` WRITE;
/*!40000 ALTER TABLE `user_talent_respec_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_talent_respec_history` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_talents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_spent` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'Rang acheté sur ce nœud',
  `unlocked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_talent` (`user_id`,`node_id`),
  KEY `fk_user_talents_node` (`node_id`),
  KEY `idx_user_talents_user` (`user_id`),
  CONSTRAINT `fk_user_talents_node` FOREIGN KEY (`node_id`) REFERENCES `talent_tree_nodes` (`node_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_talents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_talents` WRITE;
/*!40000 ALTER TABLE `user_talents` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_talents` ENABLE KEYS */;
UNLOCK TABLES;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `is_guest` tinyint(1) NOT NULL DEFAULT '0',
  `guest_expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `starter_loadout_reset_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
CREATE TABLE IF NOT EXISTS `async_duel_friendships` (
  `user_low_id` int unsigned NOT NULL,
  `user_high_id` int unsigned NOT NULL,
  `requested_by` int unsigned NOT NULL,
  `status` enum('pending','accepted') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_low_id`, `user_high_id`),
  CONSTRAINT `ck_async_duel_friendship_pair` CHECK (`user_low_id` < `user_high_id`),
  CONSTRAINT `ck_async_duel_friendship_requester` CHECK (`requested_by` IN (`user_low_id`, `user_high_id`)),
  CONSTRAINT `fk_async_duel_friendship_low` FOREIGN KEY (`user_low_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_async_duel_friendship_high` FOREIGN KEY (`user_high_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_async_duel_friendship_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duels` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attacker_id` int unsigned NOT NULL,
  `defender_id` int unsigned NOT NULL,
  `attacker_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `defender_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` enum('friend','random','enemy_faction') DEFAULT NULL,
  `attacker_faction` varchar(32) DEFAULT NULL,
  `defender_faction` varchar(32) DEFAULT NULL,
  `revision` int unsigned NOT NULL DEFAULT '0',
  `state_json` json NOT NULL,
  `outcome` enum('victory','defeat','forfeited') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `active_attacker_id` int unsigned GENERATED ALWAYS AS (IF(`finished_at` IS NULL, `attacker_id`, NULL)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_async_duel_active_attacker` (`active_attacker_id`),
  KEY `idx_async_duel_attacker` (`attacker_id`),
  KEY `idx_async_duel_defenses` (`defender_id`, `finished_at` DESC, `id` DESC),
  CONSTRAINT `ck_async_duel_finished` CHECK ((`finished_at` IS NULL) = (`outcome` IS NULL)),
  CONSTRAINT `fk_async_duel_attacker` FOREIGN KEY (`attacker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_async_duel_defender` FOREIGN KEY (`defender_id`) REFERENCES `player_profiles` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duel_reward_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `duel_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attacker_id` int unsigned DEFAULT NULL,
  `defender_id` int unsigned DEFAULT NULL,
  `credited_on` date NOT NULL,
  `beneficiary_slot` tinyint unsigned NOT NULL,
  `ryos` int unsigned NOT NULL,
  `winner_side` enum('attacker','defender') DEFAULT NULL,
  `beneficiary_id` int unsigned GENERATED ALWAYS AS (IF(`winner_side` = 'attacker', `attacker_id`, `defender_id`)) VIRTUAL,
  `pair_low_id` int unsigned GENERATED ALWAYS AS (LEAST(`attacker_id`, `defender_id`)) VIRTUAL,
  `pair_high_id` int unsigned GENERATED ALWAYS AS (GREATEST(`attacker_id`, `defender_id`)) VIRTUAL,
  `new_credit` tinyint GENERATED ALWAYS AS (IF(`winner_side` IS NULL, NULL, 1)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_async_duel_reward_duel` (`duel_id`),
  UNIQUE KEY `uq_async_duel_reward_unordered_day` (`pair_low_id`, `pair_high_id`, `credited_on`, `new_credit`),
  UNIQUE KEY `uq_async_duel_reward_beneficiary_slot` (`beneficiary_id`, `credited_on`, `beneficiary_slot`),
  KEY `idx_async_duel_reward_attacker` (`attacker_id`),
  KEY `idx_async_duel_reward_defender` (`defender_id`),
  CONSTRAINT `ck_async_duel_reward_slot` CHECK (`beneficiary_slot` BETWEEN 1 AND 3),
  CONSTRAINT `ck_async_duel_reward_ryos` CHECK (`ryos` > 0),
  CONSTRAINT `fk_async_duel_reward_duel` FOREIGN KEY (`duel_id`) REFERENCES `async_duels` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_async_duel_reward_attacker` FOREIGN KEY (`attacker_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_async_duel_reward_defender` FOREIGN KEY (`defender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duel_faction_points` (
  `duel_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `week_start` date NOT NULL,
  `pair_low_id` int unsigned NOT NULL,
  `pair_high_id` int unsigned NOT NULL,
  `winner_id` int unsigned NOT NULL,
  `faction_id` varchar(32) NOT NULL,
  `scored_on` date NOT NULL,
  `winner_slot` tinyint unsigned NOT NULL,
  PRIMARY KEY (`week_start`, `pair_low_id`, `pair_high_id`),
  UNIQUE KEY `uq_async_duel_faction_duel` (`duel_id`),
  UNIQUE KEY `uq_async_duel_faction_winner_slot` (`winner_id`, `scored_on`, `winner_slot`),
  CONSTRAINT `ck_async_duel_faction_pair` CHECK (`pair_low_id` < `pair_high_id`),
  CONSTRAINT `ck_async_duel_faction_winner` CHECK (`winner_id` IN (`pair_low_id`, `pair_high_id`)),
  CONSTRAINT `ck_async_duel_faction_slot` CHECK (`winner_slot` BETWEEN 1 AND 3),
  CONSTRAINT `fk_async_duel_faction_duel` FOREIGN KEY (`duel_id`) REFERENCES `async_duels` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `async_duel_weekly_state` (
  `id` tinyint unsigned NOT NULL,
  `installed_at` datetime(6) NOT NULL,
  `first_week_start` date NOT NULL,
  `next_week_start` date NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_async_duel_weekly_state_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duel_village_membership` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `effective_at` datetime(6) NOT NULL,
  `faction_id` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_async_duel_membership_opening` (`user_id`, `effective_at`, `id`),
  CONSTRAINT `fk_async_duel_membership_profile` FOREIGN KEY (`user_id`) REFERENCES `player_profiles` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duel_weekly_settlements` (
  `week_start` date NOT NULL,
  `winner_faction_id` varchar(32) DEFAULT NULL,
  `reward_ryos` int unsigned NOT NULL,
  `settled_at` datetime(6) NOT NULL,
  PRIMARY KEY (`week_start`),
  CONSTRAINT `ck_async_duel_weekly_settlement_reward` CHECK (
    (`winner_faction_id` IS NULL AND `reward_ryos` = 0) OR
    (`winner_faction_id` IS NOT NULL AND `reward_ryos` > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `async_duel_weekly_reward_ledger` (
  `week_start` date NOT NULL,
  `user_id` int unsigned NOT NULL,
  `ryos` int unsigned NOT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`week_start`, `user_id`),
  KEY `idx_async_duel_weekly_ledger_user_week` (`user_id`, `week_start`),
  CONSTRAINT `ck_async_duel_weekly_ledger_ryos` CHECK (`ryos` > 0),
  CONSTRAINT `fk_async_duel_weekly_ledger_week` FOREIGN KEY (`week_start`) REFERENCES `async_duel_weekly_settlements` (`week_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
