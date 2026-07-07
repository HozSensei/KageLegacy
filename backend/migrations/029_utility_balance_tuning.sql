-- Équilibrage utilitaires match (juil. 2026) — cible milestone-9 : fumigène cohérent +4–8 pts

UPDATE item_definitions
SET
  description_fr = 'Si un coup fatal survit à l''interception Sensei sur un Tank : dégâts −40 %, objet détruit. Hors consigne Tank : effet très faible.',
  description_en = 'If a fatal blow survives Sensei interception on a Tank: −40% damage, item destroyed. Off-role: minimal effect.',
  effects = JSON_OBJECT(
    'match', JSON_OBJECT(
      'trigger', 'lethal_mitigation',
      'damageReduction', 0.32,
      'requiresStrategy', 'Tank',
      'usesPerMatch', 1
    )
  )
WHERE slug = 'fumigene-secours';

UPDATE item_definitions
SET
  effects = JSON_OBJECT(
    'match', JSON_OBJECT(
      'trigger', 'pv_below_pct',
      'threshold', 20,
      'pvRestore', 12,
      'usesPerMatch', 1
    )
  )
WHERE slug = 'herbes-apaisantes';
