import assert from 'node:assert/strict';
import test from 'node:test';
import { createI18n } from 'vue-i18n';
import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };

function collectStrings(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.push([path, value]);
    else if (value && typeof value === 'object') out.push(...collectStrings(value, path));
  }
  return out;
}

function assertLocaleCompiles(locale, messages) {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { [locale]: messages },
    missingWarn: false,
    fallbackWarn: false,
  });
  const { t } = i18n.global;
  const failures = [];
  for (const [path] of collectStrings(messages.admin?.balance || {})) {
    const key = `admin.balance.${path}`;
    try {
      t(key);
    } catch (error) {
      failures.push(`${key}: ${error.message}`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
}

test('admin.balance FR compile sans SyntaxError linked (@)', () => {
  assertLocaleCompiles('fr', fr);
  const i18n = createI18n({
    legacy: false,
    locale: 'fr',
    messages: { fr },
    missingWarn: false,
    fallbackWarn: false,
  });
  assert.match(i18n.global.t('admin.balance.colHp'), /PV/i);
  assert.equal(fr.admin.balance.colHp.includes('@'), false);
});

test('admin.balance EN compile sans SyntaxError linked (@)', () => {
  assertLocaleCompiles('en', en);
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
    missingWarn: false,
    fallbackWarn: false,
  });
  assert.match(i18n.global.t('admin.balance.colHp'), /HP/i);
  assert.equal(en.admin.balance.colHp.includes('@'), false);
});
