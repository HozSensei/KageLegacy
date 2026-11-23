/**
 * Guide du novice — étapes one-shot (distinct des succès / Battle Pass).
 * kind: visit = POST /visit ; action = hook jeu (deck, talent, combat).
 */

const R = (type, amount) => Object.freeze({ type, amount });

export const ONBOARDING_STEPS = Object.freeze([
  Object.freeze({
    key: 'visit_profile',
    kind: 'visit',
    route: '/profil',
    sortOrder: 10,
    nameFr: 'Visiter ton profil',
    nameEn: 'Visit your profile',
    hintFr: 'Identité, stats et cosmétique de ton ninja.',
    hintEn: 'Your ninja identity, stats, and cosmetics.',
    rewards: Object.freeze([R('ryos', 30), R('xp', 15)]),
  }),
  Object.freeze({
    key: 'edit_deck',
    kind: 'action',
    action: 'deck_edit',
    route: '/decks',
    sortOrder: 20,
    nameFr: 'Modifier un deck',
    nameEn: 'Edit a deck',
    hintFr: 'Ajuste les cartes de ton deck actif dans le constructeur.',
    hintEn: 'Tweak cards in your active deck in the builder.',
    rewards: Object.freeze([R('ryos', 60), R('xp', 30)]),
  }),
  Object.freeze({
    key: 'create_deck',
    kind: 'action',
    action: 'deck_create',
    route: '/decks',
    sortOrder: 30,
    nameFr: 'Créer un deck',
    nameEn: 'Create a deck',
    hintFr: 'Crée toi-même un nouveau deck (20–30 cartes) — les decks de départ ne comptent pas.',
    hintEn: 'Create a new deck yourself (20–30 cards) — starter decks do not count.',
    rewards: Object.freeze([R('ryos', 70), R('xp', 35)]),
  }),
  Object.freeze({
    key: 'spend_talent',
    kind: 'action',
    action: 'talent_spent',
    route: '/talents',
    sortOrder: 40,
    nameFr: 'Dépenser un point de talent',
    nameEn: 'Spend a talent point',
    hintFr: 'Ouvre l’arbre et investis ton premier point.',
    hintEn: 'Open the tree and invest your first point.',
    rewards: Object.freeze([R('ryos', 60), R('xp', 30)]),
  }),
  Object.freeze({
    key: 'visit_collection',
    kind: 'visit',
    route: '/collection',
    sortOrder: 50,
    nameFr: 'Parcourir la collection',
    nameEn: 'Browse the collection',
    hintFr: 'Vois tes cartes, passifs et améliorations.',
    hintEn: 'See your cards, passives, and upgrades.',
    rewards: Object.freeze([R('ryos', 25), R('xp', 15)]),
  }),
  Object.freeze({
    key: 'win_combat',
    kind: 'action',
    action: 'combat_win',
    route: '/missions',
    sortOrder: 60,
    nameFr: 'Gagner un combat',
    nameEn: 'Win a fight',
    hintFr: 'Un duel rapide ou un nœud de mission D — gère armure et intentions.',
    hintEn: 'A quick duel or a rank D node — manage armor and intents.',
    rewards: Object.freeze([R('ryos', 100), R('xp', 50)]),
  }),
  Object.freeze({
    key: 'visit_rules',
    kind: 'visit',
    route: '/rules',
    sortOrder: 70,
    nameFr: 'Lire les règles',
    nameEn: 'Read the rules',
    hintFr: 'Combat, decks, talents et paliers de missions.',
    hintEn: 'Combat, decks, talents, and mission gates.',
    rewards: Object.freeze([R('ryos', 35), R('xp', 20)]),
  }),
  Object.freeze({
    key: 'visit_battle_pass',
    kind: 'visit',
    route: '/battle-pass',
    sortOrder: 80,
    nameFr: 'Ouvrir le Battle Pass',
    nameEn: 'Open the Battle Pass',
    hintFr: 'Piste de saison, quêtes et récompenses.',
    hintEn: 'Season track, quests, and rewards.',
    rewards: Object.freeze([R('ryos', 25), R('xp', 15)]),
  }),
  Object.freeze({
    key: 'visit_village',
    kind: 'visit',
    route: '/village',
    sortOrder: 90,
    nameFr: 'Visiter le village',
    nameEn: 'Visit the village',
    hintFr: 'Amis, factions et classement hebdomadaire.',
    hintEn: 'Friends, factions, and weekly standings.',
    rewards: Object.freeze([R('ryos', 25), R('xp', 15)]),
  }),
  Object.freeze({
    key: 'visit_shop',
    kind: 'visit',
    route: '/shop',
    sortOrder: 100,
    nameFr: 'Visiter la boutique',
    nameEn: 'Visit the shop',
    hintFr: 'Boosters en Ryos — pas d’obligation d’acheter.',
    hintEn: 'Boosters for Ryos — no need to buy yet.',
    rewards: Object.freeze([R('ryos', 30), R('xp', 15)]),
  }),
]);

export function getOnboardingStep(key) {
  return ONBOARDING_STEPS.find(s => s.key === key) || null;
}

export function onboardingStepsForAction(action) {
  return ONBOARDING_STEPS.filter(s => s.kind === 'action' && s.action === action);
}

export function totalOnboardingRewards() {
  const totals = { ryos: 0, xp: 0 };
  for (const step of ONBOARDING_STEPS) {
    for (const r of step.rewards) {
      if (r.type === 'ryos') totals.ryos += r.amount;
      if (r.type === 'xp') totals.xp += r.amount;
    }
  }
  return totals;
}
