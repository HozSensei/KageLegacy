import { applyEquipmentToFighter, getSituationalAttackBonus, getSituationalDefenseBonus } from '../src/services/combat/equipment.js';

function fighter(overrides = {}) {
  return {
    battle_strategy: 'Normal',
    stats: { taijutsu: 10, ninjutsu: 10, genjutsu: 8 },
    maxPv: 100,
    pv: 100,
    equipment: { modifiers: [], consumables: [] },
    ...overrides,
  };
}

const offensiveNinjutsuWeapon = [
  {
    slug: 'lame-chakra',
    effects: {
      modifiers: [
        {
          kind: 'attack',
          stat: 'ninjutsu',
          bonus: 2,
          when: { strategy: 'Offensive', technique: 'ninjutsu' },
        },
      ],
    },
  },
];

let f = fighter({ battle_strategy: 'Normal' });
applyEquipmentToFighter(f, offensiveNinjutsuWeapon);
console.assert(
  getSituationalAttackBonus(f, { type: 'ninjutsu', stat: 'ninjutsu' }) === 0,
  'Pas de bonus sans consigne Offensive'
);

f = fighter({ battle_strategy: 'Offensive' });
applyEquipmentToFighter(f, offensiveNinjutsuWeapon);
console.assert(
  getSituationalAttackBonus(f, { type: 'ninjutsu', stat: 'ninjutsu' }) === 2,
  'Bonus Offensive + ninjutsu'
);
console.assert(
  getSituationalAttackBonus(f, { type: 'taijutsu', stat: 'taijutsu' }) === 0,
  'Pas de bonus sur autre technique'
);

const tankVest = [
  {
    slug: 'gilet-mailles',
    effects: { modifiers: [{ kind: 'pv', bonus: 15, when: { strategy: 'Tank' } }] },
  },
];
f = fighter({ battle_strategy: 'Tank', maxPv: 100, pv: 100 });
applyEquipmentToFighter(f, tankVest);
console.assert(f.maxPv === 115, 'PV Tank +15');

f = fighter({ battle_strategy: 'Normal', maxPv: 100, pv: 100 });
applyEquipmentToFighter(f, tankVest);
console.assert(f.maxPv === 100, 'Pas de PV hors Tank');

const katonGloves = [
  {
    slug: 'gants-pare-feu',
    effects: { modifiers: [{ kind: 'element_resist', element: 'Katon', bonus: 2 }] },
  },
];
f = fighter();
applyEquipmentToFighter(f, katonGloves);
const atk = { element_affinity: 'Katon' };
console.assert(
  getSituationalDefenseBonus(f, { type: 'ninjutsu', stat: 'ninjutsu' }, atk) === 2,
  'Résistance Katon ninjutsu'
);
console.assert(
  getSituationalDefenseBonus(f, { type: 'taijutsu', stat: 'taijutsu' }, atk) === 0,
  'Pas de résistance taijutsu'
);

// Limite d'utilisation : 3 procs attaque max
f = fighter({ battle_strategy: 'Offensive' });
applyEquipmentToFighter(f, offensiveNinjutsuWeapon);
const tech = { type: 'ninjutsu', stat: 'ninjutsu' };
console.assert(getSituationalAttackBonus(f, tech) === 2, 'Proc 1');
console.assert(getSituationalAttackBonus(f, tech) === 2, 'Proc 2');
console.assert(getSituationalAttackBonus(f, tech) === 2, 'Proc 3');
console.assert(getSituationalAttackBonus(f, tech) === 0, 'Proc 4 bloquée');

console.log('equipment balance tests OK');
