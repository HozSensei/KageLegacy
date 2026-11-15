-- Kage Legacy V2 — Factions (3 pays) + index leaderboard
-- Noms repris des villages C0 renommés (leaf/sand/mist → Midorihara/Kareno/Oborohama).
-- Ishikura (stone) volontairement hors des 3 factions jouables V2.

ALTER TABLE player_character
  ADD COLUMN faction_id ENUM('midorihara', 'kareno', 'oborohama') NULL
    COMMENT 'Faction jouable (pays) — identité cosmétique, sans bonus combat'
    AFTER specialization,
  ADD COLUMN faction_retake_used TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Un seul changement de faction autorisé'
    AFTER faction_id;

CREATE INDEX idx_player_faction ON player_character(faction_id);
CREATE INDEX idx_player_level_xp ON player_character(level DESC, xp DESC);
