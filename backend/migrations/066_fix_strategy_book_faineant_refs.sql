-- Le trait Faineant n'existe plus (migration 060 → profils Brute/…).
-- Le Livre de stratégie ne réduit plus un risque d'annulation : buff +15 % uniquement.

UPDATE item_definitions
SET
  description_fr = 'Prochain entraînement : +15 % de gains (préparation).',
  description_en = 'Next training session: +15% gains (preparation).'
WHERE slug = 'livre-strategie';
