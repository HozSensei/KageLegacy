-- +20 cartes technique ninja avec effets PLI + effets sur quelques cartes existantes

INSERT INTO tactic_card_definitions (
  slug, name_fr, name_en, description_fr, description_en,
  rarity, card_type, stat_type, pli_secondary_stat, pli_bonus_min, pli_bonus_max, element_affinity,
  trigger_kind, trigger_params, target_kind, target_params, effect_kind, effect_params,
  catalog_price, narrative_key
) VALUES
(
  'tai-poing-chakra',
  'Poing de chakra',
  'Chakra Fist',
  'Taijutsu + vitesse. Si ce pli est gagné : dégâts bonus selon la vitesse du porteur.',
  'Taijutsu + speed. If this pli is won: bonus damage based on bearer speed.',
  'common', 'attack', 'taijutsu', 'vitesse', 0.0100, 0.2000, NULL,
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 2, 'scaleStat', 'vitesse', 'scaleDiv', 8),
  370, 'tech_chakra_fist'
),
(
  'tai-enchainement',
  'Enchaînement rapide',
  'Rapid Combo',
  'Taijutsu + vitesse. Victoire au pli : le porteur gagne +12 % de puissance au pli suivant.',
  'Taijutsu + speed. Pli win: bearer gains +12% power on the next pli.',
  'common', 'attack', 'taijutsu', 'vitesse', 0.0100, 0.2000, NULL,
  'pli_win', JSON_OBJECT(), 'self', JSON_OBJECT(), 'next_pli_mod', JSON_OBJECT('mult', 1.12),
  360, 'tech_rapid_combo'
),
(
  'tai-mur-parade',
  'Mur de parade',
  'Parry Wall',
  'Taijutsu du porteur. Si cette carte perd le pli : le porteur subit −20 % de dégâts (ce pli uniquement ; aucun effet en cas de victoire).',
  'Bearer taijutsu. If this card loses the pli: bearer takes −20% damage (this pli only; no effect on win).',
  'common', 'defense', 'taijutsu', NULL, 0.0500, 0.2500, NULL,
  'pli_lose', JSON_OBJECT(), 'self', JSON_OBJECT(), 'damage_reduction_pct', JSON_OBJECT('pct', 0.20),
  380, 'tech_parry_wall'
),
(
  'tai-coup-furtif',
  'Coup furtif',
  'Stealth Strike',
  'Taijutsu + intelligence. Victoire : dégâts bonus (intelligence).',
  'Taijutsu + intelligence. Win: bonus damage (intelligence).',
  'rare', 'attack', 'taijutsu', 'intelligence', 0.1500, 0.3500, NULL,
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 4, 'scaleStat', 'intelligence', 'scaleDiv', 6),
  840, 'tech_stealth_strike'
),
(
  'tai-pied-ecrasant',
  'Pied écrasant',
  'Crushing Kick',
  'Taijutsu + vitesse. Requiert Doton. Victoire : gros dégâts bonus.',
  'Taijutsu + speed. Requires Doton. Win: heavy bonus damage.',
  'rare', 'attack', 'taijutsu', 'vitesse', 0.1500, 0.3500, 'Doton',
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 5, 'scaleStat', 'taijutsu', 'scaleDiv', 5),
  860, 'tech_crushing_kick'
),
(
  'nin-mur-katon',
  'Mur de flammes',
  'Flame Wall',
  'Ninjutsu. Requiert Katon. Si cette carte perd le pli : le porteur subit −22 % de dégâts (ce pli uniquement ; aucun effet en cas de victoire).',
  'Ninjutsu. Requires Katon. If this card loses the pli: bearer takes −22% damage (this pli only; no effect on win).',
  'common', 'defense', 'ninjutsu', NULL, 0.0500, 0.2500, 'Katon',
  'pli_lose', JSON_OBJECT(), 'self', JSON_OBJECT(), 'damage_reduction_pct', JSON_OBJECT('pct', 0.22),
  400, 'tech_flame_wall'
),
(
  'nin-spirale-suiton',
  'Spirale d''eau',
  'Water Spiral',
  'Ninjutsu. Requiert Suiton. Victoire : dégâts bonus.',
  'Ninjutsu. Requires Suiton. Win: bonus damage.',
  'common', 'attack', 'ninjutsu', NULL, 0.0500, 0.2500, 'Suiton',
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 3, 'scaleStat', 'ninjutsu', 'scaleDiv', 6),
  410, 'tech_water_spiral'
),
(
  'nin-eclair-double',
  'Double éclair',
  'Twin Lightning',
  'Ninjutsu + vitesse. Requiert Raiton. Victoire : dégâts bonus élevés.',
  'Ninjutsu + speed. Requires Raiton. Win: high bonus damage.',
  'rare', 'attack', 'ninjutsu', 'vitesse', 0.1500, 0.3500, 'Raiton',
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 6, 'scaleStat', 'vitesse', 'scaleDiv', 7),
  900, 'tech_twin_lightning'
),
(
  'nin-prison-doton',
  'Prison de roche',
  'Stone Prison',
  'Ninjutsu. Requiert Doton. Si cette carte perd le pli : le porteur subit −30 % de dégâts (ce pli uniquement ; aucun effet en cas de victoire).',
  'Ninjutsu. Requires Doton. If this card loses the pli: bearer takes −30% damage (this pli only; no effect on win).',
  'rare', 'defense', 'ninjutsu', NULL, 0.1500, 0.3500, 'Doton',
  'pli_lose', JSON_OBJECT(), 'self', JSON_OBJECT(), 'damage_reduction_pct', JSON_OBJECT('pct', 0.30),
  830, 'tech_stone_prison'
),
(
  'nin-rafale-futon',
  'Rafale de vent',
  'Gale Burst',
  'Ninjutsu + taijutsu. Requiert Futon. Victoire : +10 % au pli suivant.',
  'Ninjutsu + taijutsu. Requires Futon. Win: +10% next pli.',
  'common', 'attack', 'ninjutsu', 'taijutsu', 0.0500, 0.2500, 'Futon',
  'pli_win', JSON_OBJECT(), 'self', JSON_OBJECT(), 'next_pli_mod', JSON_OBJECT('mult', 1.10),
  395, 'tech_gale_burst'
),
(
  'gen-illusion-miroir',
  'Illusion miroir',
  'Mirror Illusion',
  'Genjutsu + intelligence. Victoire : l''adversaire −15 % au pli suivant.',
  'Genjutsu + intelligence. Win: opponent −15% next pli.',
  'common', 'attack', 'genjutsu', 'intelligence', 0.0500, 0.2500, NULL,
  'pli_win', JSON_OBJECT(), 'enemy_attacker', JSON_OBJECT(), 'opp_next_pli_mod', JSON_OBJECT('mult', 0.85),
  390, 'tech_mirror_illusion'
),
(
  'gen-chaos-esprit',
  'Chaos mental',
  'Mind Chaos',
  'Genjutsu + intelligence. Victoire : l''adversaire −20 % au pli suivant.',
  'Genjutsu + intelligence. Win: opponent −20% next pli.',
  'rare', 'attack', 'genjutsu', 'intelligence', 0.1500, 0.3500, NULL,
  'pli_win', JSON_OBJECT(), 'enemy_attacker', JSON_OBJECT(), 'opp_next_pli_mod', JSON_OBJECT('mult', 0.80),
  920, 'tech_mind_chaos'
),
(
  'gen-voile-paralysie',
  'Voile de vent',
  'Wind Veil',
  'Genjutsu. Requiert Futon. Si cette carte gagne le pli : l''adversaire −18 % de puissance au pli suivant.',
  'Genjutsu. Requires Futon. If this card wins the pli: opponent −18% power on the next pli.',
  'rare', 'defense', 'genjutsu', NULL, 0.1500, 0.3500, 'Futon',
  'pli_win', JSON_OBJECT(), 'enemy_attacker', JSON_OBJECT(), 'opp_next_pli_mod', JSON_OBJECT('mult', 0.82),
  870, 'tech_paralyzing_veil'
),
(
  'gen-brume-apaisante',
  'Brume apaisante',
  'Soothing Haze',
  'Genjutsu + intelligence. Égalité au pli : soin léger du porteur.',
  'Genjutsu + intelligence. Pli draw: light heal on bearer.',
  'common', 'support', 'genjutsu', 'intelligence', 0.0100, 0.2000, NULL,
  'pli_draw', JSON_OBJECT(), 'self', JSON_OBJECT(), 'heal_flat', JSON_OBJECT('flat', 5, 'scaleStat', 'medecine', 'scaleDiv', 10),
  365, 'tech_soothing_haze'
),
(
  'med-bonus-soin',
  'Flux curatif',
  'Healing Flow',
  'Médecine. Victoire au pli (soin) : bonus de soins.',
  'Medicine. Pli win (heal): bonus healing.',
  'common', 'support', 'medecine', NULL, 0.0100, 0.2000, NULL,
  'pli_win', JSON_OBJECT(), 'ally_lowest_pv', JSON_OBJECT(), 'heal_bonus', JSON_OBJECT('flat', 4, 'scaleStat', 'medecine', 'scaleDiv', 5),
  370, 'tech_healing_flow'
),
(
  'med-barriere-vie',
  'Barrière aqueuse',
  'Water Barrier',
  'Médecine + ninjutsu. Requiert Suiton. Si cette carte perd le pli : le porteur subit −25 % de dégâts (ce pli uniquement ; aucun effet en cas de victoire).',
  'Medicine + ninjutsu. Requires Suiton. If this card loses the pli: bearer takes −25% damage (this pli only; no effect on win).',
  'rare', 'support', 'medecine', 'ninjutsu', 0.1500, 0.3500, 'Suiton',
  'pli_lose', JSON_OBJECT(), 'self', JSON_OBJECT(), 'damage_reduction_pct', JSON_OBJECT('pct', 0.25),
  810, 'tech_life_barrier'
),
(
  'med-paume-choc',
  'Paume de choc',
  'Shock Palm',
  'Médecine + intelligence. Égalité : récupère des PV.',
  'Medicine + intelligence. Draw: restores HP.',
  'common', 'support', 'medecine', 'intelligence', 0.0500, 0.2500, NULL,
  'pli_draw', JSON_OBJECT(), 'self', JSON_OBJECT(), 'heal_flat', JSON_OBJECT('flat', 6, 'scaleStat', 'medecine', 'scaleDiv', 8),
  385, 'tech_shock_palm'
),
(
  'nin-kirin',
  'Kirin',
  'Kirin',
  'Ninjutsu + vitesse. Requiert Raiton. Victoire : dégâts bonus massifs.',
  'Ninjutsu + speed. Requires Raiton. Win: massive bonus damage.',
  'legendary', 'attack', 'ninjutsu', 'vitesse', 0.3000, 0.5000, 'Raiton',
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 8, 'scaleStat', 'ninjutsu', 'scaleDiv', 4),
  1850, 'tech_kirin'
),
(
  'nin-amaterasu',
  'Flammes noires',
  'Black Flames',
  'Ninjutsu + genjutsu. Requiert Katon. Victoire : brûlure dévastatrice.',
  'Ninjutsu + genjutsu. Requires Katon. Win: devastating burn.',
  'legendary', 'attack', 'ninjutsu', 'genjutsu', 0.3000, 0.5000, 'Katon',
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 10, 'scaleStat', 'genjutsu', 'scaleDiv', 6),
  1900, 'tech_black_flames'
),
(
  'tai-dragon-impact',
  'Impact du dragon',
  'Dragon Impact',
  'Taijutsu + ninjutsu. Victoire : dégâts bonus et +15 % au pli suivant.',
  'Taijutsu + ninjutsu. Win: bonus damage and +15% next pli.',
  'legendary', 'attack', 'taijutsu', 'ninjutsu', 0.3000, 0.5000, NULL,
  'pli_win', JSON_OBJECT(), 'enemy_defender', JSON_OBJECT(), 'bonus_damage', JSON_OBJECT('flat', 7, 'scaleStat', 'taijutsu', 'scaleDiv', 4),
  1750, 'tech_dragon_impact'
);

