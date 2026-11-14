/**
 * Seed Battle Pass Saison 1 + quêtes (daily/weekly/milestone enrichies).
 * Idempotent : upsert saison, remplace quêtes daily/weekly/milestone de la saison.
 * Usage: node scripts/seedBattlePass.js  (npm run db:seed-battle-pass)
 */
import { query } from '../src/config/database.js';
import {
  SEASON_1_META,
  buildSeason1QuestDefs,
  buildSeason1Rewards,
} from './data/battlePassSeason1.js';

function toMysqlDatetime(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function upsertSeason() {
  // Fenêtre couvrant le présent (dev / preview) — milestones disponibles dès is_active.
  const start = new Date('2026-11-01T00:00:00.000Z');
  const end = new Date('2027-02-01T00:00:00.000Z');
  const rewards = buildSeason1Rewards();

  // Désactive les autres saisons actives
  await query('UPDATE battle_pass_seasons SET is_active = FALSE WHERE is_active = TRUE');

  const existing = await query(
    'SELECT id FROM battle_pass_seasons WHERE season_number = ? LIMIT 1',
    [SEASON_1_META.seasonNumber]
  );

  if (existing[0]) {
    await query(
      `UPDATE battle_pass_seasons
       SET name = ?, theme = ?, start_date = ?, end_date = ?,
           max_level = ?, base_xp_per_level = ?, is_active = TRUE,
           rewards_json = ?
       WHERE id = ?`,
      [
        SEASON_1_META.name,
        SEASON_1_META.theme,
        toMysqlDatetime(start),
        toMysqlDatetime(end),
        SEASON_1_META.maxLevel,
        SEASON_1_META.baseXpPerLevel,
        JSON.stringify(rewards),
        existing[0].id,
      ]
    );
    console.log(`✓ Saison ${SEASON_1_META.seasonNumber} mise à jour (id=${existing[0].id})`);
    return { id: existing[0].id, start, end };
  }

  const result = await query(
    `INSERT INTO battle_pass_seasons
      (season_number, name, theme, start_date, end_date, max_level, base_xp_per_level, is_active, rewards_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
    [
      SEASON_1_META.seasonNumber,
      SEASON_1_META.name,
      SEASON_1_META.theme,
      toMysqlDatetime(start),
      toMysqlDatetime(end),
      SEASON_1_META.maxLevel,
      SEASON_1_META.baseXpPerLevel,
      JSON.stringify(rewards),
    ]
  );
  console.log(`✓ Saison ${SEASON_1_META.seasonNumber} créée (id=${result.insertId})`);
  return { id: result.insertId, start, end };
}

async function seedQuests(seasonId, start, end) {
  const defs = buildSeason1QuestDefs(start, end);

  // Nettoie les daily/weekly de cette saison pour éviter les doublons de fenêtre
  await query(
    `DELETE FROM battle_pass_quests
     WHERE season_id = ? AND quest_type IN ('daily', 'weekly')`,
    [seasonId]
  );

  // Milestones : upsert soft via delete+insert des clés connues
  await query(
    `DELETE FROM battle_pass_quests
     WHERE season_id = ? AND quest_type = 'milestone'`,
    [seasonId]
  );

  let inserted = 0;
  for (const q of defs) {
    await query(
      `INSERT INTO battle_pass_quests
        (season_id, quest_type, quest_key, description_fr, description_en,
         goal_value, xp_reward, bonus_reward_json, available_from, available_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seasonId,
        q.quest_type,
        q.quest_key,
        q.description_fr,
        q.description_en,
        q.goal_value,
        q.xp_reward,
        q.bonus_reward_json,
        toMysqlDatetime(new Date(q.available_from)),
        toMysqlDatetime(new Date(q.available_until)),
      ]
    );
    inserted += 1;
  }
  console.log(`✓ ${inserted} quêtes seedées (daily/weekly/milestone)`);
}

async function main() {
  try {
    await query('SELECT 1 FROM battle_pass_seasons LIMIT 1');
  } catch (e) {
    console.error('Tables Battle Pass absentes — lancez npm run db:migrate d’abord.');
    console.error(e.message);
    process.exit(1);
  }

  const season = await upsertSeason();
  await seedQuests(season.id, season.start, season.end);

  const freeLevels = Object.keys(buildSeason1Rewards().free).length;
  const premiumLevels = Object.keys(buildSeason1Rewards().premium).length;
  console.log(`✓ Tracks : ${freeLevels} free / ${premiumLevels} premium`);
  console.log('Seed Battle Pass terminé.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
