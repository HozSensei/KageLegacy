-- Segments narratifs : clés i18n pour traduction à la lecture (chronique partagée)

ALTER TABLE match_narrative_segments
  ADD COLUMN template_key VARCHAR(191) NULL AFTER text,
  ADD COLUMN template_index SMALLINT UNSIGNED NULL AFTER template_key,
  ADD COLUMN template_vars JSON NULL AFTER template_index;
