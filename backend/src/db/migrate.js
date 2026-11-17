import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const file of files) {
      const [existing] = await connection.query(
        'SELECT id FROM schema_migrations WHERE filename = ?',
        [file],
      );
      if (existing.length > 0) {
        console.log(`⏭  ${file} (déjà appliquée)`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      await connection.commit();
      console.log(`✅ ${file}`);
    }

    console.log('Migrations terminées.');
  } catch (error) {
    await connection.rollback();
    console.error('Erreur de migration:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
