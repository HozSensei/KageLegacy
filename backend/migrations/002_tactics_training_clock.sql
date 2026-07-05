-- M2/M3 : consignes de combat, entraînement, suivi des jobs de cycle

ALTER TABLE ninjas
  ADD COLUMN battle_strategy ENUM('Normal', 'Tank', 'Protect', 'Offensive') NOT NULL DEFAULT 'Normal' AFTER squad_position,
  ADD COLUMN chunin_exam_requested BOOLEAN NOT NULL DEFAULT FALSE AFTER battle_strategy,
  ADD COLUMN training_residual DECIMAL(4, 2) NOT NULL DEFAULT 0.00 AFTER moral;

ALTER TABLE sensei
  ADD COLUMN training_focus ENUM('Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence') NULL AFTER specialty;

UPDATE sensei SET training_focus = specialty WHERE training_focus IS NULL;

ALTER TABLE sensei
  MODIFY training_focus ENUM('Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence') NOT NULL DEFAULT 'Genjutsu';

ALTER TABLE game_clock
  ADD COLUMN last_tick_hour TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER cycle_start_at;

CREATE TABLE IF NOT EXISTS cycle_job_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_start_at TIMESTAMP NOT NULL,
  job_name ENUM('h36', 'h71', 'h72') NOT NULL,
  ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cycle_job (cycle_start_at, job_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
