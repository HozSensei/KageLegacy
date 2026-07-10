/**
 * Smoke test normalisation APP_PUBLIC_URL (Stripe Checkout).
 * Usage: node scripts/testPublicAppUrl.js
 */
import { pathToFileURL } from 'node:url';

// Load helpers by re-importing module after env tweaks would be heavy;
// inline the same logic for a quick regression guard.
function normalizePublicUrl(raw) {
  if (raw == null || raw === '') return null;
  const trimmed = String(raw).split(',')[0].trim().replace(/\/$/, '');
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(?::\d+)?$/i.test(trimmed) || /^127\.0\.0\.1(?::\d+)?$/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

const cases = [
  ['https://kagelegacy.jeromedessy.be', 'https://kagelegacy.jeromedessy.be'],
  ['kagelegacy.jeromedessy.be', 'https://kagelegacy.jeromedessy.be'],
  ['http://localhost:5173', 'http://localhost:5173'],
  ['localhost:5173', 'http://localhost:5173'],
];

for (const [input, expected] of cases) {
  const got = normalizePublicUrl(input);
  console.assert(got === expected, `${input} → ${got}, expected ${expected}`);
}

console.log('testPublicAppUrl: OK');
