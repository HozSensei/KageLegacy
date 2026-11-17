-- Retrait des anciens modèles cosmétiques, non utilisés par l'application.
-- Aucun code applicatif ni FK entrante ne référence ces tables.

DROP TABLE IF EXISTS user_cosmetic_loadout;
DROP TABLE IF EXISTS user_cosmetics;
DROP TABLE IF EXISTS elite_banner_catalog;
