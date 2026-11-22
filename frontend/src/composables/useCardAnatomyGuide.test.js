import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CARD_ANATOMY_DEMO, CARD_ANATOMY_STEPS } from '../constants/cardAnatomyDemo.js';

const here = dirname(fileURLToPath(import.meta.url));

test('anatomy steps cover chakra → figures → effects → identity', () => {
  assert.deepEqual([...CARD_ANATOMY_STEPS], ['chakra', 'figures', 'effects', 'identity']);
});

test('demo card exposes cost and the three colored figures', () => {
  assert.equal(CARD_ANATOMY_DEMO.cost, 2);
  assert.ok(CARD_ANATOMY_DEMO.damage > 0);
  assert.ok(CARD_ANATOMY_DEMO.block > 0);
  assert.ok(CARD_ANATOMY_DEMO.heal > 0);
  assert.ok((CARD_ANATOMY_DEMO.effects || []).length > 0);
});

test('locale files define anatomy guide copy', () => {
  for (const file of ['fr.json', 'en.json']) {
    const json = JSON.parse(readFileSync(join(here, '../locales', file), 'utf8'));
    const guide = json.cards?.anatomyGuide;
    assert.ok(guide, `${file} missing cards.anatomyGuide`);
    for (const step of CARD_ANATOMY_STEPS) {
      assert.ok(guide.steps?.[step]?.title, `${file} missing step ${step}.title`);
      assert.ok(guide.steps?.[step]?.body, `${file} missing step ${step}.body`);
    }
    assert.ok(guide.swatches?.damage);
    assert.ok(guide.swatches?.block);
    assert.ok(guide.swatches?.heal);
    assert.ok(guide.rulesLink);
    assert.ok(guide.dontShowAgain);
  }
});

test('guide storage key constant is present in composable source', () => {
  const src = readFileSync(join(here, 'useCardAnatomyGuide.js'), 'utf8');
  assert.match(src, /kage\.cardAnatomyGuide\.v1/);
  assert.match(src, /dontShowAgain/);
});

test('guide CSS keeps absolute figures during highlight (no layout break)', () => {
  const css = readFileSync(join(here, '../components/cards/CardDisplay.vue'), 'utf8');
  const match = css.match(
    /\.card-display--guide-chakra \.card-display__figures,\s*\n\.card-display--guide-figures \.card-display__figures,\s*\n\.card-display--guide-identity \.card-display__art-banners \{([^}]+)\}/
  );
  assert.ok(match, 'expected absolute-zone guide selector block');
  assert.match(match[1], /z-index:\s*20/);
  assert.doesNotMatch(match[1], /position:\s*relative/);
});
