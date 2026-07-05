-- Protect : cible alliée désignée

ALTER TABLE ninjas
  ADD COLUMN protect_target_ninja_id INT UNSIGNED NULL AFTER battle_strategy;
