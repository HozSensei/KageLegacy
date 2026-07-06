-- Magasin du village V2 : stocks limités + promos

ALTER TABLE item_definitions
  ADD COLUMN default_stock TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER price,
  ADD COLUMN promo_eligible BOOLEAN NOT NULL DEFAULT TRUE AFTER default_stock;

UPDATE item_definitions SET default_stock = 2 WHERE category = 'bureau';
UPDATE item_definitions SET default_stock = 2 WHERE category = 'match';
UPDATE item_definitions SET default_stock = 1 WHERE category = 'cycle';

CREATE TABLE IF NOT EXISTS village_shop_stock (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  restock_period INT UNSIGNED NOT NULL COMMENT 'floor((pool_cycle-1)/RESTOCK_EVERY)',
  item_definition_id INT UNSIGNED NOT NULL,
  stock_initial TINYINT UNSIGNED NOT NULL,
  stock_remaining TINYINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_vss_user_period_item (user_id, restock_period, item_definition_id),
  CONSTRAINT fk_vss_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vss_item FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS village_shop_promos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  cycle_start_at TIMESTAMP NOT NULL,
  item_definition_id INT UNSIGNED NOT NULL,
  discount_pct TINYINT UNSIGNED NOT NULL DEFAULT 20,
  UNIQUE KEY uq_vsp_user_cycle_item (user_id, cycle_start_at, item_definition_id),
  CONSTRAINT fk_vsp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vsp_item FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
