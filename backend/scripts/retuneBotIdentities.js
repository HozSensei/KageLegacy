/**
 * Répartit villages + noms « Xxx no Kuni » sur les bots.
 * Usage: node scripts/retuneBotIdentities.js [--force] [--pool=12]
 */

import { retuneBotSenseiIdentities } from '../src/services/botFactory.js';

function parseArgs(argv) {
  const force = argv.includes('--force');
  const poolFlag = argv.find((arg) => arg.startsWith('--pool='));
  const poolId = poolFlag ? Number(poolFlag.split('=')[1]) : null;
  return {
    force,
    poolId: Number.isFinite(poolId) ? poolId : null,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await retuneBotSenseiIdentities(options);
  console.log(
    `[bots:retune] total=${result.total} updated=${result.updated} force=${Boolean(options.force)} pool=${options.poolId ?? 'all'}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
