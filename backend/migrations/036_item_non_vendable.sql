-- Objets non revendables sur le marché entre joueurs

ALTER TABLE item_definitions
  ADD COLUMN non_vendable BOOLEAN NOT NULL DEFAULT FALSE AFTER promo_eligible;

UPDATE item_definitions SET non_vendable = TRUE WHERE slug IN (
  'sceau-chakra',
  'carte-secteur',
  'pansement-terrain',
  'kit-materiel-medical',
  'parchemin-jutsu-interdit'
);
