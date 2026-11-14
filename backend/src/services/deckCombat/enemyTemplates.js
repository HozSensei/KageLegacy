/**
 * Templates ennemis MVP — noms originaux (pas d'IP tierce).
 *
 * AI levels:
 *   - weighted : random pondéré (mobs)
 *   - pattern  : boucle fixe (élites)
 */

export const ENEMY_TEMPLATES = {
  ronin_bandit: {
    id: 'ronin_bandit',
    nameFr: 'Rônin des Brumes',
    nameEn: 'Mist Ronin',
    hp: 42,
    posture: 'taijutsu',
    elementAffinity: null,
    ai: 'weighted',
    patterns: [
      { weight: 60, intent: { type: 'attack', damage: 8 } },
      { weight: 30, intent: { type: 'defend', block: 8 } },
      { weight: 10, intent: { type: 'buff', status: 'force', value: 2, duration: 2 } },
    ],
  },
  kurogane_scout: {
    id: 'kurogane_scout',
    nameFr: 'Éclaireur Kurogane',
    nameEn: 'Kurogane Scout',
    hp: 65,
    posture: 'ninjutsu',
    elementAffinity: 'katon',
    ai: 'weighted',
    patterns: [
      { weight: 45, intent: { type: 'attack', damage: 11 } },
      { weight: 25, intent: { type: 'attack', damage: 7, status: 'burn', statusValue: 2, statusDuration: 2 } },
      { weight: 20, intent: { type: 'defend', block: 10 } },
      { weight: 10, intent: { type: 'debuff', status: 'weak', value: 1, duration: 2 } },
    ],
  },
  ashen_captain: {
    id: 'ashen_captain',
    nameFr: 'Capitaine Cendré',
    nameEn: 'Ashen Captain',
    hp: 95,
    posture: 'genjutsu',
    elementAffinity: 'doton',
    ai: 'pattern',
    pattern: [
      { type: 'attack', damage: 12 },
      { type: 'attack', damage: 12 },
      { type: 'defend', block: 14 },
      { type: 'buff', status: 'force', value: 3, duration: 2 },
    ],
  },
};

export function listEnemyTemplates() {
  return Object.values(ENEMY_TEMPLATES).map((t) => ({
    id: t.id,
    nameFr: t.nameFr,
    nameEn: t.nameEn,
    hp: t.hp,
    ai: t.ai,
  }));
}
