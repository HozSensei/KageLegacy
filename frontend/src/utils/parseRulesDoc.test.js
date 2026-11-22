import assert from 'node:assert/strict';
import test from 'node:test';
import { filterRulesNav, parseRulesNav, slugifyHeading } from './parseRulesDoc.js';

const SAMPLE = `# Title

## Combat

### Statuses

Poison ticks.

## Missions and runs

### Ranks

## Update history

Old notes.
`;

test('parseRulesNav nests H3 under H2 and skips update history', () => {
  const nav = parseRulesNav(SAMPLE);
  assert.equal(nav.length, 2);
  assert.equal(nav[0].id, 'combat');
  assert.deepEqual(
    nav[0].children.map(c => c.id),
    ['statuses']
  );
  assert.equal(nav[1].id, 'missions-and-runs');
  assert.equal(nav[1].children[0].title, 'Ranks');
});

test('filterRulesNav keeps parent when a child matches', () => {
  const nav = parseRulesNav(SAMPLE);
  const filtered = filterRulesNav(nav, 'statuts');
  assert.equal(filtered.length, 0);

  const byChild = filterRulesNav(nav, 'statuses');
  assert.equal(byChild.length, 1);
  assert.equal(byChild[0].id, 'combat');
  assert.equal(byChild[0].children.length, 1);

  const byParent = filterRulesNav(nav, 'missions');
  assert.equal(byParent.length, 1);
  assert.equal(byParent[0].children.length, 1);
});

test('slugifyHeading strips accents and numbering', () => {
  assert.equal(slugifyHeading('1. Le PvP en arène'), 'le-pvp-en-arene');
});
