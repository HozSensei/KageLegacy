import {
  applyEquipmentToFighter,
  getCycleSpeedPenalty,
  getGenjutsuDefenseBonus,
  tryConsumables,
  tryLethalMitigation,
} from '../src/services/combat/equipment.js';

function fighter(overrides = {}) {
  return {
    battle_strategy: 'Normal',
    stats: { taijutsu: 10, ninjutsu: 10, genjutsu: 8, vitesse: 8 },
    maxPv: 100,
    pv: 100,
    maxChakra: 50,
    chakra: 50,
    ...overrides,
  };
}

const herbes = [
  {
    slug: 'herbes-apaisantes',
    user_item_id: 1,
    effects: { match: { trigger: 'pv_below_pct', threshold: 20, pvRestore: 12, usesPerMatch: 1 } },
  },
];

let f = fighter({ pv: 15, maxPv: 100 });
applyEquipmentToFighter(f, herbes);
const used = tryConsumables(f);
console.assert(used.length === 1, 'Herbes proc sous 20 % PV');
console.assert(f.pv === 27, 'Herbes restaurent 12 PV');

const fumigene = [
  {
    slug: 'fumigene-secours',
    user_item_id: 2,
    effects: { match: { trigger: 'lethal_mitigation', damageReduction: 0.32, requiresStrategy: 'Tank', usesPerMatch: 1 } },
  },
];
f = fighter({ pv: 10, maxPv: 100, battle_strategy: 'Tank' });
applyEquipmentToFighter(f, fumigene);
const mitTank = tryLethalMitigation(f, 20);
console.assert(mitTank.mitigated && mitTank.damage === 13, 'Fumigène Tank −32 % fatal');

f = fighter({ pv: 10, maxPv: 100, battle_strategy: 'Offensive' });
applyEquipmentToFighter(f, fumigene);
const mitOff = tryLethalMitigation(f, 20);
console.assert(!mitOff.mitigated && mitOff.damage === 20, 'Fumigène ignoré hors consigne Tank');

const poids = [
  {
    slug: 'poids-entrainement',
    user_item_id: 3,
    effects: { cycle: { trigger: 'training_boost', multiplier: 1.2, speedPenalty: 2 } },
  },
];
f = fighter();
applyEquipmentToFighter(f, poids);
console.assert(getCycleSpeedPenalty(f) === 2, 'Poids −2 vitesse');

const rupture = [
  {
    slug: 'parchemin-rupture',
    user_item_id: 4,
    effects: { match: { trigger: 'genjutsu_defense', bonus: 4, usesPerMatch: 1 } },
  },
];
f = fighter();
applyEquipmentToFighter(f, rupture);
console.assert(getGenjutsuDefenseBonus(f) === 4, 'Parchemin rupture +4');
console.assert(getGenjutsuDefenseBonus(f) === 0, 'Parchemin rupture 1× seulement');

console.log('utility equipment tests OK');
