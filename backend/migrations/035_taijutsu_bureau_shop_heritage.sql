-- Taijutsu héritage : −% objets Bureau au magasin (aligné sur les autres stats)

UPDATE heritage_scrolls
SET bonus_type = 'bureau_shop_discount'
WHERE bonus_type = 'moral_recovery' OR dominant_stat = 'taijutsu';
