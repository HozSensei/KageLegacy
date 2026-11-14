import { query } from '../config/database.js';
import { validateNinjaInput } from '../validators/ninja.js';
import { computeMatchChakraMax, computeMatchPv, computeSalaryCost } from '../services/ninjaStats.js';
import { assertUniqueAmongRoster, collectIdentityKeys, formatNinjaDisplayName, ninjaIdentityKey } from '../services/ninjaNaming.js';
import { hasRemainingGlobalNames } from '../services/ninjaNameGenerator.js';

export async function findAllNinjaIdentityKeys() {
  const rows = await query('SELECT name FROM ninjas');
  return rows.map((row) => row.name);
}

export async function loadGlobalIdentityKeySet() {
  const names = await findAllNinjaIdentityKeys();
  return collectIdentityKeys(names.map((name) => ({ name })));
}

export async function findNinjasByUserId(userId) {
  return query(
    `SELECT n.*, c.name AS clan_name, c.is_noble AS clan_is_noble
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.user_id = ?
     ORDER BY n.squad_position IS NULL, n.squad_position, n.id`,
    [userId]
  );
}

export async function findNinjaById(id) {
  const rows = await query(
    `SELECT n.*, c.name AS clan_name
     FROM ninjas n
     JOIN clan_traits c ON c.id = n.clan_trait_id
     WHERE n.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function createNinja(data) {
  const validated = validateNinjaInput(data);
  const existing = await findNinjasByUserId(validated.user_id);
  assertUniqueAmongRoster(validated.name, existing);

  const globalKeys = await loadGlobalIdentityKeySet();
  const key = ninjaIdentityKey(validated.name);
  if (globalKeys.has(key)) {
    const clanRows = await query('SELECT name FROM clan_traits WHERE id = ?', [validated.clan_trait_id]);
    const clan = { name: clanRows[0]?.name };
    if (hasRemainingGlobalNames(globalKeys, clan)) {
      const error = new Error(
        `Le nom « ${formatNinjaDisplayName(validated.name)} » est déjà utilisé par un autre sensei sur le serveur.`
      );
      error.statusCode = 409;
      throw error;
    }
    // Pool global saturé pour ce profil : doublon inter-joueurs toléré.
  }

  const salary_cost = computeSalaryCost(validated.grade, validated);
  const current_pv_match = computeMatchPv(validated.taijutsu);
  const current_chakra_match = computeMatchChakraMax(validated.grade, validated.ninjutsu);

  const result = await query(
    `INSERT INTO ninjas (
      user_id, name, age, grade, clan_trait_id, element_affinity, character_trait, trait_boost,
      salary_cost, language, taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
      weekly_forme, moral, current_pv_match, current_chakra_match, squad_position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      validated.user_id,
      validated.name,
      validated.age,
      validated.grade,
      validated.clan_trait_id,
      validated.element_affinity,
      validated.character_trait ?? null,
      validated.trait_boost ?? null,
      salary_cost,
      validated.language,
      validated.taijutsu,
      validated.ninjutsu,
      validated.genjutsu,
      validated.medecine,
      validated.vitesse,
      validated.intelligence,
      validated.weekly_forme,
      validated.moral,
      current_pv_match,
      current_chakra_match,
      validated.squad_position ?? null,
    ]
  );

  return findNinjaById(result.insertId);
}

export async function deleteNinjasByUserId(userId) {
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
}
