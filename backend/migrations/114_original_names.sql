-- Noms originaux : remplace les noms de clans, de sensei et de cartes repris d'une licence existante.
-- Seuls les libellés changent. Les identifiants, les slugs et les bonus restent ceux d'origine.
-- Chaque instruction cible l'ancien libellé et ne fait donc rien sur une base déjà à jour.

-- Lignées : si l'ancien et le nouveau nom coexistent, les fiches sont rattachées au nouveau avant suppression de l'ancien.
UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Nara'
JOIN clan_traits n ON n.name = 'Shizumori'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Nara'
JOIN clan_traits n ON n.name = 'Shizumori'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Shizumori'
WHERE o.name = 'Nara';

UPDATE clan_traits SET name = 'Shizumori' WHERE name = 'Nara';

UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Uchiwa'
JOIN clan_traits n ON n.name = 'Benigiri'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Uchiwa'
JOIN clan_traits n ON n.name = 'Benigiri'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Benigiri'
WHERE o.name = 'Uchiwa';

UPDATE clan_traits SET name = 'Benigiri' WHERE name = 'Uchiwa';

UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Hyuga'
JOIN clan_traits n ON n.name = 'Kazamine'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Hyuga'
JOIN clan_traits n ON n.name = 'Kazamine'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Kazamine'
WHERE o.name = 'Hyuga';

UPDATE clan_traits SET name = 'Kazamine' WHERE name = 'Hyuga';

UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Sarutobi'
JOIN clan_traits n ON n.name = 'Nagihara'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Sarutobi'
JOIN clan_traits n ON n.name = 'Nagihara'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Nagihara'
WHERE o.name = 'Sarutobi';

UPDATE clan_traits SET name = 'Nagihara' WHERE name = 'Sarutobi';

UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Akimichi'
JOIN clan_traits n ON n.name = 'Kumatani'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Akimichi'
JOIN clan_traits n ON n.name = 'Kumatani'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Kumatani'
WHERE o.name = 'Akimichi';

UPDATE clan_traits SET name = 'Kumatani' WHERE name = 'Akimichi';

UPDATE player_character pc
JOIN clan_traits o ON o.id = pc.clan_trait_id AND o.name = 'Yamanaka'
JOIN clan_traits n ON n.name = 'Yukisawa'
SET pc.clan_trait_id = n.id;

UPDATE ninjas nj
JOIN clan_traits o ON o.id = nj.clan_trait_id AND o.name = 'Yamanaka'
JOIN clan_traits n ON n.name = 'Yukisawa'
SET nj.clan_trait_id = n.id;

DELETE o FROM clan_traits o
JOIN clan_traits n ON n.name = 'Yukisawa'
WHERE o.name = 'Yamanaka';

UPDATE clan_traits SET name = 'Yukisawa' WHERE name = 'Yamanaka';

-- Ninjas de clan : le nom de famille reprend celui de la lignée.
UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Shizumori'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Nara')), ' Shizumori')
WHERE nj.name LIKE '% Nara';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Nara')), ' Shizumori')
WHERE ninja_name LIKE '% Nara';

UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Benigiri'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Uchiwa')), ' Benigiri')
WHERE nj.name LIKE '% Uchiwa';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Uchiwa')), ' Benigiri')
WHERE ninja_name LIKE '% Uchiwa';

UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Kazamine'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Hyuga')), ' Kazamine')
WHERE nj.name LIKE '% Hyuga';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Hyuga')), ' Kazamine')
WHERE ninja_name LIKE '% Hyuga';

UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Nagihara'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Sarutobi')), ' Nagihara')
WHERE nj.name LIKE '% Sarutobi';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Sarutobi')), ' Nagihara')
WHERE ninja_name LIKE '% Sarutobi';

UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Kumatani'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Akimichi')), ' Kumatani')
WHERE nj.name LIKE '% Akimichi';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Akimichi')), ' Kumatani')
WHERE ninja_name LIKE '% Akimichi';

UPDATE ninjas nj
JOIN clan_traits c ON c.id = nj.clan_trait_id AND c.name = 'Yukisawa'
SET nj.name = CONCAT(LEFT(nj.name, CHAR_LENGTH(nj.name) - CHAR_LENGTH(' Yamanaka')), ' Yukisawa')
WHERE nj.name LIKE '% Yamanaka';

UPDATE heritage_scrolls
SET ninja_name = CONCAT(LEFT(ninja_name, CHAR_LENGTH(ninja_name) - CHAR_LENGTH(' Yamanaka')), ' Yukisawa')
WHERE ninja_name LIKE '% Yamanaka';

-- Compte de démonstration.
UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = 'Renjiro'
WHERE u.username = 'demo_sensei' AND s.name = 'Kakashi';

