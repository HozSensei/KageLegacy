-- Marché P2P global : pool_id optionnel + notifications vente

ALTER TABLE player_listings
  MODIFY pool_id INT UNSIGNED NULL;

CREATE INDEX idx_player_listings_active ON player_listings (status, created_at);

ALTER TABLE dojo_notifications
  MODIFY kind ENUM('bird_flight', 'market_sale') NOT NULL;
