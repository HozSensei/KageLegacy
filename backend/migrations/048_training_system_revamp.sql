-- Refonte entraînement : préparation (actifs) + entraînement global, types groupés, grâce stagnation

ALTER TABLE sensei
  ADD COLUMN global_training_type ENUM(
    'Chakra', 'Physique', 'Medical', 'Genjutsu', 'Ninjutsu', 'Equilibre'
  ) NULL DEFAULT NULL AFTER training_focus;

ALTER TABLE ninjas
  ADD COLUMN preparation_type VARCHAR(32) NULL AFTER training_buff,
  ADD COLUMN stagnant_cycles TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER preparation_type,
  ADD COLUMN stat_residuals JSON NULL AFTER stagnant_cycles;

UPDATE ninjas SET preparation_type = CASE training_focus
  WHEN 'Taijutsu' THEN 'Physique'
  WHEN 'Ninjutsu' THEN 'Ninjutsu'
  WHEN 'Genjutsu' THEN 'Genjutsu'
  WHEN 'Medecine' THEN 'Medical'
  WHEN 'Vitesse' THEN 'Physique'
  WHEN 'Intelligence' THEN 'Chakra'
  ELSE NULL
END
WHERE training_focus IS NOT NULL;

UPDATE ninjas SET preparation_type = NULL WHERE squad_position IS NULL;

ALTER TABLE ninjas
  MODIFY COLUMN preparation_type ENUM(
    'Chakra', 'Physique', 'Medical', 'Genjutsu', 'Ninjutsu', 'Equilibre'
  ) NULL DEFAULT NULL;

ALTER TABLE ninjas DROP COLUMN training_focus;
