-- Objets butin / rituel (prix catalogue 0) : hors magasin du village

UPDATE item_definitions
SET promo_eligible = FALSE,
    default_stock = 0
WHERE price <= 0;

DELETE vss FROM village_shop_stock vss
JOIN item_definitions idf ON idf.id = vss.item_definition_id
WHERE idf.price <= 0;

DELETE vsp FROM village_shop_promos vsp
JOIN item_definitions idf ON idf.id = vsp.item_definition_id
WHERE idf.price <= 0;

UPDATE village_shop_promos SET discount_pct = 50 WHERE discount_pct < 50;
