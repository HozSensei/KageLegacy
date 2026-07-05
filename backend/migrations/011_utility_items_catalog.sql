-- Pivot M4 : catalogue utilitaires uniquement (bureau / match / cycle)

DELETE FROM ninja_equipment;
DELETE FROM market_offers;
UPDATE user_items SET consumed = TRUE WHERE consumed = FALSE;

ALTER TABLE item_definitions MODIFY category VARCHAR(20) NOT NULL;
DELETE FROM item_definitions;

ALTER TABLE item_definitions
  MODIFY category ENUM('bureau', 'match', 'cycle') NOT NULL;

ALTER TABLE ninja_equipment
  MODIFY slot ENUM('match', 'cycle') NOT NULL;

ALTER TABLE ninjas
  ADD COLUMN training_buff VARCHAR(32) NULL AFTER training_residual;

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects) VALUES
(
  'pilule-recuperation',
  'bureau',
  'Pilule de récupération',
  'Recovery Pill',
  'Remonte la Forme d''un ninja d''un palier (ex. Lamentable → Passable).',
  'Raises a ninja''s Form by one tier (e.g. Lamentable → Passable).',
  400,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'forme_upgrade'))
),
(
  'livre-strategie',
  'bureau',
  'Livre de stratégie',
  'Strategy Book',
  'Prochain entraînement : bonus et moindre risque d''annulation par le trait Fainéant.',
  'Next training session: bonus and lower chance of skipping due to Lazy trait.',
  350,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'strategy_book'))
),
(
  'bandage-rapide',
  'bureau',
  'Bandage rapide',
  'Quick Bandage',
  'Soigne 15 % des PV max hors match (entre deux cycles).',
  'Heals 15% of max HP between cycles (out of match).',
  300,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'pv_heal_pct', 'percent', 15))
),
(
  'fumigene-secours',
  'match',
  'Fumigène de secours',
  'Emergency Smoke Bomb',
  'Si un coup fatal survit à l''interception Sensei : dégâts −50 %, objet détruit.',
  'If a fatal blow survives Sensei interception: −50% damage, item destroyed.',
  550,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'lethal_mitigation', 'damageReduction', 0.5, 'usesPerMatch', 1))
),
(
  'parchemin-rupture',
  'match',
  'Parchemin de rupture',
  'Rupture Scroll',
  'Contre un Genjutsu adverse : +4 au jet de dissipation. 1× / match.',
  'Against enemy Genjutsu: +4 to dispel roll. Once per match.',
  600,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'genjutsu_defense', 'bonus', 4, 'usesPerMatch', 1))
),
(
  'herbes-apaisantes',
  'match',
  'Herbes apaisantes',
  'Soothing Herbs',
  'Si PV < 20 % en match : +15 PV. Auto, 1× / match.',
  'If HP < 20% in match: +15 HP. Auto, once per match.',
  500,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'pv_below_pct', 'threshold', 20, 'pvRestore', 15, 'usesPerMatch', 1))
),
(
  'cachet-chakra',
  'match',
  'Cachet de chakra',
  'Chakra Seal',
  'Si Chakra < 15 % en match : +12 Chakra. Auto, 1× / match.',
  'If Chakra < 15% in match: +12 Chakra. Auto, once per match.',
  500,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'chakra_below_pct', 'threshold', 15, 'chakraRestore', 12, 'usesPerMatch', 1))
),
(
  'parchemin-leurre',
  'match',
  'Parchemin de leurre',
  'Decoy Scroll',
  '1× : si ciblé, 30 % de chance de rediriger vers un autre allié.',
  'Once: if targeted, 30% chance to redirect to another ally.',
  550,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'on_targeted', 'redirectChance', 30, 'usesPerMatch', 1))
),
(
  'poids-entrainement',
  'cycle',
  'Poids d''entraînement',
  'Training Weights',
  '−2 Vitesse en match · +20 % gains d''entraînement à la fin du cycle.',
  '−2 Speed in match · +20% training gains at cycle end.',
  900,
  JSON_OBJECT('cycle', JSON_OBJECT('trigger', 'training_boost', 'multiplier', 1.2, 'speedPenalty', 2))
),
(
  'ration-combat',
  'cycle',
  'Ration de combat',
  'Combat Ration',
  '−10 % coût salaire de ce ninja au prélèvement H72.',
  '−10% salary cost for this ninja at H72 payroll.',
  750,
  JSON_OBJECT('cycle', JSON_OBJECT('trigger', 'salary_discount', 'percent', 10))
);
