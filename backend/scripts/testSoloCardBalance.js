import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_CARDS } from './seedCards.js';
import { prototypeCard } from './data/cardBalancePrototype.js';
import { applyUpgradeBonuses } from '../src/services/cardService.js';
import { applyCardPlay, computeCardDamage } from '../src/services/deckCombat/cardEffects.js';
import { applySoloCardBalance } from '../src/services/deckCombat/soloCardBalance.js';

const resolve = (def, level = 0) => ({ ...def, ...applyUpgradeBonuses(def, level) });
function seeded(slug, level) {
  const def = ALL_CARDS.find(card => card.slug === slug);
  assert.ok(def, slug);
  return resolve(def, level);
}

const rng = () => 0.99;
function play(card, player = {}) {
  return applyCardPlay({
    card,
    stats: {},
    player: { hp: 25, maxHp: 100, chakra: 6, statuses: [], ...player },
    enemy: { hp: 100, statuses: [] },
    rng,
  });
}

const active = ({ cost, damage, block, heal, effects }) => ({ cost, damage, block, heal, effects });

test('Ninjutsu : même profil actif que le prototype pour tout le catalogue aux niveaux 0–2', () => {
  const roles = new Set();
  for (const def of ALL_CARDS.filter(card => card.statType === 'ninjutsu')) {
    for (const level of [0, 1, 2]) {
      const card = resolve(def, level);
      const actual = applySoloCardBalance(card);
      assert.deepEqual(active(actual), active(prototypeCard(card)), `${def.slug} +${level}`);
      roles.add(actual.combatRole);
    }
  }
  assert.ok(['opener', 'pressure', 'burst', 'guard', 'setup'].every(role => roles.has(role)));
});

test('Ninjutsu : le rôle suit le coût catalogue et le bonus exige une cible déjà vulnérable', () => {
  const original = seeded('lance-de-foudre', 2);
  const burst = applySoloCardBalance(original);
  assert.equal(burst.combatRole, 'burst');
  assert.equal(burst.cost, 4);
  assert.equal(burst.baseCost, 3);
  assert.equal(burst.damage, original.damage + 4);
  const vulnerable = { key: 'vulnerable', value: 1, duration: 1 };
  assert.equal(computeCardDamage(burst, { rng }).total, burst.damage);
  assert.equal(play(burst).enemy.hp, 100 - burst.damage);
  assert.equal(
    computeCardDamage(burst, { enemyStatuses: [vulnerable], rng }).total,
    Math.round((burst.damage + 3) * 1.5),
  );

  const multi = seeded('jugement-des-quatre-vents');
  const balancedMulti = applySoloCardBalance(multi);
  assert.equal(balancedMulti.cost, 5);
  assert.equal(balancedMulti.damage, multi.damage);
  assert.strictEqual(balancedMulti.effects, multi.effects);

  const opener = applySoloCardBalance({ ...seeded('vague-brumeuse'), damage: 1, cost: 0 });
  assert.deepEqual([opener.combatRole, opener.cost, opener.damage], ['opener', 0, 1]);
});

test('Taijutsu : les chaînes légères et les ripostes gagnent un bonus, pas les multi-frappes', () => {
  const original = seeded('coup-de-coude');
  const chain = applySoloCardBalance(original);
  assert.equal(chain.combatRole, 'combo_strike');
  assert.equal(chain.cost, original.cost);
  assert.equal(play(chain).enemy.hp, play(original).enemy.hp);
  assert.equal(
    play(chain, { previousCardStatType: 'taijutsu' }).enemy.hp,
    play(original, { previousCardStatType: 'taijutsu' }).enemy.hp - 1,
  );

  const guard = seeded('contre-tranchant');
  const counter = applySoloCardBalance(guard);
  assert.equal(counter.combatRole, 'riposte');
  assert.equal(counter.block, guard.block);
  assert.ok(play(counter).logs.some(log => log.type === 'counter_ready' && log.damage === 8));

  const multi = seeded('rafale-de-shuriken', 2);
  const balancedMulti = applySoloCardBalance(multi);
  assert.equal(balancedMulti.combatRole, 'multi_strike');
  assert.deepEqual(active(balancedMulti), active(multi));
});

