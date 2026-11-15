/**
 * Tests exhaustifs triade tactique + roue élémentaire.
 *
 * npm run test:type-advantage --prefix backend
 *
 * Couvre :
 * - chaque matchup clé de la triade (Tai > Gen > Nin > Tai)
 * - chaque arête de la roue (Katon > Futon > Raiton > Doton > Suiton > Katon)
 * - neutres / médecine / casse / null
 * - intégration légère via computeCardDamage / applyCardPlay
 */
import {
  ELEMENT_ADV_MULT,
  ELEMENT_BEATS_TABLE,
  ELEMENT_DISADV_MULT,
  TYPE_ADVANTAGE_MULT,
  TYPE_ADVANTAGE_TABLE,
  elementMultiplier,
  getElementAdvantage,
  getTypeAdvantage,
  typeAdvantageMultiplier,
} from '../src/services/deckCombat/typeAdvantage.js';
import { computeCardDamage, applyCardPlay } from '../src/services/deckCombat/cardEffects.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const TYPES = ['taijutsu', 'genjutsu', 'ninjutsu'];
const ELEMENTS = ['katon', 'futon', 'raiton', 'doton', 'suiton'];

console.log('=== Constantes documentées ===');
assert(TYPE_ADVANTAGE_MULT === 1.2, 'triade avantage ×1.2 (COMBAT_SYSTEM.md)');
assert(ELEMENT_ADV_MULT === 1.5, 'élément avantage ×1.5');
assert(ELEMENT_DISADV_MULT === 0.7, 'élément désavantage ×0.7');
assert(
  TYPE_ADVANTAGE_TABLE.taijutsu === 'genjutsu' &&
    TYPE_ADVANTAGE_TABLE.genjutsu === 'ninjutsu' &&
    TYPE_ADVANTAGE_TABLE.ninjutsu === 'taijutsu',
  'table triade Tai>Gen>Nin>Tai',
);
assert(
  ELEMENT_BEATS_TABLE.katon === 'futon' &&
    ELEMENT_BEATS_TABLE.futon === 'raiton' &&
    ELEMENT_BEATS_TABLE.raiton === 'doton' &&
    ELEMENT_BEATS_TABLE.doton === 'suiton' &&
    ELEMENT_BEATS_TABLE.suiton === 'katon',
  'table éléments Katon>Futon>Raiton>Doton>Suiton>Katon',
);

console.log('\n=== Triade — matchups avantage ===');
for (const [atk, def] of Object.entries(TYPE_ADVANTAGE_TABLE)) {
  const r = getTypeAdvantage(atk, def);
  assert(r.relation === 'advantage' && r.multiplier === 1.2, `${atk} > ${def} → ×1.2`);
  assert(typeAdvantageMultiplier(atk, def) === 1.2, `typeAdvantageMultiplier(${atk},${def})`);
}

console.log('\n=== Triade — neutres (même type + reverse + hors-cycle) ===');
for (const t of TYPES) {
  assert(getTypeAdvantage(t, t).relation === 'neutral', `${t} vs ${t} neutre`);
}
assert(getTypeAdvantage('taijutsu', 'ninjutsu').multiplier === 1, 'tai vs nin neutre (pas de malus)');
assert(getTypeAdvantage('genjutsu', 'taijutsu').multiplier === 1, 'gen vs tai neutre');
assert(getTypeAdvantage('ninjutsu', 'genjutsu').multiplier === 1, 'nin vs gen neutre');

console.log('\n=== Triade — médecine toujours neutre ===');
for (const t of TYPES) {
  assert(getTypeAdvantage('medicine', t).multiplier === 1, `medicine vs ${t}`);
  assert(getTypeAdvantage(t, 'medicine').multiplier === 1, `${t} vs medicine`);
}
assert(getTypeAdvantage('medicine', 'medicine').multiplier === 1, 'medicine vs medicine');

console.log('\n=== Triade — null / casse ===');
assert(getTypeAdvantage(null, 'genjutsu').multiplier === 1, 'attacker null → 1');
assert(getTypeAdvantage('taijutsu', null).multiplier === 1, 'defender null → 1');
assert(getTypeAdvantage('Taijutsu', 'Genjutsu').multiplier === 1.2, 'casse Titre → avantage');
assert(getTypeAdvantage(' TAIJUTSU ', ' genjutsu ').multiplier === 1.2, 'trim + casse');

console.log('\n=== Triade — matrice 3×3 complète ===');
for (const atk of TYPES) {
  for (const def of TYPES) {
    const expected =
      TYPE_ADVANTAGE_TABLE[atk] === def ? TYPE_ADVANTAGE_MULT : 1;
    const got = typeAdvantageMultiplier(atk, def);
    assert(got === expected, `matrice ${atk}→${def} = ${expected} (got ${got})`);
  }
}

console.log('\n=== Éléments — chaque arête avantage ===');
for (const [atk, def] of Object.entries(ELEMENT_BEATS_TABLE)) {
  const r = getElementAdvantage(atk, def);
  assert(r.relation === 'advantage' && r.multiplier === 1.5, `${atk} > ${def} → ×1.5`);
}

console.log('\n=== Éléments — chaque arête désavantage (reverse) ===');
for (const [atk, def] of Object.entries(ELEMENT_BEATS_TABLE)) {
  // def bat atk ? non : atk bat def, donc def vs atk = désavantage pour def... 
  // reverse : quand defender beats attacker → attacker takes disadvantage
  const r = getElementAdvantage(def, atk);
  assert(
    r.relation === 'disadvantage' && r.multiplier === 0.7,
    `${def} vs ${atk} (reverse de ${atk}>${def}) → ×0.7`,
  );
}

