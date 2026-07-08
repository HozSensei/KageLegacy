/**
 * Smoke test HTTP des endpoints rétention/clan.
 * Prérequis: backend sur PORT (défaut 3001), demo_sensei seedé.
 * Usage: node backend/scripts/testRetentionApiSmoke.js
 */

import assert from 'node:assert/strict';

const API = process.env.API_URL || 'http://localhost:3001';
const cookieJar = { value: '' };

function parseSetCookie(headers) {
  const raw = headers.getSetCookie?.() || [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookieJar.value) headers.Cookie = cookieJar.value;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = parseSetCookie(res.headers);
  if (setCookie) cookieJar.value = setCookie;
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  const health = await api('/api/health');
  assert.equal(health.status, 200, 'health');

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'demo_sensei', password: 'demo' },
  });
  assert.equal(login.status, 200, 'login');

  const squad = await api('/api/squad');
  assert.equal(squad.status, 200, 'squad');
  assert.ok(squad.json.dailySeal, 'dailySeal in squad');
  assert.ok(squad.json.heritage, 'heritage in squad');
  assert.ok(squad.json.clan !== undefined, 'clan in squad');
  assert.ok(squad.json.clanBoard, 'clanBoard in squad');
  assert.ok(Array.isArray(squad.json.academy?.draws), 'academy draws');

  const clan = await api('/api/clan');
  assert.equal(clan.status, 200, 'clan');

  const sealGet = await api('/api/bureau/daily-seal');
  assert.equal(sealGet.status, 200, 'daily-seal GET');

  console.log('testRetentionApiSmoke: OK');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
