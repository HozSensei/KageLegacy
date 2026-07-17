-- Vague S1 — mur de ligue (saison entière, pagination, sans quota)

CREATE TABLE IF NOT EXISTS pool_wall_posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pool_id INT UNSIGNED NOT NULL,
  season_number INT UNSIGNED NOT NULL,
  author_user_id INT UNSIGNED NOT NULL,
  body VARCHAR(280) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_wall_page (pool_id, season_number, id),
  CONSTRAINT fk_wall_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_wall_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
