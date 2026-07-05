import { randomInt } from 'node:crypto';

export function pick(arr) {
  return arr[randomInt(arr.length)];
}

export const TERRAINS = [
  'les gorges brumeuses de Shi no Kuni',
  'la lisière rocailleuse de la frontière du Pays du Feu',
  'les ruines moussues d\'un avant-poste oublié',
  'la clairière silencieuse d\'une forêt de bambous',
  'les falaises battues par le vent au-dessus de la vallée',
];

export const TRANSITIONS = [
  'Un éclair fend le ciel.',
  'Le vent porte l\'odeur de la pluie.',
  'Personne ne bouge encore.',
  'Le fracas des armes retentit soudainement.',
  'La poussière se soulève sous les pas précipités.',
  'Un silence lourd précède l\'assaut.',
];

export const SUSPENSE_LINES = [
  'Le combat fait rage… la suite des rapports arrive dans quelques minutes.',
  'Le rapport est encore en cours de transmission depuis le front…',
  'Le messager shinobi n\'est pas encore revenu du terrain.',
];

export const TAIJUTSU_TEMPLATES = [
  '{attaquant_name} fond sur sa cible et enchaîne une série de coups dévastateurs. {cible_name} encaisse le choc et peine à retrouver son souffle.',
  'Un sifflement fend l\'air. {attaquant_name} prend de vitesse {cible_name} avec un balayage lourd qui perturbe toute défense.',
  '{attaquant_name} disparaît un instant avant de réapparaître aux côtés de {cible_name}, le frappant sans laisser de répit.',
];

export const NINJUTSU_TEMPLATES = [
  '{attaquant_name} scelle un jutsu et libère une vague d\'énergie sur {cible_name}, qui vacille sous l\'impact.',
  'Les mains de {attaquant_name} s\'illuminent ; {cible_name} tente une esquive tardive, mais la technique le rattrape.',
  'Un rugissement élémentaire éclate : {attaquant_name} submerge {cible_name} sous une rafale de chakra.',
];

export const GENJUTSU_SUCCESS = [
  'Les yeux de {attaquant_name} brillent d\'une lueur étrange. {cible_name} s\'immobilise, le regard vide, piégé dans une illusion.',
  '{attaquant_name} murmure une formule ; {cible_name} chancelle, incapable de distinguer le réel du mirage.',
];

export const GENJUTSU_FAIL = [
  '{attaquant_name} tente de plonger la cible dans une illusion, mais {cible_name} reste imperturbable face à ce piège mental.',
  'L\'illusion de {attaquant_name} se brise contre la volonté de {cible_name}, qui reprend immédiatement le combat.',
];

export const GENJUTSU_FAINEANT = [
  '{attaquant_name} tente de plonger la cible dans une illusion, mais {cible_name} bâille paresseusement, totalement insensible à ce piège mental.',
];

export const MEDECINE_TEMPLATES = [
  '{attaquant_name} pose les mains sur {cible_name} et canalise une énergie apaisante ; les blessures se referment peu à peu.',
  'Dans un geste précis, {attaquant_name} stabilise {cible_name} au milieu du chaos du combat.',
];

export const SENSEI_INTERCEPTION = [
  'Le coup de grâce allait s\'abattre sur {cible_name} ! Dans un nuage de fumée soudain, le Jonin-Sensei apparaît et permute son élève avec une bûche de bois. La réserve de Chakra du Sensei s\'épuise, mais l\'apprenti est sauf !',
];

export const ALTRUISTE_SACRIFICE = [
  'Alors que {cible_name} vacillait, {sacrificial_name} s\'interpose de son corps et encaisse le coup à sa place, sauvant son camarade au prix d\'une blessure grave.',
];

export const CONFUSION_TEMPLATE = [
  'Sous l\'effet d\'une confusion, {attaquant_name} frappe par erreur {cible_name}, semant le trouble dans ses propres rangs.',
];

export function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function randomGapMinutes(min = 2, max = 8) {
  return min + randomInt(max - min + 1);
}
