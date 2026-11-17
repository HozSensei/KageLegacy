-- Keep an intentionally reset account from receiving the starter collection again.
ALTER TABLE users
  ADD COLUMN starter_loadout_reset_at TIMESTAMP NULL DEFAULT NULL;