-- Effets sur cartes existantes (descriptions complètes)
UPDATE tactic_card_definitions
SET trigger_kind = 'pli_win', effect_kind = 'opp_next_pli_mod',
    effect_params = JSON_OBJECT('mult', 0.88),
    description_fr = 'Genjutsu du porteur, bonus variable. Si cette carte gagne le pli : l''adversaire −12 % de puissance au pli suivant.',
    description_en = 'Bearer genjutsu, variable bonus. If this card wins the pli: opponent −12% power on the next pli.'
WHERE slug = 'gen-dango-cuisiniere';

UPDATE tactic_card_definitions
SET trigger_kind = 'pli_win', effect_kind = 'heal_bonus',
    effect_params = JSON_OBJECT('flat', 3, 'scaleStat', 'medecine', 'scaleDiv', 6),
    description_fr = 'Médecine du porteur (soin ou riposte), bonus variable. Si cette carte gagne le pli en soignant : soins renforcés.',
    description_en = 'Bearer medicine (heal or riposte), variable bonus. If this card wins the pli with a heal: boosted healing.'
WHERE slug = 'med-paume-mystique';

UPDATE tactic_card_definitions
SET trigger_kind = 'pli_win', effect_kind = 'bonus_damage',
    effect_params = JSON_OBJECT('flat', 4, 'scaleStat', 'genjutsu', 'scaleDiv', 8),
    description_fr = 'Moyenne taijutsu + genjutsu, bonus variable. Si cette carte gagne le pli : dégâts bonus.',
    description_en = 'Taijutsu + genjutsu average, variable bonus. If this card wins the pli: bonus damage.'
WHERE slug = 'tai-frappe-ombre';

UPDATE tactic_card_definitions
SET trigger_kind = 'pli_win', effect_kind = 'next_pli_mod',
    effect_params = JSON_OBJECT('mult', 1.10),
    description_fr = 'Moyenne ninjutsu + genjutsu, bonus variable. Si cette carte gagne le pli : +10 % de puissance au pli suivant.',
    description_en = 'Ninjutsu + genjutsu average, variable bonus. If this card wins the pli: +10% power on the next pli.'
WHERE slug = 'nin-clone-ombre';

UPDATE tactic_card_definitions
SET trigger_kind = 'pli_lose', effect_kind = 'damage_reduction_pct',
    effect_params = JSON_OBJECT('pct', 0.18),
    description_fr = 'Moyenne médecine + ninjutsu, bonus variable. Si cette carte perd le pli : le porteur subit −18 % de dégâts (ce pli uniquement ; aucun effet en cas de victoire).',
    description_en = 'Medicine + ninjutsu average, variable bonus. If this card loses the pli: bearer takes −18% damage (this pli only; no effect on win).'
WHERE slug = 'med-antidote-choc';

-- Dragon Impact : aussi next_pli_mod — on garde bonus_damage comme effet principal (légendaire déjà forte)
