import { query } from '../config/database.js';
import { getGameClock } from './gameClock.js';
import { getUserMatchForCycle } from './matchService.js';
import { buildDebriefing, pickSuspenseLine } from './narrative/debriefing.js';
import { getNarrativeSegments } from './narrative/narrativeStore.js';

function parseCombatLog(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function minutesSinceReveal(revealStartAt, now = new Date()) {
  if (!revealStartAt) return 0;
  const start = new Date(revealStartAt);
  return Math.max(0, (now - start) / 60000);
}

function userPerspective(match, userId) {
  const isHome = match.home_user_id === userId;
  return {
    isHome,
    opponentSensei: isHome ? match.away_sensei : match.home_sensei,
    side: isHome ? 'home' : 'away',
  };
}

export async function getOperationLivePayload(userId) {
  const clock = await getGameClock();
  const poolRows = await query(
    `SELECT p.id, p.current_cycle FROM pools p
     JOIN pool_members pm ON pm.pool_id = p.id
     WHERE pm.user_id = ? AND p.status = 'active' LIMIT 1`,
    [userId]
  );

  if (!poolRows.length) {
    return {
      gameClock: clock,
      state: 'no_pool',
      chronicle: [],
      suspense: null,
      debriefing: [],
      match: null,
      mechanical: null,
    };
  }

  const pool = poolRows[0];
  const match = await getUserMatchForCycle(userId, pool.current_cycle);

  if (!match) {
    return {
      gameClock: clock,
      state: 'no_match',
      chronicle: [],
      suspense: null,
      debriefing: [],
      match: null,
      mechanical: null,
    };
  }

  const perspective = userPerspective(match, userId);
  const combatLog = parseCombatLog(match.combat_log);
  const allSegments = await getNarrativeSegments(match.id);

  const revealComplete =
    clock.hour >= 72 || match.status === 'applied' || clock.cycleComplete;
  const liveWindow = clock.hour >= 71 || match.status === 'revealing' || match.status === 'applied';

  let unlockedMinutes = 60;
  if (!revealComplete && match.reveal_start_at) {
    unlockedMinutes = minutesSinceReveal(match.reveal_start_at);
  }

  const chronicle = allSegments
    .filter((s) => revealComplete || Number(s.unlock_minutes) <= unlockedMinutes)
    .map((s) => ({ order: s.segment_order, blockType: s.block_type, text: s.text }));

  const hasDenouement = chronicle.some((s) => s.blockType === 'denouement');
  const morePending =
    !revealComplete && allSegments.some((s) => Number(s.unlock_minutes) > unlockedMinutes);

  let state = 'waiting';
  if (match.status === 'scheduled' && clock.hour < 71) state = 'scheduled';
  else if (match.status === 'scheduled' && clock.hour >= 71) state = 'simulating';
  else if (match.status === 'revealing') state = 'live';
  else if (match.status === 'applied') state = 'finished';

  const debriefing =
    revealComplete || clock.hour >= 72 ? buildDebriefing(match, userId, combatLog) : [];

  const mechanical =
    combatLog && chronicle.length
      ? {
          possession: combatLog.possession,
          homeScorePct: combatLog.homeScorePct,
          awayScorePct: combatLog.awayScorePct,
          endingTour: match.ending_tour,
          result: match.result,
          winnerUserId: match.winner_user_id,
          isHome: perspective.isHome,
        }
      : null;

  return {
    gameClock: clock,
    state,
    liveWindow,
    chronicle,
    suspense: morePending && !hasDenouement ? pickSuspenseLine() : null,
    debriefing,
    match: {
      id: match.id,
      status: match.status,
      result: match.result,
      homeScore: match.home_score,
      awayScore: match.away_score,
      opponentSensei: perspective.opponentSensei,
      isHome: perspective.isHome,
      endingTour: match.ending_tour,
      seasonCycle: match.season_cycle,
    },
    mechanical,
  };
}