test('Genjutsu : faiblesse courte ou petite esquive, sans renforcer les cartes hybrides', () => {
  const mask = seeded('masque-de-brume');
  const control = applySoloCardBalance(mask);
  assert.equal(control.combatRole, 'control');
  assert.equal(control.cost, mask.cost);
  assert.deepEqual(play(control).enemy.statuses, [{ key: 'weak', value: 1, duration: 2 }]);

  const evade = applySoloCardBalance(seeded('voile-de-brise'));
  assert.equal(evade.combatRole, 'evasion');
  assert.ok(play(evade).logs.some(log => log.type === 'evade_ready' && log.chance === 0.45));
  const hybrid = seeded('brouillard-de-souvenance');
  assert.deepEqual(active(applySoloCardBalance(hybrid)), active(hybrid));
  const free = seeded('echo-de-l-absence');
  assert.deepEqual(active(applySoloCardBalance(free)), active(free));
});

test('Médecine : bonus de soin au triage payant, sans toucher au soin pur ni au triage gratuit', () => {
  const original = seeded('purge-toxique', 2);
  const triage = applySoloCardBalance(original);
  assert.equal(triage.combatRole, 'triage');
  assert.equal(triage.heal, original.heal + 2);
  assert.strictEqual(triage.effects, original.effects);
  const player = { statuses: [{ key: 'poison', value: 1, duration: 1 }] };
  const played = play(triage, player);
  assert.equal(played.player.hp, 25 + original.heal + 2);
  assert.deepEqual(played.player.statuses, []);

  for (const slug of ['baume-de-cendre', 'paume-apaisante', 'ancrage-profond']) {
    const card = seeded(slug);
    assert.deepEqual(active(applySoloCardBalance(card)), active(card), slug);
  }
});

test('Objets, invocations et héritages : rôles distincts, profil actif conservé', () => {
  for (const [slug, role] of [
    ['kunai-de-fer', 'consumable'],
    ['clone-de-combat', 'summon'],
    ['clan-kazamine', 'heritage'],
  ]) {
    const card = seeded(slug);
    assert.deepEqual(applySoloCardBalance(card), { ...card, combatRole: role });
  }
});

test('Projection pure : pas de mutation, passifs et données catalogue conservés', () => {
  const original = seeded('contre-tranchant', 2);
  const snapshot = structuredClone(original);
  original.effects.forEach(Object.freeze);
  Object.freeze(original.effects);
  Object.freeze(original.passiveBonus);
  Object.freeze(original);

  const balanced = applySoloCardBalance(original);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(balanced, applySoloCardBalance(original));
  for (const key of [
    'passiveBonus',
    'passiveDescriptionFr',
    'passiveDescriptionEn',
    'heldEffect',
    'upgradeBonuses',
    'baseCost',
    'baseDamage',
    'baseBlock',
    'baseHeal',
    'critChance',
  ]) {
    assert.strictEqual(balanced[key], original[key], key);
  }
});

test('Affichage de combat : pas de texte catalogue si les chiffres ou effets divergent', () => {
  for (const card of [
    seeded('lance-de-foudre'),
    seeded('contre-tranchant'), // changement d’effet seul
    seeded('carapace-de-fer', 2), // amélioration seule
  ]) {
    assert.ok(card.descriptionFr && card.descriptionEn);
    const balanced = applySoloCardBalance(card);
    assert.equal(balanced.descriptionFr, null, card.slug);
    assert.equal(balanced.descriptionEn, null, card.slug);
  }
  const unchanged = seeded('carapace-de-fer');
  const balanced = applySoloCardBalance(unchanged);
  assert.equal(balanced.descriptionFr, unchanged.descriptionFr);
  assert.equal(balanced.descriptionEn, unchanged.descriptionEn);
});
