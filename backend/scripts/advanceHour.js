import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { advanceHourDev } from '../src/services/gameClock.js';
import { processCycleTick } from '../src/services/cycleJobs.js';
import pool from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const hourArg = process.argv[2];

async function main() {
  if (hourArg !== undefined) {
    const { setHourDev } = await import('../src/services/gameClock.js');
    const target = Number(hourArg);
    if (Number.isNaN(target) || target < 0 || target > 72) {
      console.error('Usage: node scripts/advanceHour.js [0-72]');
      process.exit(1);
    }
    const clock = await setHourDev(target);
    console.log(`⏱  Horloge positionnée à H${clock.hour} (${clock.phase})`);
  } else {
    const clock = await advanceHourDev();
    console.log(`⏱  +1 heure → H${clock.hour} (${clock.phase})`);
  }

  const tick = await processCycleTick();
  console.log('Tick cycle:', JSON.stringify(tick, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
