-- 5 charges par carte technique (usage chaque cycle) + contrainte mise à jour

ALTER TABLE user_tactic_cards DROP CHECK chk_utc_charges;

ALTER TABLE user_tactic_cards
  MODIFY charges_remaining TINYINT UNSIGNED NOT NULL DEFAULT 5;

ALTER TABLE user_tactic_cards
  ADD CONSTRAINT chk_utc_charges CHECK (charges_remaining BETWEEN 0 AND 5);

UPDATE user_tactic_cards SET charges_remaining = 5 WHERE charges_remaining > 0;
