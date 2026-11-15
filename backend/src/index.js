import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { isSchedulerEnabled, startScheduler, stopScheduler } from './services/scheduler.js';
import { attachPvpWebSocket } from './ws/pvpWs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.PORT || 3000);

const server = app.listen(PORT, () => {
  console.log(`🦅 Kage Legacy API — http://localhost:${PORT}`);
  if (isSchedulerEnabled()) {
    startScheduler();
  }
});

attachPvpWebSocket(server);

function shutdown(signal) {
  console.log(`\n${signal} — arrêt en cours…`);
  stopScheduler();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
