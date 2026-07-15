#!/usr/bin/env node
/**
 * Reset global de saison — conserve comptes, clans, rouleaux d'héritage et abonnements Élite.
 *
 * Usage:
 *   npm run season:hard-reset -- --dry-run
 *   npm run season:hard-reset -- --confirm --season=1
 *   npm run season:hard-reset -- --confirm --season=1 --at=2026-07-10T18:00:00+02:00
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';
import { hardSeasonReset } from '../src/services/seasonResetService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function parseArgs(argv) {
  const seasonArg = argv.find((arg) => arg.startsWith('--season='));
  const atArg = argv.find((arg) => arg.startsWith('--at='));
  return {
    dryRun: argv.includes('--dry-run'),
    confirm: argv.includes('--confirm'),
    seasonNumber: seasonArg ? Number(seasonArg.split('=')[1]) : 1,
    cycleStartAt: atArg ? atArg.slice('--at='.length) : null,
  };
}

function printPreview(result) {
  console.log('\n🔍 Aperçu reset global de saison (dry-run)\n');
  console.log(`  Joueurs humains      : ${result.preview.humanPlayers}`);
  console.log(`  Abonnements Élite    : ${result.preview.activeEliteSubscriptions} (seront réactivés)`);
  console.log(`  Rouleaux conservés   : ${result.preview.heritageScrollsKept}`);
  console.log(`  Clans conservés      : ${result.preview.clansKept}`);
  console.log(`  Pools à supprimer    : ${result.preview.poolsToDelete}`);
  console.log(`  Ninjas à supprimer   : ${result.preview.ninjasToDelete}`);
  console.log(`  Matchs à supprimer   : ${result.preview.matchesToDelete}`);
  console.log(`  Missions recon.      : ${result.preview.reconMissionsToDelete ?? 0}`);
  console.log(`  Notifications        : ${result.preview.notificationsToDelete}`);
  console.log(`\n  Saison cible         : S${result.seasonNumber}`);
  if (result.cycleStartAt) {
    console.log(`  Ancre H0             : ${result.cycleStartAt}`);
  } else {
    console.log('  Ancre H0             : maintenant (UTC)');
  }
  console.log('\n  Conservé : users, sensei (nom), sessions, heritage_scrolls, clans, cosmétiques Élite');
  console.log('  Réinitialisé : ninjas, objets, cartes, missions, ligues, ryos, réputation, horloge\n');
}

async function main() {
  const { dryRun, confirm, seasonNumber, cycleStartAt } = parseArgs(process.argv.slice(2));

  if (!dryRun && !confirm) {
    console.error(
      '⚠️  Opération destructive. Relancez avec --dry-run pour prévisualiser ou --confirm pour exécuter.'
    );
    process.exit(1);
  }

  if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
    console.error('--season doit être un entier ≥ 1');
    process.exit(1);
  }

  const result = await hardSeasonReset({
    seasonNumber,
    cycleStartAt,
    dryRun: dryRun || !confirm,
  });

  if (result.dryRun) {
    printPreview(result);
    if (!confirm) {
      console.log('Pour exécuter : npm run season:hard-reset -- --confirm --season=' + seasonNumber);
    }
    return;
  }

  console.log('\n✅ Reset global de saison terminé\n');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('❌', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
