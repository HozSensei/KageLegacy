export const LOW_DAMAGE_PCT = 0.1;

const R = (type, amount) => ({ type, amount });
const T = (goal, rewards) => ({ goal, rewards });

export const ACHIEVEMENT_DEFS = [
  { key:'combat_wins', category:'combat', nameFr:'Lames éprouvées', nameEn:'Proven Blades', descriptionFr:'Remporter {goal} combats', descriptionEn:'Win {goal} combats', action:'combat_win',
    tiers:[T(3,[R('ryos',75)]),T(10,[R('ryos',150),R('xp',40)]),T(25,[R('dust',40),R('xp',80)]),T(50,[R('ryos',400),R('dust',80)]),T(100,[R('ryos',800),R('essence',1)])] },
  { key:'mission_runs', category:'missions', nameFr:'Cartographe des ombres', nameEn:'Shadow Cartographer', descriptionFr:'Achever {goal} parcours de mission', descriptionEn:'Complete {goal} mission runs', action:'mission_run',
    tiers:[T(1,[R('ryos',50)]),T(5,[R('ryos',150),R('xp',50)]),T(15,[R('dust',50),R('xp',100)]),T(40,[R('ryos',500),R('essence',1)])] },
  { key:'collection_owned', category:'collection', nameFr:'Archives du clan', nameEn:'Clan Archives', descriptionFr:'Posséder {goal} cartes distinctes', descriptionEn:'Own {goal} distinct cards', action:'collection_owned', mode:'set_absolute',
    tiers:[T(10,[R('dust',20)]),T(25,[R('dust',50),R('ryos',100)]),T(50,[R('dust',100),R('xp',60)]),T(100,[R('essence',2),R('ryos',400)])] },
  { key:'flawless_wins', category:'mastery', nameFr:'Sans une égratignure', nameEn:'Without a Scratch', descriptionFr:'Gagner {goal} combat(s) sans prendre de dégâts', descriptionEn:'Win {goal} combat(s) without taking damage', action:'flawless_win',
    tiers:[T(1,[R('ryos',120),R('xp',40)]),T(5,[R('dust',60),R('xp',80)]),T(15,[R('ryos',500),R('essence',1)])] },
  { key:'low_damage_wins', category:'mastery', nameFr:'Presque intact', nameEn:'Barely Touched', descriptionFr:'Gagner {goal} combat(s) en subissant ≤10 % des PV max', descriptionEn:'Win {goal} combat(s) while taking ≤10% of max HP', action:'low_damage_win',
    tiers:[T(1,[R('ryos',80)]),T(5,[R('dust',40),R('xp',50)]),T(15,[R('ryos',350),R('dust',70)])] },
  { key:'no_heal_wins', category:'mastery', nameFr:'Sans baume', nameEn:'No Salve', descriptionFr:'Gagner {goal} combat(s) sans carte de soin', descriptionEn:'Win {goal} combat(s) without playing heal cards', action:'no_heal_win',
    tiers:[T(1,[R('ryos',100),R('xp',30)]),T(5,[R('dust',50),R('xp',70)]),T(12,[R('ryos',400),R('essence',1)])] },
  { key:'no_taijutsu_wins', category:'mastery', nameFr:'Poings rangés', nameEn:'Fists Sheathed', descriptionFr:'Gagner {goal} combat(s) sans jouer de carte Taijutsu', descriptionEn:'Win {goal} combat(s) without playing Taijutsu cards', action:'no_taijutsu_win',
    tiers:[T(1,[R('ryos',100)]),T(5,[R('dust',45),R('xp',60)]),T(12,[R('ryos',380),R('dust',60)])] },
  { key:'ninjutsu_only_wins', category:'mastery', nameFr:'Sceaux seuls', nameEn:'Seals Alone', descriptionFr:'Gagner {goal} combat(s) en n’utilisant que du Ninjutsu (parmi les cartes typées)', descriptionEn:'Win {goal} combat(s) using only Ninjutsu among typed cards', action:'ninjutsu_only_win',
    tiers:[T(1,[R('ryos',120),R('xp',40)]),T(5,[R('dust',55),R('xp',80)])] },
  { key:'genjutsu_only_wins', category:'mastery', nameFr:'Mirages purs', nameEn:'Pure Mirage', descriptionFr:'Gagner {goal} combat(s) en n’utilisant que du Genjutsu (parmi les cartes typées)', descriptionEn:'Win {goal} combat(s) using only Genjutsu among typed cards', action:'genjutsu_only_win',
    tiers:[T(1,[R('ryos',120),R('xp',40)]),T(5,[R('dust',55),R('xp',80)])] },
  { key:'boss_kills', category:'combat', nameFr:'Chasseur de titans', nameEn:'Titan Hunter', descriptionFr:'Vaincre {goal} boss', descriptionEn:'Defeat {goal} bosses', action:'boss_kill',
    tiers:[T(1,[R('ryos',150),R('xp',50)]),T(5,[R('dust',70),R('ryos',300)]),T(15,[R('essence',1),R('ryos',600)])] },
  { key:'win_streak', category:'combat', nameFr:'Série d’acier', nameEn:'Iron Streak', descriptionFr:'Atteindre une série de {goal} victoires consécutives', descriptionEn:'Reach a streak of {goal} consecutive wins', action:'win_streak', mode:'set_max',
    tiers:[T(3,[R('ryos',100)]),T(7,[R('dust',50),R('xp',70)]),T(15,[R('ryos',450),R('essence',1)])] },
  { key:'deck_size', category:'progression', nameFr:'Arsenal complet', nameEn:'Full Arsenal', descriptionFr:'Constituer un deck de {goal} cartes', descriptionEn:'Build a deck with {goal} cards', action:'deck_size', mode:'set_max',
    tiers:[T(20,[R('ryos',80)]),T(30,[R('dust',40),R('xp',40)])] },
  { key:'talent_spent', category:'progression', nameFr:'Voie du sensei', nameEn:'Sensei’s Path', descriptionFr:'Dépenser {goal} points de talent', descriptionEn:'Spend {goal} talent points', action:'talent_spent', mode:'set_absolute',
    tiers:[T(5,[R('ryos',100)]),T(15,[R('dust',50),R('xp',60)]),T(30,[R('ryos',400),R('essence',1)])] },
];

export function getAchievementDef(key) { return ACHIEVEMENT_DEFS.find((d) => d.key === key) || null; }
export function achievementsForAction(action) { return ACHIEVEMENT_DEFS.filter((d) => d.action === action); }
export function formatAchievementDescription(def, goal, locale = 'fr') {
  const template = locale === 'en' ? def.descriptionEn : def.descriptionFr;
  return String(template || '').replace(/\{goal\}/g, String(goal));
}
