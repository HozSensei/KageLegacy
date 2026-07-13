#!/usr/bin/env node
/**
 * Effets de domaine PLI — Tai bonus, Gen malus, Médecine, roue élémentaire Ninjutsu.
 */
import { simulatePliCombat } from '../src/services/combat/pli/pliCombatEngine.js';
import { computeCardPower } from '../src/services/combat/pli/power.js';
import { applyFormeToStats } from '../src/services/combat/forme.js';
import { computeMatchPvFromRating } from '../src/services/ninjaStats.js';
import { TAI_BONUS_NEXT, GEN_MALUS_NEXT } from '../src/services/combat/pli/constants.js';

function buildFighter(id, name, stats, element) {
  const s = applyFormeToStats({ ...stats, weekly_forme: 'Passable' });
  const maxPv = computeMatchPvFromRating(s);
  return {
    id,
    name,
    side: 'home',
    element_affinity: element,
    stats: s,
    pv: maxPv,
    maxPv,
    ko: false,
    slot: 1,
  };
}

function deckFor(domainsByFighterId) {
  const techniquesByNinjaId = {};
  const rawTechniquesByNinjaId = {};
  for (const [id, picks] of Object.entries(domainsByFighterId)) {
    techniquesByNinjaId[id] = picks;
    rawTechniquesByNinjaId[id] = picks;
  }
  return {
    techniquesByNinjaId,
    rawTechniquesByNinjaId,
    techniqueSlotsByNinjaId: {},
    techniqueCardsById: {},
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Taijutsu victoire → bonus puissance au pli suivant
{
  const f1 = buildFighter(1, 'TaiA', { taijutsu: 30, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 20, intelligence: 5 }, 'Katon');
  const f2 = buildFighter(2, 'TaiB', { taijutsu: 8, ninjutsu: 8, genjutsu: 8, medecine: 8, vitesse: 8, intelligence: 8 }, 'Suiton');
  const home = { label: 'home', fighters: [f1], sensei: { name: 'H' } };
  const away = { label: 'away', fighters: [f2], sensei: { name: 'A' } };
  const picks = { 1: { primary: 'taijutsu', secondary: 'ninjutsu' }, 2: { primary: 'taijutsu', secondary: 'ninjutsu' } };
  const result = simulatePliCombat(home, away, { homeDeck: deckFor(picks), awayDeck: deckFor(picks) });
  const taiWin = result.logs.find((log) => log.domain_effect_home === 'tai_bonus_next');
  assert(taiWin, 'victoire Taijutsu doit programmer le bonus +10 %');
  const base = computeCardPower(f1, 'taijutsu', { nextMod: 1 });
  const boosted = computeCardPower(f1, 'taijutsu', { nextMod: TAI_BONUS_NEXT });
  assert(boosted > base, 'modificateur Tai +10 % augmente la puissance');
}

// Genjutsu victoire → malus adverse au pli suivant
{
  const f1 = buildFighter(1, 'GenA', { genjutsu: 30, taijutsu: 5, ninjutsu: 5, medecine: 5, vitesse: 5, intelligence: 25 }, 'Raiton');
  const f2 = buildFighter(2, 'GenB', { genjutsu: 8, taijutsu: 8, ninjutsu: 8, medecine: 8, vitesse: 8, intelligence: 8 }, 'Doton');
  const home = { label: 'home', fighters: [f1], sensei: { name: 'H' } };
  const away = { label: 'away', fighters: [f2], sensei: { name: 'A' } };
  const picks = { 1: { primary: 'genjutsu', secondary: 'ninjutsu' }, 2: { primary: 'genjutsu', secondary: 'ninjutsu' } };
  const result = simulatePliCombat(home, away, { homeDeck: deckFor(picks), awayDeck: deckFor(picks) });
  const genWin = result.logs.find((log) => log.domain_effect_away === 'gen_malus_next');
  assert(genWin, 'victoire Genjutsu doit programmer le malus −10 % adverse');
  const base = computeCardPower(f2, 'genjutsu', { nextMod: 1 });
  const malus = computeCardPower(f2, 'genjutsu', { nextMod: GEN_MALUS_NEXT });
  assert(malus < base, 'modificateur Gen −10 % réduit la puissance');
}

// Médecine : soin si victoire
{
  const medic = buildFighter(1, 'Med', { medecine: 35, taijutsu: 5, ninjutsu: 5, genjutsu: 5, vitesse: 15, intelligence: 10 }, null);
  medic.pv = Math.floor(medic.maxPv * 0.4);
  const weak = buildFighter(2, 'Weak', { taijutsu: 5, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 5 }, null);
  const home = { label: 'home', fighters: [medic, weak], sensei: { name: 'H' } };
  const awayF = buildFighter(3, 'Opp', { taijutsu: 5, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 5 }, null);
  const away = { label: 'away', fighters: [awayF], sensei: { name: 'A' } };
  const homeDeck = deckFor({
    1: { primary: 'medecine', secondary: 'taijutsu' },
    2: { primary: 'taijutsu', secondary: 'ninjutsu' },
  });
  const awayDeck = deckFor({ 3: { primary: 'taijutsu', secondary: 'ninjutsu' } });
  const before = medic.pv;
  const result = simulatePliCombat(home, away, { homeDeck, awayDeck });
  const medHeal = result.logs.find((log) => (log.soins_pv || 0) > 0 || (log.soins_pv_away || 0) > 0);
  assert(medHeal || medic.pv > before, 'victoire Médecine doit soigner');
}

// Médecine : dégâts réduits si défaite
{
  const medic = buildFighter(1, 'MedLose', { medecine: 5, taijutsu: 5, ninjutsu: 5, genjutsu: 5, vitesse: 5, intelligence: 5 }, null);
  const bruiser = buildFighter(2, 'Bruiser', { taijutsu: 40, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 20, intelligence: 5 }, null);
  const home = { label: 'home', fighters: [medic], sensei: { name: 'H' } };
  const away = { label: 'away', fighters: [bruiser], sensei: { name: 'A' } };
  const picks = { 1: { primary: 'medecine', secondary: 'taijutsu' }, 2: { primary: 'taijutsu', secondary: 'ninjutsu' } };
  const result = simulatePliCombat(home, away, { homeDeck: deckFor(picks), awayDeck: deckFor(picks) });
  const medFail = result.logs.find((log) => log.med_fail || log.med_fail_away);
  assert(medFail, 'défaite Médecine doit marquer med_fail');
}

// Ninjutsu : roue élémentaire Katon > Futon
{
  const katon = buildFighter(1, 'Katon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Katon');
  const futon = buildFighter(2, 'Futon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Futon');
  const adv = computeCardPower(katon, 'ninjutsu', { opponentElement: 'Futon' });
  const neutral = computeCardPower(katon, 'ninjutsu', { opponentElement: 'Katon' });
  assert(adv > neutral, 'Katon doit avoir l\'avantage sur Futon en Ninjutsu');
  const home = { label: 'home', fighters: [katon], sensei: { name: 'H' } };
  const away = { label: 'away', fighters: [futon], sensei: { name: 'A' } };
  const picks = { 1: { primary: 'ninjutsu', secondary: 'taijutsu' }, 2: { primary: 'ninjutsu', secondary: 'taijutsu' } };
  const result = simulatePliCombat(home, away, { homeDeck: deckFor(picks), awayDeck: deckFor(picks) });
  const elementLog = result.logs.find((log) => log.element_mod_home === 'advantage');
  assert(elementLog, 'avantage élémentaire doit être journalisé');
}

console.log('testDomainPliEffects OK');
