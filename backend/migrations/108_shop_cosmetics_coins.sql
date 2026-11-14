-- Kage Legacy V2 — Shop élargi : cosmétiques + packs Kage Coins + loadout profil
-- Étend user_cosmetics (BP) et ajoute catalogue d'équipement shop.

ALTER TABLE user_cosmetics
  MODIFY COLUMN cosmetic_type ENUM(
    'avatar',
    'card_back',
    'emote',
    'card_effect',
    'avatar_frame',
    'title'
  ) NOT NULL;

CREATE TABLE IF NOT EXISTS user_cosmetic_loadout (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  avatar_frame_key VARCHAR(100) NULL,
  card_back_key VARCHAR(100) NULL,
  title_key VARCHAR(100) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ucl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shop_coin_pack_purchases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pack_id VARCHAR(50) NOT NULL,
  coins_granted INT UNSIGNED NOT NULL,
  method ENUM('stub', 'stripe') NOT NULL DEFAULT 'stub',
  stripe_session_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_scp_user (user_id),
  INDEX idx_scp_pack (pack_id),
  UNIQUE KEY uq_scp_stripe_session (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
