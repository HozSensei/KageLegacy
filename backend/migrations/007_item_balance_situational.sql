-- Rééquilibrage objets : bonus situationnels, plafonds, pas de power creep plat

UPDATE item_definitions SET
  description_fr = 'Consigne Offensive uniquement : +2 Ninjutsu quand ce ninja attaque en ninjutsu.',
  description_en = 'Offensive orders only: +2 Ninjutsu when this ninja attacks with ninjutsu.',
  price = 1100,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'ninjutsu', 'bonus', 2, 'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'ninjutsu'))
    )
  )
WHERE slug = 'lame-chakra';

UPDATE item_definitions SET
  description_fr = 'Consigne Offensive uniquement : +2 Taijutsu sur les frappes corps à corps.',
  description_en = 'Offensive orders only: +2 Taijutsu on taijutsu strikes.',
  price = 850,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'taijutsu', 'bonus', 2, 'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'taijutsu'))
    )
  )
WHERE slug = 'kunai-renforcee';

UPDATE item_definitions SET
  description_fr = 'Techniques Genjutsu uniquement : +1 Genjutsu à l''assaut (piège mental ciblé).',
  description_en = 'Genjutsu techniques only: +1 Genjutsu on assault (targeted mental trap).',
  price = 950,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'genjutsu', 'bonus', 1, 'when', JSON_OBJECT('technique', 'genjutsu'))
    )
  )
WHERE slug = 'masque-illusion';

UPDATE item_definitions SET
  description_fr = 'Consigne Tank uniquement : +15 PV de match (aucun bonus hors rôle défensif).',
  description_en = 'Tank orders only: +15 match HP (no bonus outside defensive role).',
  price = 1200,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'pv', 'bonus', 15, 'when', JSON_OBJECT('strategy', 'Tank'))
    )
  )
WHERE slug = 'gilet-mailles';

UPDATE item_definitions SET
  slug = 'gants-pare-feu',
  name_fr = 'Gants pare-feu',
  name_en = 'Fireproof Gloves',
  description_fr = 'Réduit les dégâts subis via Ninjutsu Katon adverse (+2 en défense élémentaire).',
  description_en = 'Reduces damage taken from enemy Katon ninjutsu (+2 elemental defense).',
  price = 1050,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'element_resist', 'element', 'Katon', 'bonus', 2)
    )
  )
WHERE slug = 'brassards-doton';

UPDATE item_definitions SET
  description_fr = 'Consigne Protect uniquement : +1 Genjutsu en défense (couverture mentale).',
  description_en = 'Protect orders only: +1 Genjutsu when defending (mental cover).',
  price = 900,
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'defense', 'stat', 'genjutsu', 'bonus', 1, 'when', JSON_OBJECT('strategy', 'Protect'))
    )
  )
WHERE slug = 'bandeau-focus';

UPDATE item_definitions SET
  description_fr = 'Usage unique : +15 Chakra si la réserve tombe sous 12 % en match.',
  description_en = 'Single use: +15 Chakra if reserves drop below 12% in a match.',
  price = 550,
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'chakra_below_pct', 'threshold', 12, 'chakraRestore', 15)
  )
WHERE slug = 'pilule-soldat';

UPDATE item_definitions SET
  description_fr = 'Usage unique : +18 PV si les PV tombent sous 15 % en match.',
  description_en = 'Single use: +18 HP if health drops below 15% in a match.',
  price = 500,
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'pv_below_pct', 'threshold', 15, 'pvRestore', 18)
  )
WHERE slug = 'herbes-soin';

UPDATE item_definitions SET
  description_fr = 'Usage unique : +2 Vitesse au tour 1 (inefficace en consigne Tank).',
  description_en = 'Single use: +2 Speed on round 1 (no effect under Tank orders).',
  price = 450,
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT(
      'trigger', 'match_start',
      'firstTourSpeedBonus', 2,
      'when', JSON_OBJECT('strategyNot', 'Tank')
    )
  )
WHERE slug = 'parchemin-fumee';
