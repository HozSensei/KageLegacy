-- Retrait des champs d'identité issus de l'ancien système, absents du TCG.

ALTER TABLE player_character
  DROP FOREIGN KEY fk_player_character_clan,
  DROP COLUMN clan_trait_id,
  DROP COLUMN specialization;
