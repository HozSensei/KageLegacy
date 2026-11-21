/**
 * Seed Battle Pass — utilise le template générique (saison 1 par défaut).
 * Idempotent : upsert saison, remplace quêtes daily/weekly/milestone de la saison.
 * Usage: node scripts/seedBattlePass.js  (npm run db:seed-battle-pass)
 */
import { createSeasonFromTemplate } from '../src/services/battlePassSeasonRotation.js';

async function main() {
  const { default: pool } = await import('../src/config/database.js');
  try {
    const ifEmpty = process.argv.includes('--if-empty');
    if (ifEmpty) {
      const { query } = await import('../src/config/database.js');
      const rows = await query(
        'SELECT id FROM battle_pass_seasons WHERE is_active = TRUE LIMIT 1',
      ).catch(() => []);
      if (rows[0]) {
        console.log('⏭  Battle Pass déjà seedé (saison active).');
        return;
      }
    }

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const result = await createSeasonFromTemplate({
      seasonNumber: 1,
      startDate: start,
      activate: true,
    });
    console.log(
      `✓ Saison ${result.seasonNumber} prête (id=${result.seasonId}) ${result.startDate} → ${result.endDate}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
