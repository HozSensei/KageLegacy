-- Pack Élite : abonnement saison, cosmétiques, season pass (quêtes)

CREATE TABLE IF NOT EXISTS sensei_elite_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  season_number INT UNSIGNED NOT NULL,
  status ENUM('active', 'past_due', 'canceled', 'expired') NOT NULL DEFAULT 'active',
  stripe_customer_id VARCHAR(64) NULL,
  stripe_subscription_id VARCHAR(64) NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_elite_sub_user_season (user_id, season_number),
  CONSTRAINT fk_elite_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_elite_sub_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensei_cosmetics (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  title_slug VARCHAR(50) NULL,
  banner_slug VARCHAR(50) NOT NULL DEFAULT 'none',
  name_color VARCHAR(7) NOT NULL DEFAULT '#e8ece9',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cosmetics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_title_catalog (
  slug VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  unlock_rule ENUM('elite_default', 'season_quest', 'reputation') NOT NULL DEFAULT 'elite_default',
  unlock_threshold INT UNSIGNED NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_banner_catalog (
  slug VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  css_class VARCHAR(80) NOT NULL DEFAULT '',
  unlock_rule ENUM('elite_default', 'season_quest') NOT NULL DEFAULT 'elite_default',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_season_passes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  season_number INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_season_pass_user_season (user_id, season_number),
  CONSTRAINT fk_season_pass_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_season_pass_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_quest_catalog (
  slug VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(120) NOT NULL,
  label_en VARCHAR(120) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  target_count INT UNSIGNED NOT NULL DEFAULT 1,
  reward_type ENUM('title', 'banner') NOT NULL,
  reward_slug VARCHAR(50) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_quest_progress (
  user_id INT UNSIGNED NOT NULL,
  season_number INT UNSIGNED NOT NULL,
  quest_slug VARCHAR(50) NOT NULL,
  current_progress INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL,
  claimed_at TIMESTAMP NULL,
  PRIMARY KEY (user_id, season_number, quest_slug),
  CONSTRAINT fk_quest_prog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_quest_prog_quest FOREIGN KEY (quest_slug) REFERENCES elite_quest_catalog(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS elite_unlocked_rewards (
  user_id INT UNSIGNED NOT NULL,
  reward_type ENUM('title', 'banner') NOT NULL,
  reward_slug VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlocked_via_quest_slug VARCHAR(50) NULL,
  PRIMARY KEY (user_id, reward_type, reward_slug),
  CONSTRAINT fk_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO elite_title_catalog (slug, label_fr, label_en, unlock_rule, unlock_threshold, sort_order) VALUES
  ('shadow_architect', 'Architecte des Ombres', 'Shadow Architect', 'elite_default', NULL, 1),
  ('veteran_league', 'Vétéran de la Ligue', 'League Veteran', 'elite_default', NULL, 2),
  ('chronicle_keeper', 'Gardien des Chroniques', 'Chronicle Keeper', 'elite_default', NULL, 3),
  ('dojo_founder', 'Fondateur de Dojo', 'Dojo Founder', 'reputation', 50, 4),
  ('promoted_ii', 'Promu Division II', 'Promoted to Division II', 'season_quest', NULL, 5),
  ('flawless_cycle', 'Cycle sans défaite', 'Flawless cycle', 'season_quest', NULL, 6)
ON DUPLICATE KEY UPDATE label_fr = VALUES(label_fr);

INSERT INTO elite_banner_catalog (slug, label_fr, label_en, css_class, unlock_rule, sort_order) VALUES
  ('none', 'Aucune', 'None', '', 'elite_default', 0),
  ('mist', 'Brume du crépuscule', 'Twilight mist', 'sensei-banner--mist', 'elite_default', 1),
  ('embers', 'Braises du forgeur', 'Smith''s embers', 'sensei-banner--embers', 'elite_default', 2),
  ('moonlight', 'Clair de lune', 'Moonlight', 'sensei-banner--moonlight', 'season_quest', 3),
  ('scroll', 'Parchemin ancestral', 'Ancient scroll', 'sensei-banner--scroll', 'season_quest', 4)
ON DUPLICATE KEY UPDATE label_fr = VALUES(label_fr);

INSERT INTO elite_quest_catalog (slug, label_fr, label_en, event_type, target_count, reward_type, reward_slug, sort_order) VALUES
  ('wins_2', 'Remporter 2 matchs de ligue', 'Win 2 league matches', 'league_win', 2, 'title', 'promoted_ii', 1),
  ('seals_5', 'Ouvrir 5 sceaux chakra', 'Open 5 chakra seals', 'daily_seal_opened', 5, 'banner', 'scroll', 2),
  ('missions_3', 'Collecter 3 rapports de mission', 'Collect 3 mission reports', 'mission_collected', 3, 'title', 'flawless_cycle', 3),
  ('points_9', 'Atteindre 9 points en ligue', 'Reach 9 league points', 'league_points', 9, 'banner', 'moonlight', 4)
ON DUPLICATE KEY UPDATE label_fr = VALUES(label_fr);
