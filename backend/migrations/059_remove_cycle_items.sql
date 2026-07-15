-- Retrait des objets cycle : boost d'entraînement → bureau, suppression de l'équipement cycle

DELETE FROM ninja_equipment;

DELETE pl FROM player_listings pl
INNER JOIN user_items ui ON ui.id = pl.user_item_id
INNER JOIN item_definitions idf ON idf.id = ui.item_definition_id
WHERE idf.category = 'cycle';

DELETE mo FROM market_offers mo
INNER JOIN item_definitions idf ON idf.id = mo.item_definition_id
WHERE idf.category = 'cycle';

DELETE vss FROM village_shop_stock vss
INNER JOIN item_definitions idf ON idf.id = vss.item_definition_id
WHERE idf.category = 'cycle';

DELETE vsp FROM village_shop_promos vsp
INNER JOIN item_definitions idf ON idf.id = vsp.item_definition_id
WHERE idf.category = 'cycle';

UPDATE item_definitions
SET
  category = 'bureau',
  description_fr = 'Bonus +20 % sur le prochain entraînement de ce ninja (préparation ou global).',
  description_en = '+20% bonus on this ninja''s next training session (preparation or global).',
  effects = JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'training_boost', 'multiplier', 1.2))
WHERE slug = 'poids-entrainement';

DELETE ui FROM user_items ui
INNER JOIN item_definitions idf ON idf.id = ui.item_definition_id
WHERE idf.slug IN ('ration-combat', 'cape-impermeable', 'torche-signalisation', 'sandales-canyon');

DELETE FROM item_definitions
WHERE slug IN ('ration-combat', 'cape-impermeable', 'torche-signalisation', 'sandales-canyon');

DROP TABLE IF EXISTS ninja_equipment;

ALTER TABLE item_definitions
  MODIFY category ENUM('bureau') NOT NULL;
