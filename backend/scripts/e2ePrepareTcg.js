#!/usr/bin/env node
/** Crée uniquement les fixtures TCG manquantes dans une base E2E dédiée. */
import pool, { query } from '../src/config/database.js';
import { findUserByUsername, registerUser, verifyPassword } from '../src/services/authService.js';
import { createCharacter, getCharacter } from '../src/services/playerCharacterService.js';
import { ensureStarterLoadout } from '../src/services/starterLoadoutService.js';
import { assertE2eDatabase } from './lib/e2eGuard.js';

async function main() {
  await assertE2eDatabase();
  let user = await findUserByUsername('demo_sensei');
  if (user) {
    if (user.is_guest || !verifyPassword('demo', user.password_hash)) {
      throw new Error(
        'Le compte demo_sensei existant ne correspond pas à la fixture E2E ; il est conservé sans modification.'
      );
    }
  } else {
    ({ user } = await registerUser({
      username: 'demo_sensei',
      email: 'demo_sensei@kage.local',
      password: 'demo',
      characterName: 'Renjiro',
      language: 'fr',
    }));
  }

  const profile = await query('SELECT id FROM player_profiles WHERE user_id = ?', [user.id]);
  if (!profile.length)
    throw new Error(
      'Profil demo_sensei incomplet ; aucune donnée existante ne sera réinitialisée.'
    );

  let character = await getCharacter(user.id);
  if (!character) {
    character = await createCharacter(user.id, { name: 'Demo Genin', elementAffinity: 'Katon' });
    const loadout = await ensureStarterLoadout(user.id);
    if (!loadout.collectionCount || !loadout.deck) {
      throw new Error('Le catalogue de cartes ou le deck starter est absent.');
    }
  }

  console.log(
    `E2E_RESULT:${JSON.stringify({
      ok: true,
      userId: user.id,
      characterId: character.id,
      name: character.name,
      level: character.level,
    })}`
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
