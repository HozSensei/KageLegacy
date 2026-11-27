-- MySQL 8.0 operational upgrade. Select the existing Kagekuni database first.
-- Stop application writers and take a backup before running this file.
-- Keep existing ENUM ordinals by appending the new value, not prepending it.
-- All schema changes are in one atomic DDL statement; the column check permits a retry.
SET @upgrade_character_profile_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'player_profiles'
      AND column_name = 'character_highest_level'
  ),
  'DO 0',
  'ALTER TABLE `player_profiles`
     ADD COLUMN `character_avatar_id` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT ''aspirant-1-1'' AFTER `character_avatar_url`,
     ADD COLUMN `character_background_id` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER `character_avatar_id`,
     ADD COLUMN `character_nickname_id` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER `character_background_id`,
     ADD COLUMN `character_highest_level` int unsigned NOT NULL DEFAULT ''1'' AFTER `character_level`,
     MODIFY COLUMN `character_rank` enum(''Genin'',''Chunin'',''Jonin'',''ANBU'',''Kage'',''Aspirant ninja'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Aspirant ninja'''
);
PREPARE upgrade_character_profile_stmt FROM @upgrade_character_profile_ddl;
EXECUTE upgrade_character_profile_stmt;
DEALLOCATE PREPARE upgrade_character_profile_stmt;
SET @upgrade_character_profile_ddl = NULL;

-- Retrait idempotent des anciennes colonnes de couleur (si encore présentes).
SET @drop_border_color_ddl = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'player_profiles'
      AND column_name = 'character_border_color'
  ),
  'ALTER TABLE `player_profiles` DROP COLUMN `character_border_color`',
  'DO 0'
);
PREPARE drop_border_color_stmt FROM @drop_border_color_ddl;
EXECUTE drop_border_color_stmt;
DEALLOCATE PREPARE drop_border_color_stmt;
SET @drop_border_color_ddl = NULL;

-- character_background_color est conservé (teinte du fond uni / « par défaut »).

START TRANSACTION;
UPDATE `player_profiles`
SET `character_highest_level` = `character_level`
WHERE `character_name` IS NOT NULL AND `character_highest_level` < `character_level`;

UPDATE `player_profiles`
SET `character_rank` = 'Aspirant ninja'
WHERE `character_rank` = 'Genin'
  AND (`character_level` < 5 OR `character_name` IS NULL);
COMMIT;
