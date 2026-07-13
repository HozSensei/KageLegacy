-- Reformulation effets défensifs + rééquilibrage éléments (4 par nature, Katon à 3)

-- Barrière → Suiton (4e carte Suiton)
UPDATE tactic_card_definitions
SET
  name_fr = 'Barrière aqueuse',
  name_en = 'Water Barrier',
  element_affinity = 'Suiton',
  description_fr = 'Médecine + ninjutsu. Requiert Suiton. Si cette carte perd le pli : le porteur subit -25 % de dégâts (ce pli uniquement, aucun effet en cas de victoire).',
  description_en = 'Medicine + ninjutsu. Requires Suiton. If this card loses the pli: bearer takes -25% damage (this pli only, no effect on win).'
WHERE slug = 'med-barriere-vie';

-- Voile paralysant → Futon (4e carte Futon)
UPDATE tactic_card_definitions
SET
  name_fr = 'Voile de vent',
  name_en = 'Wind Veil',
  element_affinity = 'Futon',
  description_fr = 'Genjutsu. Requiert Futon. Si cette carte gagne le pli : l''adversaire -18 % de puissance au pli suivant.',
  description_en = 'Genjutsu. Requires Futon. If this card wins the pli: opponent -18% power on the next pli.'
WHERE slug = 'gen-voile-paralysie';

-- Rotation des poings → Doton (4e carte Doton)
UPDATE tactic_card_definitions
SET
  element_affinity = 'Doton',
  description_fr = 'Moyenne taijutsu + médecine. Requiert Doton. Bonus variable selon rareté.',
  description_en = 'Taijutsu + medicine average. Requires Doton. Variable bonus by rarity.'
WHERE slug = 'tai-rotation-poings';

-- Cartes défensives pli_lose (réduction dégâts)
UPDATE tactic_card_definitions
SET
  description_fr = 'Ninjutsu. Requiert Katon. Si cette carte perd le pli : le porteur subit -22 % de dégâts (ce pli uniquement, aucun effet en cas de victoire).',
  description_en = 'Ninjutsu. Requires Katon. If this card loses the pli: bearer takes -22% damage (this pli only, no effect on win).'
WHERE slug = 'nin-mur-katon';

UPDATE tactic_card_definitions
SET
  description_fr = 'Ninjutsu. Requiert Doton. Si cette carte perd le pli : le porteur subit -30 % de dégâts (ce pli uniquement, aucun effet en cas de victoire).',
  description_en = 'Ninjutsu. Requires Doton. If this card loses the pli: bearer takes -30% damage (this pli only, no effect on win).'
WHERE slug = 'nin-prison-doton';

UPDATE tactic_card_definitions
SET
  description_fr = 'Moyenne médecine + ninjutsu. Si cette carte perd le pli : le porteur subit -18 % de dégâts (ce pli uniquement, aucun effet en cas de victoire).',
  description_en = 'Medicine + ninjutsu average. If this card loses the pli: bearer takes -18% damage (this pli only, no effect on win).'
WHERE slug = 'med-antidote-choc';

-- Cartes existantes avec effet (descriptions complètes, sans CONCAT)
UPDATE tactic_card_definitions
SET
  description_fr = 'Genjutsu du porteur, bonus variable. Si cette carte gagne le pli : l''adversaire -12 % de puissance au pli suivant.',
  description_en = 'Bearer genjutsu, variable bonus. If this card wins the pli: opponent -12% power on the next pli.'
WHERE slug = 'gen-dango-cuisiniere';

UPDATE tactic_card_definitions
SET
  description_fr = 'Médecine du porteur (soin ou riposte), bonus variable. Si cette carte gagne le pli en soignant : soins renforcés.',
  description_en = 'Bearer medicine (heal or riposte), variable bonus. If this card wins the pli with a heal: boosted healing.'
WHERE slug = 'med-paume-mystique';

UPDATE tactic_card_definitions
SET
  description_fr = 'Moyenne taijutsu + genjutsu, bonus variable. Si cette carte gagne le pli : dégâts bonus.',
  description_en = 'Taijutsu + genjutsu average, variable bonus. If this card wins the pli: bonus damage.'
WHERE slug = 'tai-frappe-ombre';

UPDATE tactic_card_definitions
SET
  description_fr = 'Moyenne ninjutsu + genjutsu, bonus variable. Si cette carte gagne le pli : +10 % de puissance au pli suivant.',
  description_en = 'Ninjutsu + genjutsu average, variable bonus. If this card wins the pli: +10% power on the next pli.'
WHERE slug = 'nin-clone-ombre';
