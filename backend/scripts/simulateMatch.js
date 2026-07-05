import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { findDemoUser } from '../src/models/sensei.js';
import { getUserMatchForCycle } from '../src/services/matchService.js';
import { simulateMatchCombat } from '../src/services/combat/matchLoader.js';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const user = await findDemoUser();
  const match = await getUserMatchForCycle(user.id, 1);
  if (!match) {
    console.log('Aucun match trouvé');
    process.exit(1);
  }

  const result = await simulateMatchCombat(match.home_user_id, match.away_user_id);
  console.log(`Vainqueur: ${result.winner} (${result.endReason}) — ${result.endingTour} tours`);
  console.log(`Score restant: ${result.homeScorePct}% vs ${result.awayScorePct}%`);
  console.log(`K.O.: ${result.koNinjaIds.map((k) => k.name).join(', ') || 'aucun'}`);
  console.log(`Logs: ${result.logs.length} entrées`);
  console.log(JSON.stringify(result.logs.slice(0, 3), null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
