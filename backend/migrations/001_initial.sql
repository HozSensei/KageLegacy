-- Kage Legacy — Schéma initial (Milestone 1)

CREATE TABLE IF NOT EXISTS clan_traits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  intelligence_bonus INT NOT NULL DEFAULT 0,
  speed_bonus INT NOT NULL DEFAULT 0,
  genjutsu_bonus INT NOT NULL DEFAULT 0,
  ninjutsu_bonus INT NOT NULL DEFAULT 0,
  moral_variance INT NOT NULL DEFAULT 0,
  is_noble BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensei (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  specialty ENUM('Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence') NOT NULL DEFAULT 'Genjutsu',
  ryos INT UNSIGNED NOT NULL DEFAULT 10000,
  reputation INT UNSIGNED NOT NULL DEFAULT 0,
  chakra_pool INT UNSIGNED NOT NULL DEFAULT 100,
  language ENUM('fr', 'en') NOT NULL DEFAULT 'fr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sensei_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ninjas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  age TINYINT UNSIGNED NOT NULL DEFAULT 15,
  grade ENUM('Genin', 'Chunin', 'Jonin') NOT NULL DEFAULT 'Genin',
  clan_trait_id INT UNSIGNED NOT NULL,
  element_affinity ENUM('Katon', 'Suiton', 'Raiton', 'Doton', 'Futon') NOT NULL,
  character_trait ENUM('Egoiste', 'Altruiste', 'Faineant', 'Temeraire', 'Discipline') NOT NULL,
  salary_cost INT UNSIGNED NOT NULL DEFAULT 0,
  language ENUM('fr', 'en') NOT NULL DEFAULT 'fr',
  taijutsu TINYINT UNSIGNED NOT NULL,
  ninjutsu TINYINT UNSIGNED NOT NULL,
  genjutsu TINYINT UNSIGNED NOT NULL,
  medecine TINYINT UNSIGNED NOT NULL,
  vitesse TINYINT UNSIGNED NOT NULL,
  intelligence TINYINT UNSIGNED NOT NULL,
  weekly_forme ENUM('Lamentable', 'Passable', 'Excellent', 'Divin') NOT NULL DEFAULT 'Passable',
  moral TINYINT UNSIGNED NOT NULL DEFAULT 15,
  current_pv_match INT UNSIGNED NOT NULL DEFAULT 0,
  current_chakra_match INT UNSIGNED NOT NULL DEFAULT 0,
  squad_position TINYINT UNSIGNED NULL COMMENT '1-3 actifs, NULL banc',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ninja_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ninja_clan FOREIGN KEY (clan_trait_id) REFERENCES clan_traits(id),
  CONSTRAINT chk_ninja_age CHECK (age BETWEEN 15 AND 18),
  CONSTRAINT chk_ninja_taijutsu CHECK (taijutsu BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_ninjutsu CHECK (ninjutsu BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_genjutsu CHECK (genjutsu BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_medecine CHECK (medecine BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_vitesse CHECK (vitesse BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_intelligence CHECK (intelligence BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_moral CHECK (moral BETWEEN 1 AND 20),
  CONSTRAINT chk_ninja_squad_position CHECK (squad_position IS NULL OR squad_position BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_clock (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  cycle_start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_single_clock CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO game_clock (id, cycle_start_at) VALUES (1, UTC_TIMESTAMP());
