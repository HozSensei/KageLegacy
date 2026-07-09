-- Genjutsu héritage : réduction magasin objets Match (remplace scout_insight)

UPDATE heritage_scrolls
SET bonus_type = 'match_shop_discount'
WHERE bonus_type = 'scout_insight' OR dominant_stat = 'genjutsu';
