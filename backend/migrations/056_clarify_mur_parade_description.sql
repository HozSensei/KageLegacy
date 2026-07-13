-- Clarification description Mur de parade (effet défensif au pli perdu)

UPDATE tactic_card_definitions
SET
  description_fr = 'Taijutsu du porteur. Si cette carte perd le pli : le porteur subit -20 % de dégâts (ce pli uniquement, aucun effet en cas de victoire).',
  description_en = 'Bearer taijutsu. If this card loses the pli: bearer takes -20% damage (this pli only, no effect on win).'
WHERE slug = 'tai-mur-parade';
