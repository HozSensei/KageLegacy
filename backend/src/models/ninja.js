import { query } from '../config/database.js';
import { validateNinjaInput } from '../validators/ninja.js';
import { computeMatchChakraMax, computeMatchPv, computeSalaryCost } from '../services/ninjaStats.js';

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
  const salary_cost = computeSalaryCost(validated.grade, validated);
  const current_pv_match = computeMatchPv(validated.taijutsu);
  const current_chakra_match = computeMatchChakraMax(validated.grade, validated.ninjutsu);

  const result = await query(
    `INSERT INTO ninjas (
      user_id, name, age, grade, clan_trait_id, element_affinity, character_trait,
      salary_cost, language, taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
      weekly_forme, moral, current_pv_match, current_chakra_match, squad_position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      validated.user_id,
      validated.name,
      validated.age,
      validated.grade,
      validated.clan_trait_id,
      validated.element_affinity,
      validated.character_trait,
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
