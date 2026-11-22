import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_SIZE_STORAGE_KEY,
  DEFAULT_CARD_SIZE,
  useCardSizePreference,
} from './useCardSizePreference.js';

function installLocalStorage() {
  const store = new Map();
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  globalThis.window = {
    localStorage,
    addEventListener() {},
  };
  globalThis.localStorage = localStorage;
}

installLocalStorage();

function resetPreference() {
  window.localStorage.removeItem(CARD_SIZE_STORAGE_KEY);
  const { setCardSize } = useCardSizePreference();
  setCardSize(DEFAULT_CARD_SIZE);
}

test('useCardSizePreference defaults to normal', () => {
  resetPreference();
  const { cardSize, isLargeCards } = useCardSizePreference();
  assert.equal(cardSize.value, 'normal');
  assert.equal(isLargeCards.value, false);
});

test('useCardSizePreference persists large preference', () => {
  resetPreference();
  const { cardSize, isLargeCards, setCardSize } = useCardSizePreference();
  setCardSize('large');
  assert.equal(cardSize.value, 'large');
  assert.equal(isLargeCards.value, true);
  assert.equal(window.localStorage.getItem(CARD_SIZE_STORAGE_KEY), 'large');
});

test('useCardSizePreference ignores invalid sizes', () => {
  resetPreference();
  const { cardSize, setCardSize } = useCardSizePreference();
  setCardSize('huge');
  assert.equal(cardSize.value, 'normal');
});
