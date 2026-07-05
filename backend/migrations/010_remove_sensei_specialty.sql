-- Suppression de la spécialité fixe du Jonin-Sensei (choix trop déterminant en début de partie).
-- Le focus d'entraînement (training_focus) reste le levier tactique du dojo.

ALTER TABLE sensei DROP COLUMN specialty;
