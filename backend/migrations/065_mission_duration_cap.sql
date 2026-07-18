-- Missions : durée par rang (plus de résolution unique H72) + cap global de slots
-- Supprime les uniques « 1 par rang / 1 par ninja et par cycle » pour autoriser
-- plusieurs envois du même rang et le recyclage d'un ninja après résolution.
--
-- Les uniques servaient aussi d'index aux FK InnoDB : il faut les dropper
-- après avoir retiré les contraintes, puis recréer des index non uniques + FK.

ALTER TABLE idle_missions
  DROP FOREIGN KEY fk_im_ninja,
  DROP FOREIGN KEY fk_im_user;

ALTER TABLE idle_missions
  DROP INDEX uq_mission_ninja_cycle,
  DROP INDEX uq_mission_user_cycle_tier;

ALTER TABLE idle_missions
  ADD INDEX idx_mission_user_active (user_id, status),
  ADD INDEX idx_mission_ninja_active (ninja_id, status),
  ADD INDEX idx_mission_resolve (cycle_start_at, status, resolves_at_hour),
  ADD CONSTRAINT fk_im_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_im_ninja FOREIGN KEY (ninja_id) REFERENCES ninjas(id) ON DELETE CASCADE;
