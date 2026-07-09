import { getGameClock } from './gameClock.js';
import { getUserMatchForCycle } from './matchService.js';
import { buildDebriefing, pickSuspenseLine } from './narrative/debriefing.js';
import { resolveSegmentText } from './narrative/narrativeI18n.js';
import { getNarrativeSegments } from './narrative/narrativeStore.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import {
  assertViewerCanAccessMatch,
  browsePools,
  getPoolMatches,
  getViewerPoolId,
  isMatchParticipant,
  loadMatchRow,
} from './matchSpectatorService.js';
import { findUserPool } from './poolService.js';
import { buildSenseiIdentities } from './senseiIdentityService.js';
import { hasActiveEliteSubscription } from './eliteSubscriptionService.js';

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

export async function buildMatchOperationPayload(match, viewerUserId, access) {
  const clock = await getGameClock();
  const viewerLocale = await getUserLanguage(viewerUserId);
  const isParticipant = access.isParticipant;
  const perspective = isParticipant ? userPerspective(match, viewerUserId) : null;
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
    .map((s) => ({
      order: s.segment_order,
      blockType: s.block_type,
      text: resolveSegmentText(viewerLocale, s),
    }));

  const hasDenouement = chronicle.some((s) => s.blockType === 'denouement');
  const morePending =
    !revealComplete && allSegments.some((s) => Number(s.unlock_minutes) > unlockedMinutes);

  let state = 'waiting';
  if (match.status === 'scheduled' && clock.hour < 71) state = 'scheduled';
  else if (match.status === 'scheduled' && clock.hour >= 71) state = 'simulating';
  else if (match.status === 'revealing' || match.status === 'simulated') state = 'live';
  else if (match.status === 'applied') state = 'finished';

  const viewerIsElite = await hasActiveEliteSubscription(viewerUserId);

  const debriefing =
    viewerIsElite && isParticipant && (revealComplete || clock.hour >= 72)
      ? buildDebriefing(match, viewerUserId, combatLog, viewerLocale)
      : [];

  const mechanical =
    viewerIsElite && combatLog && chronicle.length
      ? {
          possession: combatLog.possession,
          homeScorePct: combatLog.homeScorePct,
          awayScorePct: combatLog.awayScorePct,
          endingTour: match.ending_tour,
          result: match.result,
          winnerUserId: match.winner_user_id,
          isHome: perspective?.isHome ?? null,
          equipmentSummary: combatLog.equipmentSummary || [],
          environment: combatLog.environment || null,
        }
      : null;

  const poolContext = {
    id: match.pool_id,
    season_number: match.season_number,
    division_level: match.division_level,
    current_cycle: match.pool_current_cycle,
    status: match.pool_status,
  };
  const identityMap = await buildSenseiIdentities(
    [match.home_user_id, match.away_user_id],
    viewerLocale,
    poolContext
  );
  const homeIdentity = identityMap.get(match.home_user_id) ?? null;
  const awayIdentity = identityMap.get(match.away_user_id) ?? null;

  return {
    gameClock: clock,
    state,
    liveWindow,
    chronicle,
    suspense: morePending && !hasDenouement ? pickSuspenseLine(viewerLocale, match.id) : null,
    debriefing,
    viewerRole: isParticipant ? 'participant' : 'spectator',
    pool: {
      id: match.pool_id,
      divisionLevel: match.division_level,
      season: match.season_number,
      currentCycle: match.pool_current_cycle,
      isViewerPool: access.samePool,
    },
    match: {
      id: match.id,
      status: match.status,
      result: match.result,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homeSensei: match.home_sensei,
      awaySensei: match.away_sensei,
      homeIdentity,
      awayIdentity,
      homeIsBot: Boolean(match.home_is_bot),
      awayIsBot: Boolean(match.away_is_bot),
      opponentSensei: perspective?.opponentSensei ?? null,
      isHome: perspective?.isHome ?? null,
      endingTour: match.ending_tour,
      seasonCycle: match.season_cycle,
      environmentSlug: match.environment_slug,
      environmentType: match.environment_type,
    },
    mechanical,
  };
}

export async function getMatchOperationPayload(matchId, viewerUserId) {
  const match = await loadMatchRow(matchId);
  if (!match) {
    const error = new Error('Match introuvable.');
    error.statusCode = 404;
    throw error;
  }
  const access = await assertViewerCanAccessMatch(viewerUserId, match);
  return buildMatchOperationPayload(match, viewerUserId, access);
}

export async function getOperationLivePayload(userId) {
  const clock = await getGameClock();
  const pool = await findUserPool(userId);

  if (!pool) {
    return {
      gameClock: clock,
      state: 'no_pool',
      chronicle: [],
      suspense: null,
      debriefing: [],
      viewerRole: 'spectator',
      pool: null,
      match: null,
      mechanical: null,
    };
  }

  const match = await getUserMatchForCycle(userId, pool.current_cycle);

  if (!match) {
    return {
      gameClock: clock,
      state: 'no_match',
      chronicle: [],
      suspense: null,
      debriefing: [],
      viewerRole: 'participant',
      pool: {
        id: pool.id,
        divisionLevel: pool.division_level,
        season: pool.season_number,
        currentCycle: pool.current_cycle,
        isViewerPool: true,
      },
      match: null,
      mechanical: null,
    };
  }

  const access = { samePool: true, isParticipant: true };
  return buildMatchOperationPayload(match, userId, access);
}

export async function getOperationNavigation(userId, { poolId, cycle, matchId } = {}) {
  const viewerPoolId = await getViewerPoolId(userId);
  const activePoolId = poolId != null ? Number(poolId) : viewerPoolId;

  if (!activePoolId) {
    return { viewerPoolId: null, poolId: null, cycle: null, matchId: null, matches: [], pools: [] };
  }

  const pools = await browsePools(userId);
  const resolvedCycle = cycle != null ? Number(cycle) : pools.find((p) => p.id === activePoolId)?.currentCycle;
  const fixture = await getPoolMatches(userId, activePoolId, { cycle: resolvedCycle });

  let activeMatchId = matchId != null ? Number(matchId) : null;
  if (!activeMatchId && fixture.matches.length) {
    const own = fixture.matches.find((m) => m.isParticipant);
    activeMatchId = own?.id ?? fixture.matches[0].id;
  }

  const matchIndex = fixture.matches.findIndex((m) => m.id === activeMatchId);

  return {
    viewerPoolId,
    poolId: activePoolId,
    cycle: resolvedCycle,
    matchId: activeMatchId,
    pools,
    matches: fixture.matches,
    pool: fixture.pool,
    prevMatchId: matchIndex > 0 ? fixture.matches[matchIndex - 1].id : null,
    nextMatchId:
      matchIndex >= 0 && matchIndex < fixture.matches.length - 1
        ? fixture.matches[matchIndex + 1].id
        : null,
  };
}
