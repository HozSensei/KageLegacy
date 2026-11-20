import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import {
  RANK_MISSION_DEFINITIONS,
  RANK_MISSION_SLUGS,
} from '../config/missionPathConfig.js';
import { ensureOnboardingTable } from '../services/onboardingService.js';
import { UTC_WEEK_START } from '../services/asyncDuelWeeklyRewards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_FILENAME = 'baseline.sql';
const ASYNC_DUEL_TABLES = [
  'async_duel_friendships',
  'async_duels',
  'async_duel_reward_ledger',
  'async_duel_faction_points',
  'async_duel_weekly_state',
  'async_duel_village_membership',
  'async_duel_weekly_settlements',
  'async_duel_weekly_reward_ledger',
];

const COMPATIBILITY_COLUMNS = [
  [
    'player_profiles',
    'character_background_id',
    'varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL',
    'character_avatar_id',
  ],
  ['player_profiles', 'async_duel_enabled', 'TINYINT(1) NOT NULL DEFAULT 0', 'ryos'],
  ['async_duels', 'mode', "ENUM('friend','random','enemy_faction') DEFAULT NULL", 'defender_name'],
  ['async_duels', 'attacker_faction', 'VARCHAR(32) DEFAULT NULL', 'mode'],
  ['async_duels', 'defender_faction', 'VARCHAR(32) DEFAULT NULL', 'attacker_faction'],
  ['card_definitions', 'held_effect_json', 'JSON NULL', 'effects_json'],
  [
    'talent_tree_nodes',
    'tier',
    "TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = legacy archivé'",
    'branch',
  ],
  ['talent_tree_nodes', 'max_rank', 'TINYINT UNSIGNED NOT NULL DEFAULT 1', 'tier'],
  ['talent_tree_nodes', 'required_branch_points', 'INT UNSIGNED NOT NULL DEFAULT 0', 'max_rank'],
  [
    'user_talents',
    'points_spent',
    "TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Rang acheté sur ce nœud'",
    'node_id',
  ],
];

async function ensureCardStatType(connection) {
  const [rows] = await connection.query(
    `SELECT column_type
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'card_definitions'
       AND column_name = 'stat_type'
     LIMIT 1`,
  );
  if (rows.length === 0 || String(rows[0].column_type).includes("'common'")) return;

  // Les anciennes valeurs abandonnées sont remises à NULL avant le changement
  // d'ENUM ; le seed idempotent les remplace par la valeur actuelle aussitôt après.
  await connection.query(
    `UPDATE card_definitions
     SET stat_type = NULL
     WHERE stat_type IS NOT NULL
       AND stat_type NOT IN ('taijutsu','ninjutsu','genjutsu','medicine')`,
  );
  await connection.query(
    `ALTER TABLE card_definitions
     MODIFY COLUMN stat_type
       ENUM('taijutsu','ninjutsu','genjutsu','medicine','common') DEFAULT NULL`,
  );
  console.log('🔧 Enum étendu : card_definitions.stat_type accepte common');
}

async function ensureCompatibilityColumns(connection) {
  for (const [table, column, definition, after] of COMPATIBILITY_COLUMNS) {
    const [rows] = await connection.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
       LIMIT 1`,
      [table, column],
    );
    if (rows.length > 0) continue;

    const [tables] = await connection.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [table],
    );
    if (tables.length === 0) continue;

    await connection.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition} AFTER \`${after}\``,
    );
    console.log(`🔧 Colonne de compatibilité ajoutée : ${table}.${column}`);
  }
  await ensureCardStatType(connection);
}

async function ensureCharacterProfile(connection) {
  // Équivalent idempotent de backend/etc/upgrade-character-profile.sql pour les bases existantes.
  const [profileTable] = await connection.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'player_profiles' LIMIT 1`,
  );
  if (profileTable.length === 0) return;

  const [upgraded] = await connection.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'player_profiles'
       AND column_name = 'character_highest_level' LIMIT 1`,
  );
  const needsSchemaUpgrade = upgraded.length === 0;

  if (needsSchemaUpgrade) {
    // Un seul ALTER : le DDL MySQL est atomique par instruction, donc la relance reste sûre.
    // Le nouveau rang est ajouté en fin d'ENUM pour conserver les ordinaux existants.
    await connection.query(
      `ALTER TABLE \`player_profiles\`
         ADD COLUMN \`character_avatar_id\` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'aspirant-1-1' AFTER \`character_avatar_url\`,
         ADD COLUMN \`character_background_id\` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER \`character_avatar_id\`,
         ADD COLUMN \`character_nickname_id\` varchar(32) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL AFTER \`character_background_id\`,
         ADD COLUMN \`character_highest_level\` int unsigned NOT NULL DEFAULT '1' AFTER \`character_level\`,
         MODIFY COLUMN \`character_rank\` enum('Genin','Chunin','Jonin','ANBU','Kage','Aspirant ninja') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aspirant ninja'`,
    );
  }

  await dropLegacyProfileColorColumns(connection);

  // Répéter ces mises à niveau de données est sans effet après leur première application.
  await connection.beginTransaction();
  try {
    await connection.query(
      `UPDATE player_profiles
       SET character_highest_level = character_level
       WHERE character_name IS NOT NULL AND character_highest_level < character_level`,
    );
    await connection.query(
      `UPDATE player_profiles
       SET character_rank = 'Aspirant ninja'
       WHERE character_rank = 'Genin' AND (character_level < 5 OR character_name IS NULL)`,
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  if (needsSchemaUpgrade) {
    console.log('🔧 Profil de personnage migré : portrait, fond de carte, surnom, rang Aspirant ninja.');
  }
}

async function dropLegacyProfileColorColumns(connection) {
  for (const column of ['character_border_color', 'character_background_color']) {
    const [rows] = await connection.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'player_profiles'
         AND column_name = ?
       LIMIT 1`,
      [column],
    );
    if (rows.length === 0) continue;
    await connection.query(`ALTER TABLE \`player_profiles\` DROP COLUMN \`${column}\``);
    console.log(`🔧 Colonne legacy retirée : player_profiles.${column}`);
  }
}

