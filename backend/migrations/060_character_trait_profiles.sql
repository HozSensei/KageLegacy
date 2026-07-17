-- Profils de caractère : boost d'une stat (+1/+2), possibilité sans profil.
-- Remplace Egoiste / Altruiste / Faineant / Temeraire / Discipline.

ALTER TABLE ninjas
  ADD COLUMN trait_boost TINYINT UNSIGNED NULL
    COMMENT '1 ou 2 si profil actif, NULL si sans profil'
    AFTER character_trait;

-- Passage temporaire en VARCHAR pour migrer les valeurs ENUM.
ALTER TABLE ninjas
  MODIFY COLUMN character_trait VARCHAR(32) NULL;

UPDATE ninjas
SET
  character_trait = CASE character_trait
    WHEN 'Egoiste' THEN 'Brute'
    WHEN 'Altruiste' THEN 'Guerisseur'
    WHEN 'Temeraire' THEN 'Veloce'
    WHEN 'Discipline' THEN 'Stratege'
    WHEN 'Faineant' THEN NULL
    ELSE character_trait
  END,
  trait_boost = CASE
    WHEN character_trait IN ('Egoiste', 'Altruiste', 'Temeraire', 'Discipline')
      THEN IF(RAND() < 0.3, 2, 1)
    ELSE NULL
  END;

-- Appliquer le boost une fois sur la stat liée (plafonds grade approximatifs).
UPDATE ninjas
SET taijutsu = LEAST(
  taijutsu + trait_boost,
  CASE grade WHEN 'Genin' THEN 12 WHEN 'Chunin' THEN 18 ELSE 20 END
)
WHERE character_trait = 'Brute' AND trait_boost IS NOT NULL;

UPDATE ninjas
SET ninjutsu = LEAST(
  ninjutsu + trait_boost,
  CASE grade WHEN 'Genin' THEN 12 WHEN 'Chunin' THEN 18 ELSE 20 END
)
WHERE character_trait = 'Canaliseur' AND trait_boost IS NOT NULL;

UPDATE ninjas
SET genjutsu = LEAST(
  genjutsu + trait_boost,
  CASE grade WHEN 'Genin' THEN 12 WHEN 'Chunin' THEN 18 ELSE 20 END
)
WHERE character_trait = 'Illusionniste' AND trait_boost IS NOT NULL;

UPDATE ninjas
SET medecine = LEAST(
  medecine + trait_boost,
  CASE grade WHEN 'Genin' THEN 12 WHEN 'Chunin' THEN 18 ELSE 20 END
)
WHERE character_trait = 'Guerisseur' AND trait_boost IS NOT NULL;

UPDATE ninjas
SET vitesse = LEAST(
  vitesse + trait_boost,
  CASE grade WHEN 'Genin' THEN 10 WHEN 'Chunin' THEN 16 ELSE 20 END
)
WHERE character_trait = 'Veloce' AND trait_boost IS NOT NULL;

UPDATE ninjas
SET intelligence = LEAST(
  intelligence + trait_boost,
  CASE grade WHEN 'Genin' THEN 10 WHEN 'Chunin' THEN 16 ELSE 20 END
)
WHERE character_trait = 'Stratege' AND trait_boost IS NOT NULL;

ALTER TABLE ninjas
  MODIFY COLUMN character_trait ENUM(
    'Brute',
    'Canaliseur',
    'Illusionniste',
    'Guerisseur',
    'Veloce',
    'Stratege'
  ) NULL;
