-- Objets anti-environnement (Marché Noir)

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects)
VALUES
(
  'cape-impermeable',
  'cycle',
  'Cape imperméable',
  'Rain Cape',
  'Annule le malus pluie sur le Ninjutsu de ce ninja pour le match du cycle.',
  'Negates rain Ninjutsu penalty for this ninja this cycle.',
  850,
  JSON_OBJECT('cycle', JSON_OBJECT('trigger', 'environment_counter', 'counter', 'pluie'))
),
(
  'torche-signalisation',
  'cycle',
  'Torche de signalisation',
  'Signal Torch',
  'Annule le malus brouillard sur l''initiative de ce ninja.',
  'Negates fog initiative penalty for this ninja.',
  800,
  JSON_OBJECT('cycle', JSON_OBJECT('trigger', 'environment_counter', 'counter', 'brouillard'))
),
(
  'sandales-canyon',
  'cycle',
  'Sandales de canyon',
  'Canyon Sandals',
  'Annule le bonus défensif du terrain en falaises pour les adversaires contre ce ninja.',
  'Negates cliff defense bonus against this ninja.',
  750,
  JSON_OBJECT('cycle', JSON_OBJECT('trigger', 'environment_counter', 'counter', 'falaises'))
),
(
  'carte-secteur',
  'bureau',
  'Carte du secteur',
  'Sector Map',
  'Affiche la météo ou topologie confirmée au prochain rapport d''espionnage (H36). Usage unique.',
  'Shows confirmed weather/topology in the next scout report (H36). Single use.',
  400,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'scout_map'))
);
