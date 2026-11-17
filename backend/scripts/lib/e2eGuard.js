import { query } from '../../src/config/database.js';

const marker = 'kage-legacy-e2e-v1';

export async function assertE2eDatabase({ initialize = false } = {}) {
  if (process.env.NODE_ENV === 'production' || process.env.E2E_ALLOW_SEED !== 'true') {
    throw new Error('Préparation E2E refusée : hors production, définir E2E_ALLOW_SEED=true pour une base isolée.');
  }
  if (!process.env.DB_NAME || !/^[a-zA-Z0-9_]+_e2e$/.test(process.env.DB_NAME)) {
    throw new Error('Préparation E2E refusée : DB_NAME doit désigner explicitement une base dédiée se terminant par _e2e.');
  }

  const [{ name }] = await query('SELECT DATABASE() AS name');
  if (name !== process.env.DB_NAME) throw new Error('Base connectée différente de DB_NAME.');

  const tables = await query(
    'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
  );
  if (!tables.length && initialize) {
    await query('CREATE TABLE e2e_fixture_guard (marker VARCHAR(100) NOT NULL PRIMARY KEY)');
    await query('INSERT INTO e2e_fixture_guard (marker) VALUES (?)', [marker]);
    console.log(`Base vide réservée aux tests E2E : ${name}`);
    return;
  }

  if (!tables.some((table) => table.name === 'e2e_fixture_guard')) {
    throw new Error('Préparation E2E refusée : base non initialisée ou non dédiée aux tests E2E.');
  }
  const rows = await query('SELECT marker FROM e2e_fixture_guard');
  if (rows.length !== 1 || rows[0].marker !== marker) {
    throw new Error('Préparation E2E refusée : marqueur de base invalide.');
  }
  console.log(`Base E2E dédiée reconnue : ${name}`);
}
