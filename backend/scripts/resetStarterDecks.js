#!/usr/bin/env node
/**
 * One-shot : purge tous les decks joueurs, top-up collection starter (15+5),
 * puis recrée les deux decks de départ (Taijutsu / Ninjutsu) pour chaque
 * personnage non-invité.
 *
 * Usage: node scripts/resetStarterDecks.js
 *        node scripts/resetStarterDecks.js --dry-run
 */
import pool, { query } from '../src/config/database.js';
import { ensureStarterLoadout } from '../src/services/starterLoadoutService.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const players = await query(
    `SELECT u.id AS user_id, u.username, pp.character_name
     FROM users u
     JOIN player_profiles pp ON pp.user_id = u.id
     WHERE u.is_guest = FALSE
       AND pp.character_name IS NOT NULL
     ORDER BY u.id ASC`,
  );

  console.log(
    dryRun
      ? `[dry-run] ${players.length} personnage(s) seraient réinitialisés.`
      : `Purge des decks + recreate starters pour ${players.length} personnage(s)…`,
  );

  if (dryRun) {
    for (const row of players) {
      console.log(`  - #${row.user_id} ${row.username} (${row.character_name})`);
    }
    return;
  }

  const deleted = await query('DELETE FROM user_decks');
  console.log(`Decks supprimés : ${deleted.affectedRows ?? 'ok'}`);

  // Autorise à nouveau le grant starter (admin wipe / soft-delete le bloquait).
  await query(
    `UPDATE users u
     JOIN player_profiles pp ON pp.user_id = u.id
     SET u.starter_loadout_reset_at = NULL
     WHERE u.is_guest = FALSE AND pp.character_name IS NOT NULL`,
  );

  let ok = 0;
  let failed = 0;
  for (const row of players) {
    try {
      const result = await ensureStarterLoadout(row.user_id, { topUpCollection: true });
      const names = (result.decks || []).map(d => d.name).join(', ') || 'aucun';
      console.log(
        `OK #${row.user_id} ${row.username}: collection=${result.collectionCount}` +
          ` topUp=${result.collectionToppedUp || result.collectionGranted}` +
          ` decks=[${names}]`,
      );
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAIL #${row.user_id} ${row.username}: ${error.message}`);
    }
  }

  console.log(`\nTerminé : ${ok} ok, ${failed} échec(s).`);
  if (failed) process.exitCode = 1;
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
