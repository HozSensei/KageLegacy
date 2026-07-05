export const POOL_SIZE = 6;
export const SEASON_CYCLES = 10;
export const LOWEST_DIVISION = 5;

/** Round-robin classique (n pair), dupliqué pour 10 journées */
export function buildRoundRobinSchedule(memberIds, totalCycles = SEASON_CYCLES) {
  const teams = [...memberIds];
  if (teams.length % 2 !== 0) teams.push(null);

  const n = teams.length;
  const fixed = teams[0];
  const rotating = teams.slice(1);
  const singleRounds = n - 1;
  const baseRounds = [];

  for (let r = 0; r < singleRounds; r += 1) {
    const pairings = [];
    if (fixed && rotating[rotating.length - 1]) {
      pairings.push([fixed, rotating[rotating.length - 1]]);
    }
    for (let i = 0; i < n / 2 - 1; i += 1) {
      const home = rotating[i];
      const away = rotating[n - 2 - i];
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
