#!/usr/bin/env node
/**
 * Régénère les segments narratifs i18n pour les matchs legacy (sans template_key).
 * Usage: npm run narrative:backfill [-- --dry-run] [-- --match-id=42]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import pool from '../src/config/database.js';
import { assembleNarrative } from '../src/services/narrative/narrativeAssembler.js';
import { persistNarrativeSegments } from '../src/services/narrative/narrativeStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    matchId: Number(process.argv.find((a) => a.startsWith('--match-id='))?.split('=')[1]) || null,
  };
}

async function loadNarrativeContext(userId) {
  const senseiRows = await query('SELECT name FROM sensei WHERE user_id = ?', [userId]);
  const ninjas = await query(
    `SELECT name FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [userId]
  );
  return { senseiName: senseiRows[0]?.name || 'Sensei', ninjas };
}

function parseCombatLog(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function mapWinner(result, homeUserId, awayUserId) {
  if (result === 'home_win') return 'home';
  if (result === 'away_win') return 'away';
  return 'draw';
}

async function findLegacyMatches(matchId) {
  const base = `
    SELECT m.id, m.home_user_id, m.away_user_id, m.combat_log, m.result,
           m.ending_tour, m.environment_slug,
           COUNT(s.id) AS segment_count,
           SUM(CASE WHEN s.template_key IS NULL OR s.template_key = '' THEN 1 ELSE 0 END) AS legacy_count
    FROM matches m
    LEFT JOIN match_narrative_segments s ON s.match_id = m.id
    WHERE m.combat_log IS NOT NULL
  `;
  if (matchId) {
    return query(`${base} AND m.id = ? GROUP BY m.id HAVING legacy_count > 0`, [matchId]);
  }
  return query(`${base} GROUP BY m.id HAVING legacy_count > 0 ORDER BY m.id`);
}

async function backfillMatch(match, { dryRun }) {
  const combatLog = parseCombatLog(match.combat_log);
  if (!combatLog?.logs?.length) {
    return { matchId: match.id, status: 'skipped', reason: 'combat_log vide' };
  }

  const [homeCtx, awayCtx] = await Promise.all([
    loadNarrativeContext(match.home_user_id),
    loadNarrativeContext(match.away_user_id),
  ]);

  const narrative = assembleNarrative({
    matchId: match.id,
    homeSensei: homeCtx.senseiName,
    awaySensei: awayCtx.senseiName,
    homeNinjas: homeCtx.ninjas,
    awayNinjas: awayCtx.ninjas,
    combatLog,
    winner: mapWinner(match.result, match.home_user_id, match.away_user_id),
    endReason: combatLog.endReason || 'points',
    endingTour: match.ending_tour || combatLog.logs.length,
    environmentSlug: match.environment_slug,
  });

  if (!dryRun) {
    await persistNarrativeSegments(match.id, narrative.segments);
  }

  return {
    matchId: match.id,
    status: dryRun ? 'dry-run' : 'ok',
    segments: narrative.segments.length,
    legacyBefore: match.legacy_count,
  };
}

async function main() {
  const { dryRun, matchId } = parseArgs();
  console.log(`\n📜 narrative:backfill${dryRun ? ' (dry-run)' : ''}\n`);

  const matches = await findLegacyMatches(matchId);
  if (!matches.length) {
    console.log('Aucun match legacy à régénérer.');
    await pool.end();
    return;
  }

  let ok = 0;
  for (const match of matches) {
    try {
      const result = await backfillMatch(match, { dryRun });
      console.log(
        `  Match ${result.matchId} · ${result.status} · ${result.segments ?? 0} segments (legacy ${match.legacy_count}/${match.segment_count})`
      );
      if (result.status === 'ok' || result.status === 'dry-run') ok += 1;
    } catch (err) {
      console.log(`  Match ${match.id} · ❌ ${err.message}`);
    }
  }

  console.log(`\n✅ ${ok}/${matches.length} match(s) traités.\n`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
