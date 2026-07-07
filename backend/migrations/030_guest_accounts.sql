-- Comptes invité (essai 7 jours) + conversion email

ALTER TABLE users
  ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT FALSE AFTER is_bot,
  ADD COLUMN guest_expires_at TIMESTAMP NULL AFTER is_guest,
  ADD COLUMN email VARCHAR(255) NULL AFTER username;
