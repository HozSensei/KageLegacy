-- Kage Legacy V2 — Talent Tree System
-- Système d'arbre de talents inspiré de Path of Exile

-- Définition statique de l'arbre de talents (catalogue)
CREATE TABLE IF NOT EXISTS talent_tree_nodes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  
  -- Identifiant unique du nœud
  node_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'Ex: tai_5_a, nin_keystone_berserker',
  
  -- Nom et description
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_fr TEXT NULL,
  description_en TEXT NULL,
  
  -- Type de nœud
  type ENUM('stat', 'notable', 'keystone') NOT NULL,
  
  -- Position dans l'arbre (pour l'affichage visuel)
  position_x INT NOT NULL COMMENT 'Coordonnée X dans l''arbre',
  position_y INT NOT NULL COMMENT 'Coordonnée Y dans l''arbre',
  branch ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'center') NOT NULL,
  
  -- Bonus de stats (si type = 'stat')
  -- Format JSON: {"taijutsu": 5, "vitesse": 3}
  stat_bonus_json JSON NULL,
  
  -- Effet spécial (si type = 'notable' ou 'keystone')
  effect_code VARCHAR(100) NULL COMMENT 'Code interne pour appliquer l''effet',
  
  -- Prérequis : liste des node_id à débloquer avant
  -- Format JSON: ["tai_5_a", "tai_10_b"]
  requires_nodes_json JSON NULL,
  
  -- Visuels
  icon VARCHAR(10) NULL COMMENT 'Emoji ou classe CSS',
  color VARCHAR(20) NULL COMMENT 'Couleur pour les Keystones',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_stat_bonus_or_effect CHECK (
    (type = 'stat' AND stat_bonus_json IS NOT NULL) OR
    (type IN ('notable', 'keystone') AND effect_code IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour recherches et filtres
CREATE INDEX idx_talent_node_type ON talent_tree_nodes(type);
CREATE INDEX idx_talent_node_branch ON talent_tree_nodes(branch);
CREATE INDEX idx_talent_node_position ON talent_tree_nodes(position_x, position_y);

-- Talents débloqués par chaque joueur
CREATE TABLE IF NOT EXISTS user_talents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_talents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_talents_node FOREIGN KEY (node_id) REFERENCES talent_tree_nodes(node_id) ON DELETE CASCADE,
  CONSTRAINT uq_user_talent UNIQUE (user_id, node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour calcul rapide des stats
CREATE INDEX idx_user_talents_user ON user_talents(user_id);

-- Historique des respecs (réinitialisation de l'arbre)
CREATE TABLE IF NOT EXISTS user_talent_respec_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  
  respec_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Coût du respec (0 si gratuit)
  cost_ryos INT UNSIGNED NOT NULL DEFAULT 0,
  cost_dust INT UNSIGNED NOT NULL DEFAULT 0,
  
  -- Nombre de points réinitialisés
  points_refunded INT UNSIGNED NOT NULL,
  
  CONSTRAINT fk_respec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index pour statistiques et limites
CREATE INDEX idx_respec_history_user_date ON user_talent_respec_history(user_id, respec_at);
