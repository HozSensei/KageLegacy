import assert from 'node:assert/strict';
import { diagnose, parseJsCatalog } from './diagnoseExternalCatalog.js';

const card = {
  slug: 'test-externe', nameFr: 'Essai', nameEn: 'Trial', type: 'attack',
  statType: 'taijutsu', rarity: 'common', descriptionFr: 'Essai', descriptionEn: 'Trial',
  effects: [{ type: 'draw', value: 1 }, { type: 'nouvel_effet' }],
};
const js = `import { defineCard } from '../lib/cardFactory.js';\nexport const EXPANSION_V3_CARDS = [defineCard(${JSON.stringify(card)})];`;
assert.deepEqual(parseJsCatalog(js), [card]);
assert.throws(() => parseJsCatalog(js.replace('defineCard({', 'defineCard(process.exit(), {')));
assert.throws(() => parseJsCatalog(`${js}\nprocess.exit()`));
let result = diagnose([card], []);
assert.equal(result.normalized, 1);
assert.equal(result.errors.length, 0);
assert.equal(result.effects.draw.recognizedPve, true);
assert.equal(result.effects.nouvel_effet.recognizedPve, false);
assert.equal(result.warnings.length, 1);
result = diagnose([card, card], [card]);
assert(result.errors.some(e => e.includes('dupliqué')));
assert(result.errors.some(e => e.includes('déjà présent')));
result = diagnose([{ ...card, type: 'invalid', statType: 'invalid', effects: {} }], []);
assert(result.errors.some(e => e.includes('Invalid type')));
assert(result.errors.some(e => e.includes('statType')));
assert(result.errors.some(e => e.includes('effects')));
assert.throws(() => diagnose({}, []));
console.log('Diagnostic catalogue externe : tests réussis');
