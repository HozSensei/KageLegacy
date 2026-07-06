-- Marché entre joueurs (annonces P2P dans le pool)

CREATE TABLE IF NOT EXISTS player_listings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pool_id INT UNSIGNED NOT NULL,
  seller_user_id INT UNSIGNED NOT NULL,
  listing_type ENUM('item') NOT NULL DEFAULT 'item',
  user_item_id INT UNSIGNED NOT NULL,
  price INT UNSIGNED NOT NULL,
  status ENUM('active', 'sold', 'cancelled') NOT NULL DEFAULT 'active',
  buyer_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sold_at TIMESTAMP NULL,
  CONSTRAINT fk_pl_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_seller FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_buyer FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pl_user_item FOREIGN KEY (user_item_id) REFERENCES user_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_player_listings_pool_active ON player_listings (pool_id, status);
