-- Suppression des systèmes legacy : consignes, posture, cartes par ninja, objets match

DROP TABLE IF EXISTS ninja_tactic_cards;

DROP TABLE IF EXISTS operation_dossiers;

DELETE ne FROM ninja_equipment ne WHERE ne.slot = 'match';

DELETE pl FROM player_listings pl
INNER JOIN user_items ui ON ui.id = pl.user_item_id
INNER JOIN item_definitions idf ON idf.id = ui.item_definition_id
WHERE idf.category = 'match';

DELETE mo FROM market_offers mo
INNER JOIN item_definitions idf ON idf.id = mo.item_definition_id
WHERE idf.category = 'match';

DELETE vsp FROM village_shop_promos vsp
INNER JOIN item_definitions idf ON idf.id = vsp.item_definition_id
WHERE idf.category = 'match';

DELETE vss FROM village_shop_stock vss
INNER JOIN item_definitions idf ON idf.id = vss.item_definition_id
WHERE idf.category = 'match';

DELETE ui FROM user_items ui
INNER JOIN item_definitions idf ON idf.id = ui.item_definition_id
WHERE idf.category = 'match';

DELETE FROM item_definitions WHERE category = 'match';

ALTER TABLE ninjas
  DROP COLUMN protect_target_ninja_id,
  DROP COLUMN battle_strategy;

ALTER TABLE item_definitions
  MODIFY category ENUM('bureau', 'cycle') NOT NULL;

ALTER TABLE ninja_equipment
  MODIFY slot ENUM('cycle') NOT NULL;