console.log('\n=== Éléments — neutres (même + skip-one) ===');
for (const el of ELEMENTS) {
  assert(getElementAdvantage(el, el).relation === 'neutral', `${el} vs ${el}`);
}
// Katon vs Raiton = skip one → neutre ; Katon vs Doton = skip two → neutre
assert(getElementAdvantage('katon', 'raiton').multiplier === 1, 'katon vs raiton neutre');
assert(getElementAdvantage('katon', 'doton').multiplier === 1, 'katon vs doton neutre');
assert(getElementAdvantage('futon', 'suiton').multiplier === 1, 'futon vs suiton neutre');

console.log('\n=== Éléments — matrice 5×5 complète ===');
for (const atk of ELEMENTS) {
  for (const def of ELEMENTS) {
    let expected = 1;
    if (ELEMENT_BEATS_TABLE[atk] === def) expected = ELEMENT_ADV_MULT;
    else if (ELEMENT_BEATS_TABLE[def] === atk) expected = ELEMENT_DISADV_MULT;
    const got = elementMultiplier(atk, def);
    assert(got === expected, `matrice ${atk}→${def} = ${expected} (got ${got})`);
  }
}

console.log('\n=== Éléments — null / casse ===');
assert(elementMultiplier(null, 'futon') === 1, 'attacker null');
assert(elementMultiplier('katon', null) === 1, 'defender null');
assert(elementMultiplier('Katon', 'Futon') === 1.5, 'casse Titre');
assert(elementMultiplier('SUITON', 'katon') === 1.5, 'suiton > katon casse');

console.log('\n=== Intégration légère — computeCardDamage ===');
const baseCard = {
  slug: 'test-fist',
  type: 'attack',
  statType: 'taijutsu',
  element: null,
  cost: 1,
  damage: 10,
  effects: [],
};
const noCrit = () => 0.99; // never crit
const stats = { taijutsu: 0, vitesse: 0 }; // base = 10

const dmgAdv = computeCardDamage(baseCard, {
  stats,
  enemyPosture: 'genjutsu',
  rng: noCrit,
});
const dmgNeutral = computeCardDamage(baseCard, {
  stats,
  enemyPosture: 'taijutsu',
  rng: noCrit,
});
const dmgVsNin = computeCardDamage(baseCard, {
  stats,
  enemyPosture: 'ninjutsu',
  rng: noCrit,
});
assert(dmgAdv.total === 12, `tai>gen : 10×1.2 = 12 (got ${dmgAdv.total})`);
assert(dmgNeutral.total === 10, `tai vs tai : 10 (got ${dmgNeutral.total})`);
assert(dmgVsNin.total === 10, `tai vs nin : 10 neutre (got ${dmgVsNin.total})`);
assert(dmgAdv.total > dmgVsNin.total, 'favorable > défavorable/neutre (triade)');

const fireCard = { ...baseCard, slug: 'fireball', statType: 'ninjutsu', element: 'katon', damage: 10 };
const ninStats = { ninjutsu: 0, vitesse: 0 };
const dmgElAdv = computeCardDamage(fireCard, {
  stats: ninStats,
  enemyAffinity: 'futon',
  rng: noCrit,
});
const dmgElDis = computeCardDamage(fireCard, {
  stats: ninStats,
  enemyAffinity: 'suiton',
  rng: noCrit,
});
const dmgElNeu = computeCardDamage(fireCard, {
  stats: ninStats,
  enemyAffinity: 'raiton',
  rng: noCrit,
});
assert(dmgElAdv.total === 15, `katon>futon : 10×1.5 = 15 (got ${dmgElAdv.total})`);
assert(dmgElDis.total === 7, `katon<suiton : 10×0.7 = 7 (got ${dmgElDis.total})`);
assert(dmgElNeu.total === 10, `katon vs raiton : 10 (got ${dmgElNeu.total})`);
assert(dmgElAdv.total > dmgElNeu.total && dmgElNeu.total > dmgElDis.total, 'élément adv > neu > dis');

console.log('\n=== Intégration légère — applyCardPlay outcome ===');
function playVs(enemy) {
  return applyCardPlay({
    player: {
      hp: 100,
      maxHp: 100,
      block: 0,
      chakra: 3,
      statuses: [],
      hand: [],
      drawPile: [],
      discardPile: [],
      exhaustPile: [],
    },
    enemy: { hp: 100, maxHp: 100, block: 0, statuses: [], ...enemy },
    card: fireCard,
    stats: ninStats,
    rng: noCrit,
  });
}
const playAdv = playVs({ posture: 'taijutsu', elementAffinity: 'futon' }); // nin>tai + katon>futon
const playDis = playVs({ posture: 'genjutsu', elementAffinity: 'suiton' }); // nin vs gen neutre + katon<suiton
// Combined: adv posture (nin>tai = 1.2) * element adv (1.5) = 1.8 → 18
// dis: posture neutral * 0.7 = 7
assert(playAdv.enemy.hp === 100 - 18, `combo adv hp 82 (got ${playAdv.enemy.hp})`);
assert(playDis.enemy.hp === 100 - 7, `combo dis hp 93 (got ${playDis.enemy.hp})`);
assert(playAdv.enemy.hp < playDis.enemy.hp, 'favorable deal more damage than défavorable');

console.log(`\n=== Résultat : ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
