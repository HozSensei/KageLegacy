-- Entraînement opt-in par ninja (remplace le focus dojo global)

ALTER TABLE ninjas
  ADD COLUMN training_focus ENUM(
    'Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medecine', 'Vitesse', 'Intelligence'
  ) NULL DEFAULT NULL
  AFTER training_buff;
