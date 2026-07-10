import { query } from '../config/database.js';
import { findAllClanTraits } from '../models/clanTrait.js';
import { createNinja, loadGlobalIdentityKeySet } from '../models/ninja.js';
import {
  distributeCharacterTraits,
  generateNinjaProfile,
} from './ninjaGenerator.js';
import { ninjaIdentityKey } from './ninjaNaming.js';
import { alignPoolBotsToHuman } from './botFactory.js';
import { findUserPool } from './poolService.js';

/**
 * Escouade de départ : 1 Chunin (poste actif central) + 5 Genin (2 actifs, 3 banc).
 */
export async function provisionStarterSquad(userId, language = 'fr') {
  const clans = await findAllClanTraits();
  if (!clans.length) {
    throw new Error('Aucun clan en base — exécutez les migrations.');
  }

  const traits = distributeCharacterTraits(6);
  const forbiddenKeys = new Set();
  const globalKeys = await loadGlobalIdentityKeySet();
  const layout = [
    { grade: 'Genin', squad_position: 1 },
    { grade: 'Chunin', squad_position: 2 },
    { grade: 'Genin', squad_position: 3 },
    { grade: 'Genin', squad_position: null },
    { grade: 'Genin', squad_position: null },
    { grade: 'Genin', squad_position: null },
  ];

  for (let i = 0; i < layout.length; i += 1) {
    const { grade, squad_position } = layout[i];
    const profile = await generateNinjaProfile({
      clans,
      grade,
      characterTrait: traits[i],
      language,
      forbiddenIdentityKeys: forbiddenKeys,
      forbiddenGlobalKeys: globalKeys,
    });
    const key = ninjaIdentityKey(profile.name);
    forbiddenKeys.add(key);
    globalKeys.add(key);
    await createNinja({
      user_id: userId,
      ...profile,
      squad_position,
    });
  }

  const pool = await findUserPool(userId);
  if (pool) {
    await alignPoolBotsToHuman(pool.id, userId);
  }
}

/** Rétroactif : joueurs humains sans ninja (prod avant starter squad). */
export async function ensureStarterSquad(userId, language = 'fr') {
  const rows = await query(
    'SELECT COUNT(*) AS count FROM ninjas WHERE user_id = ?',
    [userId]
  );
  if (Number(rows[0]?.count) > 0) return false;
  await provisionStarterSquad(userId, language);
  return true;
}
