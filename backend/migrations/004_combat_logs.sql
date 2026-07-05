-- Milestone 5/6 : logs de combat et chronique

ALTER TABLE matches
  ADD COLUMN combat_log JSON NULL AFTER results_applied_at,
  ADD COLUMN reveal_start_at TIMESTAMP NULL AFTER combat_log,
  ADD COLUMN ending_reveal_at TIMESTAMP NULL AFTER reveal_start_at;
