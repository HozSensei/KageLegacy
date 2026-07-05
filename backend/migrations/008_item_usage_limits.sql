-- Limites d'utilisation par match (affichage + cohérence catalogue)

UPDATE item_definitions SET
  description_fr = 'Consigne Offensive : +2 Ninjutsu en attaque ninjutsu (3 activations max par match).',
  description_en = 'Offensive orders: +2 Ninjutsu on ninjutsu attacks (3 activations max per match).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'ninjutsu', 'bonus', 2, 'maxUsesPerMatch', 3,
        'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'ninjutsu'))
    )
  )
WHERE slug = 'lame-chakra';

UPDATE item_definitions SET
  description_fr = 'Consigne Offensive : +2 Taijutsu au corps à corps (3 activations max par match).',
  description_en = 'Offensive orders: +2 Taijutsu in melee (3 activations max per match).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'taijutsu', 'bonus', 2, 'maxUsesPerMatch', 3,
        'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'taijutsu'))
    )
  )
WHERE slug = 'kunai-renforcee';

UPDATE item_definitions SET
  description_fr = 'Genjutsu uniquement : +1 à l''assaut (2 activations max par match).',
  description_en = 'Genjutsu only: +1 on assault (2 activations max per match).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'genjutsu', 'bonus', 1, 'maxUsesPerMatch', 2,
        'when', JSON_OBJECT('technique', 'genjutsu'))
    )
  )
WHERE slug = 'masque-illusion';

UPDATE item_definitions SET
  description_fr = 'Consigne Tank : +15 PV au début du match (1 fois).',
  description_en = 'Tank orders: +15 HP at match start (once).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'pv', 'bonus', 15, 'maxUsesPerMatch', 1, 'when', JSON_OBJECT('strategy', 'Tank'))
    )
  )
WHERE slug = 'gilet-mailles';

UPDATE item_definitions SET
  description_fr = 'Anti-Katon : +2 défense vs Ninjutsu Katon (2 fois par match).',
  description_en = 'Anti-Katon: +2 defense vs Katon ninjutsu (2 times per match).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'element_resist', 'element', 'Katon', 'bonus', 2, 'maxUsesPerMatch', 2)
    )
  )
WHERE slug = 'gants-pare-feu';

UPDATE item_definitions SET
  description_fr = 'Consigne Protect : +1 Genjutsu en défense (3 fois par match).',
  description_en = 'Protect orders: +1 Genjutsu when defending (3 times per match).',
  effects = JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'defense', 'stat', 'genjutsu', 'bonus', 1, 'maxUsesPerMatch', 3,
        'when', JSON_OBJECT('strategy', 'Protect'))
    )
  )
WHERE slug = 'bandeau-focus';

UPDATE item_definitions SET
  description_fr = 'Usage unique par match : +15 Chakra si réserve < 12 % (objet détruit après).',
  description_en = 'Once per match: +15 Chakra if reserves < 12% (item destroyed after).',
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'chakra_below_pct', 'threshold', 12, 'chakraRestore', 15, 'usesPerMatch', 1)
  )
WHERE slug = 'pilule-soldat';

UPDATE item_definitions SET
  description_fr = 'Usage unique par match : +18 PV si santé < 15 % (objet détruit après).',
  description_en = 'Once per match: +18 HP if health < 15% (item destroyed after).',
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'pv_below_pct', 'threshold', 15, 'pvRestore', 18, 'usesPerMatch', 1)
  )
WHERE slug = 'herbes-soin';

UPDATE item_definitions SET
  description_fr = 'Usage unique par match : +2 Vitesse au tour 1, sauf consigne Tank (détruit après).',
  description_en = 'Once per match: +2 Speed round 1, except Tank orders (destroyed after).',
  effects = JSON_OBJECT(
    'consumable', JSON_OBJECT(
      'trigger', 'match_start',
      'firstTourSpeedBonus', 2,
      'usesPerMatch', 1,
      'when', JSON_OBJECT('strategyNot', 'Tank')
    )
  )
WHERE slug = 'parchemin-fumee';
