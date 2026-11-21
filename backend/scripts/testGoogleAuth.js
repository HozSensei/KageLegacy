/**
 * Tests config / validation Google auth (sans appel réseau ni DB).
 * Usage: node scripts/testGoogleAuth.js
 */
import assert from 'node:assert/strict';

delete process.env.GOOGLE_CLIENT_ID;

const { getGoogleAuthPublicConfig, isGoogleAuthConfigured, verifyGoogleIdToken } =
  await import('../src/services/googleAuthService.js');
const { googleLoginSchema } = await import('../src/validators/auth.js');

assert.equal(isGoogleAuthConfigured(), false, 'sans env → désactivé');
assert.deepEqual(getGoogleAuthPublicConfig(), { enabled: false, clientId: null });

await assert.rejects(
  () => verifyGoogleIdToken('fake.token.value.here'),
  err => err.statusCode === 503,
  'verify sans config → 503',
);

process.env.GOOGLE_CLIENT_ID = '  test-client-id.apps.googleusercontent.com  ';
assert.equal(isGoogleAuthConfigured(), true, 'client id trimé');
assert.deepEqual(getGoogleAuthPublicConfig(), {
  enabled: true,
  clientId: 'test-client-id.apps.googleusercontent.com',
});

const parsed = googleLoginSchema.parse({
  idToken: 'a'.repeat(40),
  language: 'en',
});
assert.equal(parsed.language, 'en');
assert.equal(parsed.avatarId, undefined);

assert.throws(
  () => googleLoginSchema.parse({ idToken: 'short' }),
  /Jeton Google/,
  'idToken trop court rejeté',
);

console.log('testGoogleAuth: OK');