function splitSqlStatements(sql) {
  const statements = [];
  let statement = '';
  let quote = null;
  let escaped = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (quote) {
      statement += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\' && quote !== '`') {
        escaped = true;
      } else if (character === quote) {
        if (sql[index + 1] === quote) {
          statement += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      statement += character;
    } else if (character === ';') {
      if (statement.trim()) statements.push(statement.trim());
      statement = '';
    } else {
      statement += character;
    }
  }

  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

async function ensureAsyncDuelTables(connection, statements) {
  // Rejoue uniquement les DDL additives du duel, dans l'ordre des clés étrangères.
  for (const table of ASYNC_DUEL_TABLES) {
    const ddl = statements.find(sql => sql.startsWith(`CREATE TABLE IF NOT EXISTS \`${table}\` (`));
    if (!ddl) throw new Error(`DDL de compatibilité introuvable : ${table}`);
    await connection.query(ddl);
  }

  const [weeklyReadColumn] = await connection.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'async_duel_weekly_reward_ledger'
       AND column_name = 'read_at'`,
  );
  if (weeklyReadColumn.length === 0) {
    await connection.query(`ALTER TABLE async_duel_weekly_reward_ledger
      ADD COLUMN read_at DATETIME(6) DEFAULT NULL AFTER ryos,
      ADD KEY idx_async_duel_weekly_ledger_user_week (user_id, week_start)`);
    console.log('🔧 État de lecture ajouté au registre des récompenses de village.');
  }

  const [legacyColumns] = await connection.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'async_duel_reward_ledger'
       AND column_name = 'defender_slot'`,
  );
  if (!legacyColumns.length) return;

  const legacyIndexes = [
    'uq_async_duel_reward_attacker_day',
    'uq_async_duel_reward_pair_day',
    'uq_async_duel_reward_defender_slot',
  ];
  const [indexes] = await connection.query(
    `SELECT DISTINCT index_name AS name FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'async_duel_reward_ledger'
       AND index_name IN (?, ?, ?)`,
    legacyIndexes,
  );
  const drops = indexes.map(({ name }) => `DROP INDEX \`${name}\`,`).join('\n');

  // winner_side NULL identifie les anciens gains (tous pour le défenseur). L'index de paire
  // autorise leurs éventuels doublons historiques, mais pas deux nouveaux crédits opposés.
  await connection.query(`ALTER TABLE async_duel_reward_ledger
    ADD KEY idx_async_duel_reward_attacker (attacker_id),
    ADD KEY idx_async_duel_reward_defender (defender_id),
    ${drops}
    DROP CHECK ck_async_duel_reward_slot,
    DROP CHECK ck_async_duel_reward_ryos,
    RENAME COLUMN defender_slot TO beneficiary_slot,
    ADD COLUMN winner_side ENUM('attacker','defender') DEFAULT NULL,
    ADD COLUMN beneficiary_id INT UNSIGNED GENERATED ALWAYS AS (IF(winner_side = 'attacker', attacker_id, defender_id)) VIRTUAL,
    ADD COLUMN pair_low_id INT UNSIGNED GENERATED ALWAYS AS (LEAST(attacker_id, defender_id)) VIRTUAL,
    ADD COLUMN pair_high_id INT UNSIGNED GENERATED ALWAYS AS (GREATEST(attacker_id, defender_id)) VIRTUAL,
    ADD COLUMN new_credit TINYINT GENERATED ALWAYS AS (IF(winner_side IS NULL, NULL, 1)) VIRTUAL,
    ADD UNIQUE KEY uq_async_duel_reward_unordered_day (pair_low_id, pair_high_id, credited_on, new_credit),
    ADD UNIQUE KEY uq_async_duel_reward_beneficiary_slot (beneficiary_id, credited_on, beneficiary_slot),
    ADD CONSTRAINT ck_async_duel_reward_slot CHECK (beneficiary_slot BETWEEN 1 AND 3),
    ADD CONSTRAINT ck_async_duel_reward_ryos CHECK (ryos > 0)`);
  console.log('🔧 Registre des crédits de duel migré sans modifier les portefeuilles.');
}

