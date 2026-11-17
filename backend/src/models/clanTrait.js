import { query } from '../config/database.js';

export async function findAllClanTraits() {
  return query('SELECT * FROM clan_traits ORDER BY id');
}

export async function findClanTraitById(id) {
  const rows = await query('SELECT * FROM clan_traits WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function upsertClanTraits(clans) {
  for (const clan of clans) {
    await query(
      `INSERT INTO clan_traits (name, intelligence_bonus, speed_bonus, genjutsu_bonus, ninjutsu_bonus, moral_variance, is_noble)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         intelligence_bonus = VALUES(intelligence_bonus),
         speed_bonus = VALUES(speed_bonus),
         genjutsu_bonus = VALUES(genjutsu_bonus),
         ninjutsu_bonus = VALUES(ninjutsu_bonus),
         moral_variance = VALUES(moral_variance),
         is_noble = VALUES(is_noble)`,
      [
        clan.name,
        clan.intelligence_bonus,
        clan.speed_bonus,
        clan.genjutsu_bonus,
        clan.ninjutsu_bonus,
        clan.moral_variance,
        clan.is_noble,
      ],
    );
  }
}
