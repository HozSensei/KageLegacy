#!/usr/bin/env node
/**
 * Libère les ports dev avant test:e2e (API 3000, Vite 5173).
 */
import { execSync } from 'node:child_process';

const PORTS = [3000, 5173];

for (const port of PORTS) {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
  } catch {
    /* port libre */
  }
}
