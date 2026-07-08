import { findAllClanTraits } from '../models/clanTrait.js';
import { createNinja } from '../models/ninja.js';
import { query } from '../config/database.js';
import {
  distributeCharacterTraits,
  generateNinjaProfile,
} from './ninjaGenerator.js';
import { ninjaIdentityKey } from './ninjaNaming.js';

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
    const profile = generateNinjaProfile({
      clans,
      grade,
      characterTrait: traits[i],
      language,
      forbiddenIdentityKeys: forbiddenKeys,
    });
    const clan = clans.find((c) => c.id === profile.clan_trait_id);
    forbiddenKeys.add(ninjaIdentityKey(profile.name, clan?.name));
    await createNinja({
      user_id: userId,
      ...profile,
      squad_position,
    });
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
