import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_FILENAME = 'baseline.sql';

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
    if (baselineRows.length > 0) {
      console.log('⏭  Schéma initial déjà appliqué.');
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

    const sql = await fs.readFile(schemaPath, 'utf8');
    for (const statement of splitSqlStatements(sql)) {
      await connection.query(statement);
    }

    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [
      BASELINE_FILENAME,
    ]);
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
