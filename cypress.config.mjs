import { defineConfig } from 'cypress';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseE2EResult(stdout) {
  const line = stdout.split('\n').find((l) => l.startsWith('E2E_RESULT:'));
  if (!line) throw new Error(`E2E_RESULT manquant dans:\n${stdout.slice(-2000)}`);
  return JSON.parse(line.slice('E2E_RESULT:'.length));
}

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    defaultCommandTimeout: 15000,
    setupNodeEvents(on) {
      on('task', {
        prepareMissionsE2E() {
          const stdout = execSync('node scripts/e2ePrepareMissions.js', {
            cwd: path.join(__dirname, 'backend'),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          return parseE2EResult(stdout);
        },
      });
    },
  },
  video: false,
  screenshotOnRunFailure: true,
});
