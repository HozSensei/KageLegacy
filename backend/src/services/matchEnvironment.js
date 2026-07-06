import { randomInt } from 'node:crypto';

/** Un modificateur par match — météo OU topologie. */
export const ENVIRONMENT_MODIFIERS = [
  {
    slug: 'pluie',
    type: 'weather',
    scoutFuzzy:
      'Des averses sont probables sur le secteur — les techniques à distance paraissent moins fiables.',
    scoutConfirmed:
      'Pluie confirmée sur le secteur — les techniques à distance seront moins fiables.',
    introPhrase: 'sous une pluie fine et tenace',
    effects: { ninjutsuPenalty: 2, genjutsuBonus: 1 },
    counterSlug: 'cape-impermeable',
  },
  {
    slug: 'brouillard',
    type: 'weather',
    scoutFuzzy: 'Brume épaisse signalée — difficile d\'anticiper les ouvertures.',
    scoutConfirmed: 'Brouillard épais confirmé — l\'initiative sera pénalisée.',
    introPhrase: 'dans un brouillard épais qui réduit la visibilité',
    effects: { initiativePenalty: 3 },
    counterSlug: 'torche-signalisation',
  },
  {
    slug: 'ciel-degage',
    type: 'weather',
    scoutFuzzy:
      'Ciel dégagé signalé — les éclairs élémentaires pourraient être plus visibles.',
    scoutConfirmed: 'Ciel dégagé confirmé — léger avantage aux techniques de Feu.',
    introPhrase: 'sous un ciel dégagé où les éclairs élémentaires percent l\'air',
    effects: { fireAffinityBonus: 1 },
    counterSlug: null,
  },
  {
    slug: 'foret-dense',
    type: 'topology',
    scoutFuzzy: 'Secteur boisé repéré — combat rapproché probable.',
    scoutConfirmed: 'Forêt dense confirmée — le Taijutsu y sera favorisé.',
    introPhrase: 'au cœur d\'une forêt dense aux passages étroits',
    effects: { taijutsuBonus: 1 },
    counterSlug: null,
  },
  {
    slug: 'terrain-ouvert',
    type: 'topology',
    scoutFuzzy: 'Zone dégagée signalée — peu de couvert, lignes de tir longues.',
    scoutConfirmed: 'Terrain ouvert confirmé — le Ninjutsu y sera favorisé.',
    introPhrase: 'sur un terrain ouvert sans couvert ni obstacle',
    effects: { ninjutsuBonus: 1 },
    counterSlug: null,
  },
  {
    slug: 'falaises',
    type: 'topology',
    scoutFuzzy: 'Relief accidenté signalé — tenir les positions hautes semble avantageux.',
    scoutConfirmed: 'Falaises confirmées — la défense y sera favorisée.',
    introPhrase: 'sur des falaises escarpées dominant la vallée',
    effects: { defenseBonus: 1 },
    counterSlug: 'sandales-canyon',
  },
];

const BY_SLUG = Object.fromEntries(ENVIRONMENT_MODIFIERS.map((e) => [e.slug, e]));

export function pickEnvironmentModifier() {
  return ENVIRONMENT_MODIFIERS[randomInt(ENVIRONMENT_MODIFIERS.length)];
}

export function getEnvironmentModifier(slug) {
  return BY_SLUG[slug] || null;
}

export function getScoutEnvironmentLine(slug, { confirmed = false } = {}) {
  const env = getEnvironmentModifier(slug);
  if (!env) return null;
  return confirmed ? env.scoutConfirmed : env.scoutFuzzy;
}

export function buildEnvironmentTerrainPhrase(slug) {
  const env = getEnvironmentModifier(slug);
  if (!env) return 'un secteur d\'opération non cartographié';
  return env.introPhrase;
}

export function hasEnvironmentCounter(fighter, envSlug) {
  const env = getEnvironmentModifier(envSlug);
  if (!env?.counterSlug) return false;
  return (fighter.equipment?.cycle || []).some(
    (effect) =>
      effect.trigger === 'environment_counter' && effect.counter === env.slug
  );
}

export function getFighterInitiativePenalty(fighter, env) {
  const penalty = env?.effects?.initiativePenalty || 0;
  if (!penalty) return 0;
  if (hasEnvironmentCounter(fighter, env.slug)) return 0;
  return penalty;
}

export function applyEnvironmentAttackMod(attacker, technique, env) {
  if (!env?.effects) return 0;
  let mod = 0;
  const { effects } = env;

  if (technique.type === 'ninjutsu') {
    if (effects.ninjutsuPenalty && !hasEnvironmentCounter(attacker, env.slug)) {
      mod -= effects.ninjutsuPenalty;
    }
    if (effects.ninjutsuBonus) mod += effects.ninjutsuBonus;
  }
  if (technique.type === 'genjutsu' && effects.genjutsuBonus) {
    mod += effects.genjutsuBonus;
  }
  if (technique.type === 'taijutsu' && effects.taijutsuBonus) {
    mod += effects.taijutsuBonus;
  }
  if (
    technique.type === 'ninjutsu' &&
    effects.fireAffinityBonus &&
    attacker.element_affinity === 'Katon'
  ) {
    mod += effects.fireAffinityBonus;
  }
  return mod;
}

export function applyEnvironmentDefenseMod(defender, env) {
  if (!env?.effects?.defenseBonus) return 0;
  if (hasEnvironmentCounter(defender, env.slug)) return 0;
  return env.effects.defenseBonus;
}
