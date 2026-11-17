-- La progression du ninja est portée par l'unique profil joueur.
-- Les profils sans personnage restent sans personnage (character_name NULL).

ALTER TABLE player_profiles
  ADD COLUMN character_name VARCHAR(100) NULL AFTER display_name,
  ADD COLUMN character_avatar_url VARCHAR(255) NULL AFTER character_name,
  ADD COLUMN character_level INT UNSIGNED NOT NULL DEFAULT 1 AFTER character_avatar_url,
  ADD COLUMN character_xp INT UNSIGNED NOT NULL DEFAULT 0 AFTER character_level,
  ADD COLUMN character_rank ENUM('Genin', 'Chunin', 'Jonin', 'ANBU', 'Kage') NOT NULL DEFAULT 'Genin' AFTER character_xp,
  ADD COLUMN character_talent_points_available INT UNSIGNED NOT NULL DEFAULT 1 AFTER character_rank,
  ADD COLUMN character_element_affinity ENUM('Katon', 'Suiton', 'Raiton', 'Doton', 'Futon') NOT NULL DEFAULT 'Katon' AFTER character_talent_points_available,
  ADD COLUMN character_faction_id ENUM('midorihara', 'kareno', 'oborohama') NULL AFTER character_element_affinity,
  ADD COLUMN character_faction_retake_used TINYINT(1) NOT NULL DEFAULT 0 AFTER character_faction_id,
  ADD COLUMN character_created_at TIMESTAMP NULL DEFAULT NULL AFTER character_faction_retake_used,
  ADD COLUMN character_updated_at TIMESTAMP NULL DEFAULT NULL AFTER character_created_at;

INSERT INTO player_profiles (user_id, display_name, language)
SELECT character.user_id, character.name, 'fr'
FROM player_character character
LEFT JOIN player_profiles profile ON profile.user_id = character.user_id
WHERE profile.user_id IS NULL;

UPDATE player_profiles profile
JOIN player_character character ON character.user_id = profile.user_id
SET profile.character_name = character.name,
    profile.character_avatar_url = character.avatar_url,
    profile.character_level = character.level,
    profile.character_xp = character.xp,
    profile.character_rank = character.`rank`,
    profile.character_talent_points_available = character.talent_points_available,
    profile.character_element_affinity = character.element_affinity,
    profile.character_faction_id = character.faction_id,
    profile.character_faction_retake_used = character.faction_retake_used,
    profile.character_created_at = character.created_at,
    profile.character_updated_at = character.updated_at;

-- Email devient l'identifiant des nouveaux comptes. Normalise puis conserve la
-- première occurrence de chaque adresse historique avant d'en garantir l'unicité.
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;

UPDATE users duplicate_user
JOIN users retained_user
  ON LOWER(retained_user.email) = LOWER(duplicate_user.email)
 AND (
      (retained_user.password_hash IS NOT NULL AND duplicate_user.password_hash IS NULL)
      OR (
        (retained_user.password_hash IS NULL) = (duplicate_user.password_hash IS NULL)
        AND retained_user.id < duplicate_user.id
      )
    )
SET duplicate_user.email = NULL
WHERE duplicate_user.email IS NOT NULL;

CREATE UNIQUE INDEX uq_users_email ON users(email);

DROP TABLE player_character;

CREATE INDEX idx_profile_character_level
  ON player_profiles(character_level);
CREATE INDEX idx_profile_character_rank
  ON player_profiles(character_rank);
CREATE INDEX idx_profile_character_faction
  ON player_profiles(character_faction_id);
CREATE INDEX idx_profile_character_level_xp
  ON player_profiles(character_level DESC, character_xp DESC);
