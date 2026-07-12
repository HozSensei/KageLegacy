-- Drapeau admin par utilisateur (accès panneau /admin)
ALTER TABLE users
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE AFTER is_bot;
