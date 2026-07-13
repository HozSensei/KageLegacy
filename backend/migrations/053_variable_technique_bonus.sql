-- Bonus % variable par instance de carte + stats secondaires vitesse / intelligence

ALTER TABLE tactic_card_definitions
  MODIFY pli_secondary_stat ENUM(
    'taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'
  ) NULL,
  ADD COLUMN pli_bonus_min DECIMAL(5, 4) NOT NULL DEFAULT 0.0100 AFTER pli_secondary_stat,
  ADD COLUMN pli_bonus_max DECIMAL(5, 4) NOT NULL DEFAULT 0.2000 AFTER pli_bonus_min;

UPDATE tactic_card_definitions
SET pli_bonus_min = pli_bonus_pct, pli_bonus_max = pli_bonus_pct;

ALTER TABLE user_tactic_cards
  ADD COLUMN pli_bonus_pct DECIMAL(5, 4) NULL COMMENT 'Bonus % tiré à l''acquisition' AFTER charges_remaining;

-- Communes génériques : 1–20 %
UPDATE tactic_card_definitions
SET pli_bonus_min = 0.0100, pli_bonus_max = 0.2000,
    description_fr = REPLACE(description_fr, '+15 %', 'bonus variable 1–20 %'),
    description_en = REPLACE(description_en, '+15%', 'variable 1–20% bonus')
WHERE slug IN ('tai-lame-chakras', 'nin-afflux-chakra', 'gen-mirage-simple', 'med-paume-mystique');

UPDATE tactic_card_definitions
SET pli_bonus_min = 0.0100, pli_bonus_max = 0.2000,
    description_fr = REPLACE(description_fr, '+18 %', 'bonus variable 1–20 %'),
    description_en = REPLACE(description_en, '+18%', 'variable 1–20% bonus')
WHERE slug = 'tai-coup-poing-leon';

-- Communes avec synergie / dual-stat : 5–25 %
UPDATE tactic_card_definitions
SET pli_bonus_min = 0.0500, pli_bonus_max = 0.2500
WHERE slug IN (
  'tai-lame-suiton', 'nin-katon-boule', 'nin-raiton-eclair', 'nin-futon-lame',
  'med-scalpel-chakra', 'med-antidote-choc', 'tai-rotation-poings', 'gen-brume-mentale'
);

-- Rares : 15–35 %
UPDATE tactic_card_definitions
SET pli_bonus_min = 0.1500, pli_bonus_max = 0.3500
WHERE rarity = 'rare';

-- Légendaires : 30–50 %
UPDATE tactic_card_definitions
SET pli_bonus_min = 0.3000, pli_bonus_max = 0.5000
WHERE rarity = 'legendary';

-- Stats secondaires vitesse / intelligence (exemples)
UPDATE tactic_card_definitions SET pli_secondary_stat = 'vitesse' WHERE slug = 'tai-coup-poing-leon';
UPDATE tactic_card_definitions SET pli_secondary_stat = 'intelligence' WHERE slug IN ('nin-afflux-chakra', 'gen-mirage-simple');
UPDATE tactic_card_definitions SET pli_secondary_stat = 'vitesse' WHERE slug = 'nin-raiton-eclair';
UPDATE tactic_card_definitions SET pli_secondary_stat = 'intelligence' WHERE slug = 'gen-brume-mentale';

-- Tirage rétroactif pour cartes déjà possédées (entier % inclusif)
UPDATE user_tactic_cards utc
JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
SET utc.pli_bonus_pct = (
  FLOOR(
    tcd.pli_bonus_min * 100
    + RAND() * (tcd.pli_bonus_max * 100 - tcd.pli_bonus_min * 100 + 1)
  ) / 100
)
WHERE utc.pli_bonus_pct IS NULL;

ALTER TABLE tactic_card_definitions DROP COLUMN pli_bonus_pct;
