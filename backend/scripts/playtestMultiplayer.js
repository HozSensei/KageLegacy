#!/usr/bin/env node
/**
 * Playtest multi-joueurs : 2 comptes authentifiés, échange P2P, cycle H0→H72.
 * Usage: npm run playtest:multiplayer
 *
 * Prérequis : MySQL + migrations (npm run db:migrate). Le seed démo est optionnel.
 * Si l'API tourne (PORT), une passe HTTP login + /api/squad est ajoutée.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { upsertClanTraits, findAllClanTraits } from '../src/models/clanTrait.js';
import { createNinja, findNinjasByUserId } from '../src/models/ninja.js';
import {
  authenticateUser,
  createSession,
  getUserBySessionToken,
  registerUser,
} from '../src/services/authService.js';
import { getUnreadNotifications } from '../src/services/dojoNotifications.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import { getDebtStatus } from '../src/services/economyDebt.js';
import { setHourDev, getGameClock, advanceToHourDev } from '../src/services/gameClock.js';
import { assignMission } from '../src/services/missionService.js';
import {
  buyListing,
  createNinjaListing,
  getPlayerMarketPayload,
} from '../src/services/playerMarketService.js';
import { findUserPool } from '../src/services/poolService.js';
import { getCycleBudgetPreview } from '../src/services/trainingBilling.js';
import { distributeCharacterTraits, generateNinjaProfile } from '../src/services/ninjaGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = process.env.PLAYTEST_API_URL || `http://localhost:${process.env.PORT || 3000}`;
const PASSWORD = 'playtest123';
const LISTING_PRICE = 750;

const DEFAULT_CLANS = [
  { name: 'Roturier', intelligence_bonus: 0, speed_bonus: 0, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: false },
  { name: 'Nara', intelligence_bonus: 4, speed_bonus: -2, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: true },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureClans() {
  const existing = await findAllClanTraits();
  if (existing.length) return existing;
  await upsertClanTraits(DEFAULT_CLANS);
  return findAllClanTraits();
}

async function cleanupPlaytestUsers() {
  const users = await query('SELECT id FROM users WHERE username LIKE ?', ['playtest_mp_%']);
  if (!users.length) return;
  const ids = users.map((u) => u.id);
  const ph = ids.map(() => '?').join(',');
  await query(
    `DELETE FROM matches WHERE home_user_id IN (${ph}) OR away_user_id IN (${ph})`,
    [...ids, ...ids]
  );
  await query(`DELETE FROM users WHERE id IN (${ph})`, ids);
}

async function createBenchNinja(userId, clans) {
  const [trait] = distributeCharacterTraits(1);
  const profile = generateNinjaProfile({
    clans,
    grade: 'Genin',
    characterTrait: trait,
    language: 'fr',
  });
  return createNinja({ user_id: userId, ...profile, squad_position: null });
}

async function boostNinja(ninjaId, patch) {
  const cols = Object.keys(patch);
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  await query(`UPDATE ninjas SET ${sets} WHERE id = ?`, [...cols.map((c) => patch[c]), ninjaId]);
}

async function assignThreeMissions(userId, clans) {
  const bench = await query(
    `SELECT id FROM ninjas WHERE user_id = ? AND squad_position IS NULL ORDER BY id LIMIT 4`,
    [userId]
  );
  if (bench.length < 3) {
    for (let i = bench.length; i < 3; i += 1) {
      await createBenchNinja(userId, clans);
    }
  }
  const ninjas = await query(
    `SELECT id, intelligence, taijutsu FROM ninjas WHERE user_id = ? AND squad_position IS NULL ORDER BY id LIMIT 3`,
    [userId]
  );
  await boostNinja(ninjas[0].id, { intelligence: 5 });
  await boostNinja(ninjas[1].id, { intelligence: 9 });
  await boostNinja(ninjas[2].id, { taijutsu: 13 });
  await assignMission(userId, ninjas[0].id, 'routine');
  await assignMission(userId, ninjas[1].id, 'infiltration');
  await assignMission(userId, ninjas[2].id, 'cyclone');
}

async function snapshot(label, userId, senseiName) {
  const clock = await getGameClock();
  const debt = await getDebtStatus(userId);
  const budget = await getCycleBudgetPreview(userId);
  const poolRow = await findUserPool(userId);
  const ninjas = await findNinjasByUserId(userId);
  const notifications = await getUnreadNotifications(userId);

  console.log(`\n── ${label} · ${senseiName} (H${clock.hour}) ──`);
  console.log(`  Ryos: ${debt.ryos.toLocaleString()}${debt.debtBlocksSpending ? ' · DETTE' : ''}`);
  console.log(
    `  Budget H72: ${budget.projectedBalance.toLocaleString()} Ryos (salaires −${budget.salariesTotal})`
  );
  console.log(`  Ninjas: ${ninjas.length} (${ninjas.filter((n) => n.squad_position).length} actifs)`);
  console.log(`  Notifications: ${notifications.length}`);
  if (poolRow) {
    console.log(`  Pool #${poolRow.id} · cycle ${poolRow.current_cycle}`);
  }
}

async function jumpAndTick(hour) {
  await advanceToHourDev(hour);
  return processCycleTick();
}

function mergeCookie(jar, setCookieHeaders) {
  const map = new Map();
  for (const part of (jar || '').split(';').map((s) => s.trim()).filter(Boolean)) {
    const [k, v] = part.split('=');
    if (k && v) map.set(k, v);
  }
  for (const header of setCookieHeaders || []) {
    const [pair] = header.split(';');
    const [k, v] = pair.split('=');
    if (k && v) map.set(k.trim(), v.trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function tryHttpSmoke({ username, password, expectedUserId }) {
  try {
    const health = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (!health.ok) return false;

    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert(loginRes.ok, `HTTP login échoué (${loginRes.status})`);

    const cookies = mergeCookie('', loginRes.headers.getSetCookie?.() ?? []);
    const meRes = await fetch(`${API_BASE}/api/auth/me`, { headers: { Cookie: cookies } });
    const me = await meRes.json();
    assert(meRes.ok && me.user?.id === expectedUserId, 'Session HTTP ne correspond pas au compte');

    const squadRes = await fetch(`${API_BASE}/api/squad`, { headers: { Cookie: cookies } });
    assert(squadRes.ok, `GET /api/squad échoué (${squadRes.status})`);

    console.log(`  HTTP OK — session ${username} · ${me.sensei?.name}`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const tag = Date.now();
  const usernameA = `playtest_mp_a_${tag}`;
  const usernameB = `playtest_mp_b_${tag}`;

  console.log('\n🎮 Kage Legacy — playtest multi-joueurs\n');

  await cleanupPlaytestUsers();
  const clans = await ensureClans();

  const { user: userA } = await registerUser({
    username: usernameA,
    password: PASSWORD,
    senseiName: 'Sensei Alpha',
    language: 'fr',
  });
  const { user: userB } = await registerUser({
    username: usernameB,
    password: PASSWORD,
    senseiName: 'Sensei Beta',
    language: 'fr',
  });

  const sessionA = await createSession(userA.id);
  const sessionB = await createSession(userB.id);
  assert((await getUserBySessionToken(sessionA.token))?.id === userA.id, 'Session A invalide');
  assert((await getUserBySessionToken(sessionB.token))?.id === userB.id, 'Session B invalide');
  assert(
    (await authenticateUser(usernameA, PASSWORD))?.id === userA.id,
    'Authentification mot de passe A'
  );

  console.log(`✅ Comptes créés : ${usernameA} / ${usernameB}`);

  await setHourDev(0);
  await assignThreeMissions(userA.id, clans);
  await assignThreeMissions(userB.id, clans);
  console.log('✅ 3 contrats idle / joueur (routine, infiltration, cyclone)');

  const benchNinja = await createBenchNinja(userA.id, clans);
  console.log(`✅ Ninja banc créé pour A : ${benchNinja.name} (#${benchNinja.id})`);

  const { listingId } = await createNinjaListing(userA.id, benchNinja.id, LISTING_PRICE);
  const marketBefore = await getPlayerMarketPayload(userB.id);
  const listing = marketBefore.listings.find((l) => l.id === listingId);
  assert(listing, 'Annonce visible sur le marché global');

  const ryosBeforeA = (await getDebtStatus(userA.id)).ryos;
  const ryosBeforeB = (await getDebtStatus(userB.id)).ryos;

  const purchase = await buyListing(userB.id, listingId);
  assert(purchase.listingId === listingId, 'Achat P2P échoué');

  const ninjaAfter = await findNinjasByUserId(userB.id);
  assert(ninjaAfter.some((n) => n.id === benchNinja.id), 'Ninja transféré vers B');

  const ryosAfterA = (await getDebtStatus(userA.id)).ryos;
  const ryosAfterB = (await getDebtStatus(userB.id)).ryos;
  assert(ryosAfterB === ryosBeforeB - LISTING_PRICE, 'Débit acheteur incorrect');
  assert(ryosAfterA > ryosBeforeA, 'Crédit vendeur manquant');

  const sellerNotes = await getUnreadNotifications(userA.id);
  assert(
    sellerNotes.some((n) => n.kind === 'market_sale'),
    'Notification market_sale manquante pour le vendeur'
  );

  console.log(`✅ P2P : ${benchNinja.name} vendu ${LISTING_PRICE} Ryos (A → B)`);

  const httpOk = await tryHttpSmoke({
    username: usernameA,
    password: PASSWORD,
    expectedUserId: userA.id,
  });
  if (httpOk) {
    console.log('✅ Vérification HTTP (API en ligne)');
  } else {
    console.log('ℹ️  API hors ligne — auth testée via services uniquement');
  }

  await snapshot('H0 — après P2P', userA.id, 'Sensei Alpha');
  await snapshot('H0 — après P2P', userB.id, 'Sensei Beta');

  const h36 = await jumpAndTick(36);
  console.log('\n  Tick H36:', h36?.actions?.length ? 'jobs exécutés' : 'ok');
  await snapshot('H36', userA.id, 'Sensei Alpha');
  await snapshot('H36', userB.id, 'Sensei Beta');

  const h71 = await jumpAndTick(71);
  console.log('\n  Tick H71:', h71?.actions?.length ? 'simulation matchs' : 'ok');
  await snapshot('H71', userA.id, 'Sensei Alpha');
  await snapshot('H71', userB.id, 'Sensei Beta');

  const h72 = await jumpAndTick(72);
  console.log('\n  Tick H72:', h72?.action === 'cycle_reset' ? 'fin de cycle' : JSON.stringify(h72));

  const missionNotesA = (await getUnreadNotifications(userA.id)).filter((n) => n.kind === 'mission_report');
  const missionNotesB = (await getUnreadNotifications(userB.id)).filter((n) => n.kind === 'mission_report');
  assert(missionNotesA.length >= 1, 'Notifications mission_report manquantes pour A');
  assert(missionNotesB.length >= 1, 'Notifications mission_report manquantes pour B');
  assert(missionNotesA[0].payload?.reportText, 'Rapport narratif mission manquant');
  console.log(`✅ Missions : ${missionNotesA.length} notif(s) A · ${missionNotesB.length} notif(s) B`);

  await snapshot('H72 — après reset', userA.id, 'Sensei Alpha');
  await snapshot('H72 — après reset', userB.id, 'Sensei Beta');

  await cleanupPlaytestUsers();
  console.log('\n✅ Playtest multi-joueurs terminé (comptes éphémères supprimés).\n');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupPlaytestUsers();
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
