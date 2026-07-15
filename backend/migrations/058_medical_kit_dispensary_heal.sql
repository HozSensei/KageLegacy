-- Kit médical : soin dispensaire (Lamentable → Passable), pas un simple palier de forme

UPDATE item_definitions
SET effects = JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'dispensary_heal'))
WHERE slug = 'kit-materiel-medical';
