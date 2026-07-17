/**
 * Tests effets de cartes technique en combat PLI.
 */
import {
  applyLoseDamageReduction,
  computeWinBonusDamage,
  computeDrawHeal,
  computeHealBonus,
  cardDefForCombat,
} from '../src/services/combat/pli/cardEffectRegistry.js';
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import { createBalancedSquad } from '../src/services/simulation/cycleSimulator.js';

function cardDef(slug, overrides = {}) {
  return cardDefForCombat({
    slug,
    statType: 'taijutsu',
    pliBonusPct: 0.2,
    triggerKind: overrides.triggerKind,
    effectKind: overrides.effectKind,
    effectParams: overrides.effectParams,
    ...overrides,
  });
}

function testRegistry() {
  const fighter = {
    stats: { taijutsu: 12, ninjutsu: 10, genjutsu: 8, medecine: 6, vitesse: 14, intelligence: 9 },
  };

  const reduced = applyLoseDamageReduction(
    10,
    cardDef('mur', {
      triggerKind: 'pli_lose',
      effectKind: 'damage_reduction_pct',
      effectParams: { pct: 0.2 },
    })
  );
  console.assert(reduced === 8, `damage reduction, got ${reduced}`);

  const bonus = computeWinBonusDamage(
    fighter,
    cardDef('poing', {
      triggerKind: 'pli_win',
      effectKind: 'bonus_damage',
      effectParams: { flat: 2, scaleStat: 'vitesse', scaleDiv: 8 },
    })
  );
  console.assert(bonus >= 3, `bonus damage, got ${bonus}`);

  const drawHeal = computeDrawHeal(
    fighter,
    cardDef('brume', {
      triggerKind: 'pli_draw',
      effectKind: 'heal_flat',
      effectParams: { flat: 5 },
    })
  );
  console.assert(drawHeal === 5, `draw heal, got ${drawHeal}`);

  const healBonus = computeHealBonus(
    fighter,
    cardDef('flux', {
      triggerKind: 'pli_win',
      effectKind: 'heal_bonus',
      effectParams: { flat: 4, scaleStat: 'medecine', scaleDiv: 5 },
    }),
    10
  );
  console.assert(healBonus > 10, `heal bonus, got ${healBonus}`);
}

function buildTeam(ninjas, label) {
  const fighters = ninjas.map((ninja, index) => {
    const stats = applyFormeToStats(ninja);
    const maxPv = computeMatchPvFromRating(stats);
    return {
      id: ninja.id,
      name: ninja.name,
      side: label,
      element_affinity: ninja.element_affinity,
      stats,
      pv: maxPv,
      maxPv,
      ko: false,
      slot: index + 1,
    };
  });
  return { label, fighters, sensei: { name: label } };
}

function testCombatWithEffectCard() {
  const effectCard = {
    userTacticCardId: 9001,
    slug: 'tai-poing-chakra',
    nameFr: 'Poing de chakra',
    statType: 'taijutsu',
    pliSecondaryStat: 'vitesse',
    pliBonusPct: 0.25,
    triggerKind: 'pli_win',
    effectKind: 'bonus_damage',
    effectParams: { flat: 5, scaleStat: 'vitesse', scaleDiv: 5 },
  };

  let withBonus = false;
  let logsLen = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const squadA = createBalancedSquad('A', 0, 1.2);
    const squadB = createBalancedSquad('B', 10, 0.9);
    const home = buildTeam(squadA, 'home');
    const away = buildTeam(squadB, 'away');
    // PV élevés pour laisser le temps à la carte technique d'être jouée avant un KO d'équipe.
    for (const f of [...home.fighters, ...away.fighters]) {
      f.pv = f.maxPv = Math.max(f.maxPv, 120);
    }

    const slots = { [home.fighters[0].id]: [9001] };
    const deck = {
      techniqueSlotsByNinjaId: slots,
      techniqueCardsById: { 9001: effectCard },
      techniquesByNinjaId: {
        [home.fighters[0].id]: { primary: 'taijutsu', secondary: 'ninjutsu' },
        [home.fighters[1].id]: { primary: 'ninjutsu', secondary: 'genjutsu' },
        [home.fighters[2].id]: { primary: 'genjutsu', secondary: 'medecine' },
      },
      rawTechniquesByNinjaId: {
        [home.fighters[0].id]: { primary: 'taijutsu', secondary: 'ninjutsu' },
        [home.fighters[1].id]: { primary: 'ninjutsu', secondary: 'genjutsu' },
        [home.fighters[2].id]: { primary: 'genjutsu', secondary: 'medecine' },
      },
    };

    const result = simulatePliCombat(home, away, { homeDeck: deck, awayDeck: deck });
    logsLen = result.logs.length;
    if (result.logs.some((log) => (log.bonus_degats ?? 0) > 0)) {
      withBonus = true;
      break;
    }
  }

  console.assert(logsLen > 0, 'combat with effect cards runs');
  console.assert(withBonus, 'bonus damage effect can proc in combat');
}

testRegistry();
testCombatWithEffectCard();
console.log('testCardEffects: OK');