-- Sensei des bots : le suffixe numérique éventuel est conservé.
UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Tadao', SUBSTRING(s.name, CHAR_LENGTH('Torifu') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Torifu' OR s.name LIKE 'Torifu %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Shigeru', SUBSTRING(s.name, CHAR_LENGTH('Saruma') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Saruma' OR s.name LIKE 'Saruma %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Jinpei', SUBSTRING(s.name, CHAR_LENGTH('Jiraku') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Jiraku' OR s.name LIKE 'Jiraku %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Sakyo', SUBSTRING(s.name, CHAR_LENGTH('Sajin') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Sajin' OR s.name LIKE 'Sajin %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Tenma', SUBSTRING(s.name, CHAR_LENGTH('Temaru') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Temaru' OR s.name LIKE 'Temaru %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Hideo', SUBSTRING(s.name, CHAR_LENGTH('Pakura') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Pakura' OR s.name LIKE 'Pakura %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Banri', SUBSTRING(s.name, CHAR_LENGTH('Baki') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Baki' OR s.name LIKE 'Baki %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Minamo', SUBSTRING(s.name, CHAR_LENGTH('Kirisame') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Kirisame' OR s.name LIKE 'Kirisame %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Zenji', SUBSTRING(s.name, CHAR_LENGTH('Zabu') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Zabu' OR s.name LIKE 'Zabu %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Mihane', SUBSTRING(s.name, CHAR_LENGTH('Meiha') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Meiha' OR s.name LIKE 'Meiha %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Kaname', SUBSTRING(s.name, CHAR_LENGTH('Kagura') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Kagura' OR s.name LIKE 'Kagura %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Kengo', SUBSTRING(s.name, CHAR_LENGTH('Kurogane') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Kurogane' OR s.name LIKE 'Kurogane %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Tsutomu', SUBSTRING(s.name, CHAR_LENGTH('Tsuchi') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Tsuchi' OR s.name LIKE 'Tsuchi %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Ōsuke', SUBSTRING(s.name, CHAR_LENGTH('Ōnoki') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Ōnoki' OR s.name LIKE 'Ōnoki %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Genzo', SUBSTRING(s.name, CHAR_LENGTH('Gennai') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Gennai' OR s.name LIKE 'Gennai %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Isamu', SUBSTRING(s.name, CHAR_LENGTH('Ibiki') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Ibiki' OR s.name LIKE 'Ibiki %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Shizuka', SUBSTRING(s.name, CHAR_LENGTH('Shizune') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Shizune' OR s.name LIKE 'Shizune %');

UPDATE sensei s
JOIN users u ON u.id = s.user_id
SET s.name = CONCAT('Masaru', SUBSTRING(s.name, CHAR_LENGTH('Might') + 1))
WHERE u.is_bot = TRUE AND (s.name = 'Might' OR s.name LIKE 'Might %');

-- Cartes du deck (V2).
UPDATE card_definitions SET name_fr = 'Lame du guérisseur', name_en = 'Healer''s Edge' WHERE slug = 'scalpel-de-chakra';

UPDATE card_definitions SET name_fr = 'Dune engloutissante', name_en = 'Engulfing Dune' WHERE slug = 'tombeau-de-sable';

UPDATE card_definitions SET name_fr = 'Reflet trompeur', name_en = 'Deceiving Reflection' WHERE slug = 'oeil-du-mirroir';

UPDATE card_definitions SET name_fr = 'Pilule fortifiante', name_en = 'Fortifying Pill' WHERE slug = 'pilule-du-soldat';

UPDATE card_definitions
SET lore_fr = 'Technique secrète des forgerons du clan Hizuchi.',
    lore_en = 'Secret technique of the Hizuchi clan smiths.'
WHERE slug = 'coeur-de-braise' AND lore_fr LIKE '%Kagetsu%';

-- Cartes techniques de l'ancien système de plis.
UPDATE tactic_card_definitions SET name_fr = 'Éclair perçant', name_en = 'Piercing Bolt' WHERE slug = 'nin-chidori';

UPDATE tactic_card_definitions SET name_fr = 'Foudre céleste', name_en = 'Heavenly Thunder' WHERE slug = 'nin-kirin';

UPDATE tactic_card_definitions SET name_fr = 'Brasier d''obsidienne', name_en = 'Obsidian Blaze' WHERE slug = 'nin-amaterasu';

UPDATE tactic_card_definitions SET name_fr = 'Rafale du fauve', name_en = 'Wildcat Flurry' WHERE slug = 'tai-coup-poing-leon';

UPDATE tactic_card_definitions SET name_fr = 'Silhouette leurre', name_en = 'Decoy Silhouette' WHERE slug = 'nin-clone-ombre';

UPDATE tactic_card_definitions SET name_fr = 'Lame du guérisseur', name_en = 'Healer''s Edge' WHERE slug = 'med-scalpel-chakra';

UPDATE tactic_card_definitions SET name_fr = 'Paume apaisante', name_en = 'Soothing Palm' WHERE slug = 'med-paume-mystique';

UPDATE tactic_card_definitions SET name_fr = 'Serpent des crues', name_en = 'Flood Serpent' WHERE slug = 'nin-suiton-dragon';
