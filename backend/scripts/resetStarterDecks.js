#!/usr/bin/env node
/**
 * One-shot : purge tous les decks joueurs, retire les anciennes cartes starter
 * rares/légendaires, top-up le loadout Normal-only (15+5), puis recrée les deux
 * decks de départ (Taijutsu / Ninjutsu) pour chaque personnage non-invité.
 *
 * Usage: node scripts/resetStarterDecks.js
 *        node scripts/resetStarterDecks.js --dry-run
 */
import pool, { query } from '../src/config/database.js';
import { ensureStarterLoadout } from '../src/services/starterLoadoutService.js';

/** Anciennes cartes starter hors rareté normale — retirées au reset. */
const RETIRED_STARTER_SLUGS = Object.freeze([
  'poing-du-dragon',
  'frappe-opportuniste',
  'souffle-ardent',
  'lance-de-foudre',
  'mur-de-pierre',
  'voile-d-ombre',
  'mirage-persistant',
  'parchemin-de-scellement',
  'clone-de-combat',
  'esprit-du-renard',
]);

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
      : `Purge decks + recreate starters Normal pour ${players.length} personnage(s)…`,
  );

  if (dryRun) {
    for (const row of players) {
      console.log(`  - #${row.user_id} ${row.username} (${row.character_name})`);
    }
    return;
  }

  const deletedDecks = await query('DELETE FROM user_decks');
  console.log(`Decks supprimés : ${deletedDecks.affectedRows ?? 'ok'}`);

  if (RETIRED_STARTER_SLUGS.length) {
    const placeholders = RETIRED_STARTER_SLUGS.map(() => '?').join(', ');
    const deletedCards = await query(
      `DELETE ucc FROM user_card_collection ucc
       JOIN card_definitions cd ON cd.id = ucc.card_definition_id
       WHERE ucc.obtained_source = 'starter'
         AND cd.slug IN (${placeholders})`,
      [...RETIRED_STARTER_SLUGS],
    );
    console.log(`Anciennes cartes starter rares/lég. retirées : ${deletedCards.affectedRows ?? 'ok'}`);
  }

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
          ` granted=${result.collectionGranted || result.collectionToppedUp}` +
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
