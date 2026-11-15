-- Stripe Checkout — idempotence achats Battle Pass Premium

CREATE TABLE IF NOT EXISTS battle_pass_stripe_purchases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  season_id INT UNSIGNED NOT NULL,
  stripe_session_id VARCHAR(255) NOT NULL,
  amount_eur_cents INT UNSIGNED NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bps_season FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  UNIQUE KEY uq_bps_stripe_session (stripe_session_id),
  INDEX idx_bps_user (user_id),
  INDEX idx_bps_season (season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