async function installWeeklyVillageRewards(connection) {
  // L'ancrage et la photo initiale sont atomiques et ne bougent pas aux relances.
  const firstWeek = `DATE_ADD(${UTC_WEEK_START}, INTERVAL 7 DAY)`;
  await connection.beginTransaction();
  try {
    try {
      await connection.query(
        `INSERT INTO async_duel_weekly_state (id, installed_at, first_week_start, next_week_start)
         VALUES (1, UTC_TIMESTAMP(6), ${firstWeek}, ${firstWeek})`,
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      await connection.rollback();
      return;
    }
    await connection.query(
      `INSERT INTO async_duel_village_membership (user_id, effective_at, faction_id)
       SELECT p.user_id, s.installed_at, p.character_faction_id
       FROM player_profiles p CROSS JOIN async_duel_weekly_state s
       WHERE s.id = 1 AND p.character_name IS NOT NULL AND p.character_faction_id IS NOT NULL`,
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

/**
 * Une mission active par rang (D/C/B/A/S) ; désactive les anciens slugs dédoublés.
 * Le path d’encounters est généré au lancement (encounters_json vide).
 */
async function ensureRankMissions(connection) {
  const [tables] = await connection.query(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'mission_definitions'
     LIMIT 1`,
  );
  if (!tables.length) return;

  const placeholders = RANK_MISSION_SLUGS.map(() => '?').join(', ');
  const [deactivated] = await connection.query(
    `UPDATE mission_definitions
     SET is_active = 0
     WHERE slug NOT IN (${placeholders}) AND is_active = 1`,
    [...RANK_MISSION_SLUGS],
  );

  let upserted = 0;
  for (const def of RANK_MISSION_DEFINITIONS) {
    const [existing] = await connection.query(
      'SELECT id FROM mission_definitions WHERE slug = ? LIMIT 1',
      [def.slug],
    );
    const rewardsJson = JSON.stringify(def.rewards);
    const encountersJson = JSON.stringify([]);
    if (existing.length) {
      await connection.query(
        `UPDATE mission_definitions
         SET name_fr = ?, name_en = ?, description_fr = ?, description_en = ?,
             \`rank\` = ?, encounters_json = CAST(? AS JSON),
             rewards_json = CAST(? AS JSON), is_active = 1, sort_order = ?
         WHERE slug = ?`,
        [
          def.nameFr,
          def.nameEn,
          def.descriptionFr,
          def.descriptionEn,
          def.rank,
          encountersJson,
          rewardsJson,
          def.sortOrder,
          def.slug,
        ],
      );
    } else {
      await connection.query(
        `INSERT INTO mission_definitions
          (slug, name_fr, name_en, description_fr, description_en, \`rank\`,
           encounters_json, rewards_json, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), 1, ?)`,
        [
          def.slug,
          def.nameFr,
          def.nameEn,
          def.descriptionFr,
          def.descriptionEn,
          def.rank,
          encountersJson,
          rewardsJson,
          def.sortOrder,
        ],
      );
    }
    upserted += 1;
  }

  console.log(
    `✓ Missions par rang synchronisées (${upserted} actives` +
      `${deactivated.affectedRows ? `, ${deactivated.affectedRows} anciennes désactivées` : ''}).`,
  );
}

async function migrate() {
  const schemaPath = path.join(__dirname, '../../schema.sql');
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [baselineRows] = await connection.query(
      'SELECT id FROM schema_migrations WHERE filename = ?',
      [BASELINE_FILENAME],
    );
    const statements = splitSqlStatements(await fs.readFile(schemaPath, 'utf8'));
    if (baselineRows.length > 0) {
      console.log('⏭  Schéma initial déjà appliqué.');
      await ensureCompatibilityColumns(connection);
      await ensureCharacterProfile(connection);
      await ensureAsyncDuelTables(connection, statements);
      await installWeeklyVillageRewards(connection);
      await ensureRankMissions(connection);
      await ensureOnboardingTable();
      return;
    }

    const [historyRows] = await connection.query('SELECT filename FROM schema_migrations LIMIT 1');
    if (historyRows.length > 0) {
      throw new Error(
        'Cette base contient un historique de migrations legacy. ' +
          'Le schéma initial exige une base vide.',
      );
    }

    const [tableRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name NOT IN ('schema_migrations', 'e2e_fixture_guard')`,
    );
    if (Number(tableRows[0].count) > 0) {
      throw new Error(
        'Cette base contient déjà des tables. Le schéma initial exige une base vide.',
      );
    }

    for (const statement of statements) {
      await connection.query(statement);
    }

    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [
      BASELINE_FILENAME,
    ]);
    await ensureCompatibilityColumns(connection);
    await installWeeklyVillageRewards(connection);
    await ensureRankMissions(connection);
    await ensureOnboardingTable();
    console.log('✅ Schéma initial appliqué.');
  } catch (error) {
    console.error('Erreur d’initialisation de la base :', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
