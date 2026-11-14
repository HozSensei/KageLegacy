-- Kage Legacy V2 — Player Character System
-- Phase 1: Single player character (no squad management)

-- Table principale pour le personnage unique du joueur
CREATE TABLE IF NOT EXISTS player_character (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  
  -- Identité
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  
  -- Progression
  level INT UNSIGNED NOT NULL DEFAULT 1,
  xp INT UNSIGNED NOT NULL DEFAULT 0,
  rank ENUM('Genin', 'Chunin', 'Jonin', 'ANBU', 'Kage') NOT NULL DEFAULT 'Genin',
  
  -- Arbre de talents
  talent_points_available INT UNSIGNED NOT NULL DEFAULT 1,
  
  -- Caractéristiques (choix initial)
  clan_trait_id INT UNSIGNED NULL,
  element_affinity ENUM('Katon', 'Suiton', 'Raiton', 'Doton', 'Futon') NOT NULL,
  specialization ENUM('Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medicine') NULL,
  
  -- Statistiques
  -- ⚠️ PAS de stats de base ici !
  -- Les stats finales sont calculées dynamiquement depuis :
  --   1. Arbre de talents (talent_points dépensés)
  --   2. Bonus passifs des cartes du deck équipé
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_player_character_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_character_clan FOREIGN KEY (clan_trait_id) REFERENCES clan_traits(id),
  CONSTRAINT chk_player_level CHECK (level BETWEEN 1 AND 100),
  CONSTRAINT chk_talent_points CHECK (talent_points_available >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour requêtes fréquentes
CREATE INDEX idx_player_level ON player_character(level);
CREATE INDEX idx_player_rank ON player_character(rank);

-- Extension de la table sensei pour les nouvelles ressources
ALTER TABLE sensei
  ADD COLUMN card_dust INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Poussière de carte (désenchantement)',
  ADD COLUMN card_essence INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Essence de carte (craft)',
  ADD COLUMN kage_coins INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Monnaie premium (Battle Pass)';

-- Index pour les nouvelles colonnes (optimisation requêtes)
CREATE INDEX idx_sensei_card_resources ON sensei(card_dust, card_essence);
