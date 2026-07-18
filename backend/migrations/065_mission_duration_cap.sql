-- Missions : durée par rang (plus de résolution unique H72) + cap global de slots
-- Supprime les uniques « 1 par rang / 1 par ninja et par cycle » pour autoriser
-- plusieurs envois du même rang et le recyclage d'un ninja après résolution.

ALTER TABLE idle_missions
  DROP INDEX uq_mission_ninja_cycle,
  DROP INDEX uq_mission_user_cycle_tier;

ALTER TABLE idle_missions
  ADD INDEX idx_mission_user_active (user_id, status),
  ADD INDEX idx_mission_ninja_active (ninja_id, status),
  ADD INDEX idx_mission_resolve (cycle_start_at, status, resolves_at_hour);
