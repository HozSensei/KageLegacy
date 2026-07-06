-- Académie : un seul tirage aléatoire par cycle (pas de choix entre candidats)

RENAME TABLE recruitment_offers TO academy_draws;

DELETE ad1 FROM academy_draws ad1
INNER JOIN academy_draws ad2
  ON ad1.user_id = ad2.user_id
  AND ad1.cycle_start_at = ad2.cycle_start_at
  AND ad1.slot_index > ad2.slot_index;

ALTER TABLE academy_draws
  DROP INDEX uq_recruitment_user_cycle_slot,
  DROP COLUMN slot_index,
  ADD UNIQUE KEY uq_academy_user_cycle (user_id, cycle_start_at);
