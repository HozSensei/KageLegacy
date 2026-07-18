/**
 * Réassigne une ligue active à tous les humains orphelins.
 * Usage: node scripts/assignMissingPools.js [--season=1]
 */

import { assignMissingHumanPools } from '../src/services/poolService.js';
import { ensureStarterSquad } from '../src/services/starterSquadService.js';
import { ensureStarterTacticCards } from '../src/services/tacticCards/tacticCardService.js';
import { query } from '../src/config/database.js';

function parseSeason(argv) {
  const flag = argv.find((arg) => arg.startsWith('--season='));
  if (!flag) return 1;
  const value = Number(flag.split('=')[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

async function main() {
  const seasonNumber = parseSeason(process.argv.slice(2));
  const assignment = await assignMissingHumanPools({ seasonNumber });
  console.log(
    `[assign-missing] orphans=${assignment.total} assigned=${assignment.assigned} failed=${assignment.failed.length}`
  );

  for (const row of assignment.results) {
    if (!row.ok) {
      console.error(`  FAIL user=${row.userId} ${row.senseiName}: ${row.error}`);
      continue;
    }
    const languageRows = await query('SELECT language FROM sensei WHERE user_id = ? LIMIT 1', [
      row.userId,
    ]);
    await ensureStarterSquad(row.userId, languageRows[0]?.language || 'fr');
    await ensureStarterTacticCards(row.userId);
    console.log(`  OK user=${row.userId} pool=${row.poolId} created=${row.created}`);
  }

  if (assignment.failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
