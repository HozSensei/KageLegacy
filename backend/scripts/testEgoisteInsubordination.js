import { pickDefenderForTest } from '../src/services/combat/combatEngine.js';

function fighter(id, name, strategy, trait = 'Discipline') {
  return {
    id,
    name,
    ko: false,
    pv: 80,
    maxPv: 80,
    chakra: 40,
    maxChakra: 40,
    stats: { taijutsu: 12, ninjutsu: 10, genjutsu: 8, medecine: 6, vitesse: 10, intelligence: 10 },
    battle_strategy: strategy,
    character_trait: trait,
    element_affinity: 'Katon',
    status: null,
    side: 'away',
    equipment: {},
    equipmentUsage: {},
    protect_target_ninja_id: null,
  };
}

const defTeam = {
  fighters: [
    fighter(1, 'Tank', 'Tank'),
    fighter(2, 'Ninja B', 'Offensive'),
    fighter(3, 'Ninja C', 'Offensive'),
  ],
};

const egoiste = fighter(10, 'Ego', 'Offensive', 'Egoiste');
const disciplined = fighter(11, 'Disc', 'Offensive', 'Discipline');

const runs = 3000;
let egoisteOnTank = 0;
let normalOnTank = 0;

for (let i = 0; i < runs; i += 1) {
  const egoPick = pickDefenderForTest(defTeam, egoiste);
  if (egoPick.defender?.battle_strategy === 'Tank') egoisteOnTank += 1;

  const normPick = pickDefenderForTest(defTeam, disciplined);
  if (normPick.defender?.battle_strategy === 'Tank') normalOnTank += 1;
}

const egoPct = Math.round((egoisteOnTank / runs) * 100);
const normPct = Math.round((normalOnTank / runs) * 100);

console.assert(egoPct < 45, `Égoïste devrait cibler le Tank ~33 %, observé ${egoPct}%`);
console.assert(normPct > 55, `Attaquant normal devrait cibler le Tank >55 %, observé ${normPct}%`);

console.log(`testEgoisteInsubordination OK — Tank ciblé: Égoïste ${egoPct}% · normal ${normPct}% (${runs} tirages)`);
