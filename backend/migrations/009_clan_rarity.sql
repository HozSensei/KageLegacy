-- Roturier (sans lignée) + rareté clans pour recrutement

INSERT INTO clan_traits (name, intelligence_bonus, speed_bonus, genjutsu_bonus, ninjutsu_bonus, moral_variance, is_noble)
VALUES ('Roturier', 0, 0, 0, 0, 0, FALSE)
ON DUPLICATE KEY UPDATE
  intelligence_bonus = VALUES(intelligence_bonus),
  speed_bonus = VALUES(speed_bonus),
  genjutsu_bonus = VALUES(genjutsu_bonus),
  ninjutsu_bonus = VALUES(ninjutsu_bonus),
  moral_variance = VALUES(moral_variance),
  is_noble = VALUES(is_noble);
