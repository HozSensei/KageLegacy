export const POOL_SIZE = 6;
export const SEASON_CYCLES = 10;
export const LOWEST_DIVISION = 5;

/** Vérifie qu'un calendrier round-robin est valide (1 match par joueur et par journée). */
export function validateRoundRobinSchedule(schedule, memberCount) {
  const byCycle = new Map();
  for (const entry of schedule) {
    if (!byCycle.has(entry.seasonCycle)) byCycle.set(entry.seasonCycle, []);
    byCycle.get(entry.seasonCycle).push(entry);
  }

  const expectedMatches = memberCount / 2;
  for (const [, matches] of byCycle) {
    if (matches.length !== expectedMatches) return false;
    const counts = new Map();
    for (const match of matches) {
      for (const userId of [match.homeUserId, match.awayUserId]) {
        counts.set(userId, (counts.get(userId) || 0) + 1);
      }
    }
    for (const count of counts.values()) {
      if (count !== 1) return false;
    }
  }
  return true;
}

/** Round-robin classique (méthode du cercle), dupliqué pour 10 journées */
export function buildRoundRobinSchedule(memberIds, totalCycles = SEASON_CYCLES) {
  const teams = [...memberIds];
  if (teams.length % 2 !== 0) teams.push(null);

  const n = teams.length;
  const rotating = teams.slice(1);
  const singleRounds = n - 1;
  const baseRounds = [];

  for (let r = 0; r < singleRounds; r += 1) {
    const positions = [teams[0], ...rotating];
    const pairings = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = positions[i];
      const away = positions[n - 1 - i];
      if (home && away) pairings.push([home, away]);
    }
    baseRounds.push(pairings);
    rotating.unshift(rotating.pop());
  }

  const schedule = [];
  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    const round = baseRounds[(cycle - 1) % baseRounds.length];
    for (const [home, away] of round) {
      const swap = cycle > singleRounds;
      schedule.push({
        seasonCycle: cycle,
        homeUserId: swap ? away : home,
        awayUserId: swap ? home : away,
      });
    }
  }

  return schedule;
}
