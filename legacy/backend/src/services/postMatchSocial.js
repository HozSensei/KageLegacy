/**
 * Effets sociaux post-match : rivalités, upsets, objectifs de cycle.
 */

import { query } from '../config/database.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { recordRivalryResult } from './rivalryService.js';
import { recordCycleObjectiveEvent } from './cycleObjectiveService.js';

function parseCombatLog(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function squadPowerFromSnapshot(snap) {
  if (!Array.isArray(snap) || !snap.length) return 0;
  return snap.reduce((sum, n) => sum + Number(n.speed || 0), 0);
}

async function isHuman(userId) {
  const rows = await query('SELECT is_bot FROM users WHERE id = ?', [userId]);
  return rows[0] && !rows[0].is_bot;
}

/**
 * Appelé après application des standings pour un match.
 */
export async function applyPostMatchSocial(match) {
  const homeId = match.home_user_id;
  const awayId = match.away_user_id;
  const poolId = match.pool_id;
  const result = match.result;
  const combatLog = parseCombatLog(match.combat_log);

  let homeOutcome = 'draw';
  let awayOutcome = 'draw';
  if (result === 'home_win') {
    homeOutcome = 'win';
    awayOutcome = 'loss';
  } else if (result === 'away_win') {
    homeOutcome = 'loss';
    awayOutcome = 'win';
  }

  const homeRival = await recordRivalryResult(homeId, awayId, poolId, homeOutcome);
  const awayRival = await recordRivalryResult(awayId, homeId, poolId, awayOutcome);

  if (homeRival?.becameNemesis && (await isHuman(homeId))) {
    const names = await query('SELECT name FROM sensei WHERE user_id = ?', [awayId]);
    await createSenseiNotification(homeId, 'rivalry_nemesis', {
      rivalUserId: awayId,
      rivalName: names[0]?.name || '—',
      consecutiveLosses: homeRival.consecutiveLosses,
      matchId: match.id,
    });
  }
  if (awayRival?.becameNemesis && (await isHuman(awayId))) {
    const names = await query('SELECT name FROM sensei WHERE user_id = ?', [homeId]);
    await createSenseiNotification(awayId, 'rivalry_nemesis', {
      rivalUserId: homeId,
      rivalName: names[0]?.name || '—',
      consecutiveLosses: awayRival.consecutiveLosses,
      matchId: match.id,
    });
  }

  if (homeOutcome === 'win') await recordCycleObjectiveEvent(homeId, 'league_win');
  if (awayOutcome === 'win') await recordCycleObjectiveEvent(awayId, 'league_win');

  // Upset : vainqueur avec snapshot clairement plus faible
  if (result === 'home_win' || result === 'away_win') {
    const winnerSide = result === 'home_win' ? 'home' : 'away';
    const loserSide = winnerSide === 'home' ? 'away' : 'home';
    const winnerId = winnerSide === 'home' ? homeId : awayId;
    const loserId = winnerSide === 'home' ? awayId : homeId;
    const winnerPower = squadPowerFromSnapshot(combatLog?.squadSnapshots?.[winnerSide]);
    const loserPower = squadPowerFromSnapshot(combatLog?.squadSnapshots?.[loserSide]);
    const winnerPv = Number(
      winnerSide === 'home' ? combatLog?.homeScorePct : combatLog?.awayScorePct
    );
    const loserPv = Number(
      winnerSide === 'home' ? combatLog?.awayScorePct : combatLog?.homeScorePct
    );

    const underdogBySpeed = loserPower > 0 && winnerPower > 0 && winnerPower <= loserPower * 0.85;
    const underdogByPvStart = false; // PV restants ne mesurent pas le départ
    const isUpset = underdogBySpeed || underdogByPvStart;

    // Fallback : victoire KO contre une équipe qui a encore plus de plis
    const plis = combatLog?.plisWon || {};
    const winnerPlis = Number(plis[winnerSide] || 0);
    const loserPlis = Number(plis[loserSide] || 0);
    const narrowOrKoUpset =
      combatLog?.endReason === 'ko' && loserPlis >= winnerPlis;

    if (isUpset || narrowOrKoUpset) {
      const [wName, lName] = await Promise.all([
        query('SELECT name FROM sensei WHERE user_id = ?', [winnerId]),
        query('SELECT name FROM sensei WHERE user_id = ?', [loserId]),
      ]);
      const payload = {
        matchId: match.id,
        winnerName: wName[0]?.name || '—',
        loserName: lName[0]?.name || '—',
        endReason: combatLog?.endReason || 'points',
        winnerPv: Math.round(winnerPv || 0),
        loserPv: Math.round(loserPv || 0),
      };
      if (await isHuman(winnerId)) {
        await createSenseiNotification(winnerId, 'upset', { ...payload, role: 'winner' });
      }
      if (await isHuman(loserId)) {
        await createSenseiNotification(loserId, 'upset', { ...payload, role: 'loser' });
      }
    }
  }
}
