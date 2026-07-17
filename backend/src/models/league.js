import { query } from '../config/database.js';
import { findUserPool } from '../services/poolService.js';
import { getUserMatchForCycle } from '../services/matchService.js';
import { generateScoutReport } from '../services/scouting.js';
import { buildSenseiIdentities } from '../services/senseiIdentityService.js';
import { getUserLanguage } from '../services/narrative/viewerLocale.js';
import {
  enrichStandingsSocial,
  enrichNextMatchSocial,
  getPoolRosterCounts,
} from '../services/leagueSocialService.js';

const DIVISION_ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

export async function getLeaguePayload(userId) {
  const pool = await findUserPool(userId);
  if (!pool) return null;

  const standings = await query(
    `SELECT ps.*, s.name AS sensei_name, u.is_bot
     FROM pool_standings ps
     JOIN sensei s ON s.user_id = ps.user_id
     JOIN users u ON u.id = ps.user_id
     WHERE ps.pool_id = ?
     ORDER BY ps.points DESC, ps.wins DESC, ps.played ASC`,
    [pool.id]
  );

  const nextMatch = await getUserMatchForCycle(userId, pool.current_cycle);

  const recentMatches = await query(
    `SELECT m.*, hs.name AS home_sensei, aws.name AS away_sensei
     FROM matches m
     JOIN sensei hs ON hs.user_id = m.home_user_id
     JOIN sensei aws ON aws.user_id = m.away_user_id
     WHERE m.pool_id = ? AND m.status = 'applied'
     ORDER BY m.season_cycle DESC
     LIMIT 5`,
    [pool.id]
  );

  const scoutReport =
    pool.current_cycle >= 1 ? await generateScoutReport(userId, pool.current_cycle) : null;

  const locale = await getUserLanguage(userId);
  const identityMap = await buildSenseiIdentities(
    standings.map((row) => row.user_id),
    locale,
    pool
  );

  let nextMatchPayload = null;
  if (nextMatch) {
    const matchIdentityMap = await buildSenseiIdentities(
      [nextMatch.home_user_id, nextMatch.away_user_id],
      locale,
      pool
    );
    nextMatchPayload = {
      id: nextMatch.id,
      cycle: nextMatch.season_cycle,
      status: nextMatch.status,
      result: nextMatch.result,
      homeUserId: nextMatch.home_user_id,
      awayUserId: nextMatch.away_user_id,
      home: {
        name: nextMatch.home_sensei,
        isBot: Boolean(nextMatch.home_is_bot),
        isGuest: Boolean(nextMatch.home_is_guest),
        identity: matchIdentityMap.get(nextMatch.home_user_id) ?? null,
      },
      away: {
        name: nextMatch.away_sensei,
        isBot: Boolean(nextMatch.away_is_bot),
        isGuest: Boolean(nextMatch.away_is_guest),
        identity: matchIdentityMap.get(nextMatch.away_user_id) ?? null,
      },
      isHome: nextMatch.home_user_id === userId,
      opponentName:
        nextMatch.home_user_id === userId
          ? nextMatch.away_sensei
          : nextMatch.home_sensei,
      homeScore: nextMatch.home_score,
      awayScore: nextMatch.away_score,
    };
  }

  const baseStandings = standings.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    senseiName: row.sensei_name,
    identity: identityMap.get(row.user_id) ?? {
      userId: row.user_id,
      senseiName: row.sensei_name,
      isBot: Boolean(row.is_bot),
      isElite: false,
      gradeLabel: row.is_bot ? 'bot' : 'jonin',
      title: null,
      titleSlug: null,
      bannerSlug: 'none',
      nameColor: '#e8ece9',
      profileUrl: `/sensei/${row.user_id}`,
    },
    isBot: Boolean(row.is_bot),
    points: row.points,
    played: row.played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    isPlayer: row.user_id === userId,
  }));

  const [enrichedStandings, enrichedNext, roster] = await Promise.all([
    enrichStandingsSocial(userId, pool.id, baseStandings),
    enrichNextMatchSocial(userId, pool.id, nextMatchPayload),
    getPoolRosterCounts(pool.id),
  ]);

  return {
    pool: {
      id: pool.id,
      division: DIVISION_ROMAN[pool.division_level] || String(pool.division_level),
      divisionLevel: pool.division_level,
      season: pool.season_number,
      currentCycle: pool.current_cycle,
      maxCycles: 10,
      status: pool.status,
      roster,
    },
    standings: enrichedStandings,
    nextMatch: enrichedNext,
    recentMatches: recentMatches.map((m) => ({
      id: m.id,
      cycle: m.season_cycle,
      home: m.home_sensei,
      away: m.away_sensei,
      score: `${m.home_score ?? '–'}:${m.away_score ?? '–'}`,
      result: m.result,
      status: m.status,
    })),
    scoutReport,
  };
}

export { DIVISION_ROMAN };
