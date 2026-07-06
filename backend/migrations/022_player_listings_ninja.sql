-- Marché P2P V2 : annonces ninjas banc

ALTER TABLE player_listings DROP FOREIGN KEY fk_pl_user_item;

ALTER TABLE player_listings
  MODIFY listing_type ENUM('item', 'ninja') NOT NULL DEFAULT 'item',
  MODIFY user_item_id INT UNSIGNED NULL,
  ADD COLUMN ninja_id INT UNSIGNED NULL AFTER user_item_id;

ALTER TABLE player_listings
  ADD CONSTRAINT fk_pl_user_item FOREIGN KEY (user_item_id) REFERENCES user_items(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_pl_ninja FOREIGN KEY (ninja_id) REFERENCES ninjas(id) ON DELETE CASCADE;

CREATE INDEX idx_player_listings_ninja ON player_listings (ninja_id, status);
