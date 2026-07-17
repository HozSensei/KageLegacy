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

/** Relance une sim jusqu'à trouver un log attendu (shuffle + d6). */
function findLog(build, predicate, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    const { home, away, homeDeck, awayDeck } = build();
    const result = simulatePliCombat(home, away, { homeDeck, awayDeck });
    const hit = result.logs.find(predicate);
    if (hit) return { result, hit };
  }
  return null;
}

assert(TAI_BONUS_NEXT > 1, 'constante Tai bonus > 1');
assert(GEN_MALUS_NEXT < 1, 'constante Gen malus < 1');

// Taijutsu victoire → bonus puissance au pli suivant
{
  const found = findLog(() => {
    const f1 = buildFighter(1, 'TaiA', { taijutsu: 30, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 20, intelligence: 5 }, 'Katon');
    const f2 = buildFighter(2, 'TaiB', { taijutsu: 8, ninjutsu: 8, genjutsu: 8, medecine: 8, vitesse: 8, intelligence: 8 }, 'Suiton');
    // PV élevés : le match ne finit pas avant qu'une carte Taijutsu soit jouée.
    f2.pv = f2.maxPv = 180;
    const picks = { 1: { primary: 'taijutsu', secondary: 'taijutsu' }, 2: { primary: 'taijutsu', secondary: 'ninjutsu' } };
    return {
      home: { label: 'home', fighters: [f1], sensei: { name: 'H' } },
      away: { label: 'away', fighters: [f2], sensei: { name: 'A' } },
      homeDeck: deckFor(picks),
      awayDeck: deckFor(picks),
    };
  }, (log) => log.domain_effect_home === 'tai_bonus_next');
  assert(found, 'victoire Taijutsu doit programmer le bonus +10 %');
}

// Genjutsu victoire → malus adverse au pli suivant
{
  const found = findLog(() => {
    const f1 = buildFighter(1, 'GenA', { genjutsu: 30, taijutsu: 5, ninjutsu: 5, medecine: 5, vitesse: 5, intelligence: 25 }, 'Raiton');
    const f2 = buildFighter(2, 'GenB', { genjutsu: 8, taijutsu: 8, ninjutsu: 8, medecine: 8, vitesse: 8, intelligence: 8 }, 'Doton');
    f2.pv = f2.maxPv = 180;
    const picks = { 1: { primary: 'genjutsu', secondary: 'genjutsu' }, 2: { primary: 'genjutsu', secondary: 'ninjutsu' } };
    return {
      home: { label: 'home', fighters: [f1], sensei: { name: 'H' } },
      away: { label: 'away', fighters: [f2], sensei: { name: 'A' } },
      homeDeck: deckFor(picks),
      awayDeck: deckFor(picks),
    };
  }, (log) => log.domain_effect_away === 'gen_malus_next');
  assert(found, 'victoire Genjutsu doit programmer le malus −10 % adverse');
}

// Médecine : soin si victoire
{
  const found = findLog(() => {
    const medic = buildFighter(1, 'Med', { medecine: 35, taijutsu: 5, ninjutsu: 5, genjutsu: 5, vitesse: 15, intelligence: 10 }, null);
    medic.pv = Math.max(8, Math.floor(medic.maxPv * 0.35));
    const awayF = buildFighter(3, 'Opp', { taijutsu: 4, ninjutsu: 4, genjutsu: 4, medecine: 4, vitesse: 4, intelligence: 4 }, null);
    awayF.pv = awayF.maxPv = 120;
    return {
      home: { label: 'home', fighters: [medic], sensei: { name: 'H' } },
      away: { label: 'away', fighters: [awayF], sensei: { name: 'A' } },
      homeDeck: deckFor({ 1: { primary: 'medecine', secondary: 'medecine' } }),
      awayDeck: deckFor({ 3: { primary: 'taijutsu', secondary: 'ninjutsu' } }),
    };
  }, (log) => (log.soins_pv || 0) > 0 || (log.soins_pv_away || 0) > 0);
  assert(found, 'victoire Médecine doit soigner');
}

// Médecine : dégâts réduits si défaite
{
  const found = findLog(() => {
    const medic = buildFighter(1, 'MedLose', { medecine: 5, taijutsu: 5, ninjutsu: 5, genjutsu: 5, vitesse: 5, intelligence: 5 }, null);
    medic.pv = medic.maxPv = 160;
    const bruiser = buildFighter(2, 'Bruiser', { taijutsu: 40, ninjutsu: 5, genjutsu: 5, medecine: 5, vitesse: 20, intelligence: 5 }, null);
    return {
      home: { label: 'home', fighters: [medic], sensei: { name: 'H' } },
      away: { label: 'away', fighters: [bruiser], sensei: { name: 'A' } },
      homeDeck: deckFor({ 1: { primary: 'medecine', secondary: 'medecine' } }),
      awayDeck: deckFor({ 2: { primary: 'taijutsu', secondary: 'taijutsu' } }),
    };
  }, (log) => log.med_fail || log.med_fail_away);
  assert(found, 'défaite Médecine doit marquer med_fail');
}

// Ninjutsu : roue élémentaire Katon > Futon
{
  const katon = buildFighter(1, 'Katon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Katon');
  const futon = buildFighter(2, 'Futon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Futon');
  const adv = computeCardPower(katon, 'ninjutsu', { opponentElement: 'Futon' });
  const neutral = computeCardPower(katon, 'ninjutsu', { opponentElement: 'Katon' });
  assert(adv > neutral, 'Katon doit avoir l\'avantage sur Futon en Ninjutsu');

  const found = findLog(() => {
    const k = buildFighter(1, 'Katon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Katon');
    const f = buildFighter(2, 'Futon', { ninjutsu: 20, taijutsu: 5, genjutsu: 5, medecine: 5, vitesse: 5, intelligence: 15 }, 'Futon');
    k.pv = k.maxPv = 160;
    f.pv = f.maxPv = 160;
    const picks = { 1: { primary: 'ninjutsu', secondary: 'ninjutsu' }, 2: { primary: 'ninjutsu', secondary: 'ninjutsu' } };
    return {
      home: { label: 'home', fighters: [k], sensei: { name: 'H' } },
      away: { label: 'away', fighters: [f], sensei: { name: 'A' } },
      homeDeck: deckFor(picks),
      awayDeck: deckFor(picks),
    };
  }, (log) => log.element_mod_home === 'advantage');
  assert(found, 'avantage élémentaire doit être journalisé');
}

console.log('testDomainPliEffects OK');
