import { query } from '../config/database.js';

const HOUR_MS = 60 * 60 * 1000;
const CYCLE_HOURS = 72;

export function computePhase(hour) {
  if (hour < 36) return 'training';
  if (hour < 71) return 'mid_cycle';
  if (hour === 71) return 'operation_live';
  return 'cycle_end';
}

export function computeClockState(cycleStartAt, now = new Date()) {
  const start = new Date(cycleStartAt);
  const elapsedMs = now - start;
  const elapsedHours = Math.floor(elapsedMs / HOUR_MS);

  if (elapsedHours >= CYCLE_HOURS) {
    return {
      hour: CYCLE_HOURS,
      elapsedHours,
      cycleStartAt: start.toISOString(),
      phase: 'cycle_end',
      tacticsLocked: true,
      cycleComplete: true,
    };
  }

  const hour = elapsedHours;
  return {
    hour,
    elapsedHours,
    cycleStartAt: start.toISOString(),
    phase: computePhase(hour),
    tacticsLocked: hour >= 71,
    cycleComplete: false,
  };
}

export async function getGameClock() {
  const rows = await query(
    'SELECT cycle_start_at, last_tick_hour FROM game_clock WHERE id = 1'
  );
  const cycleStart = rows[0]?.cycle_start_at;
  if (!cycleStart) {
    return { hour: 0, cycleStartAt: null, phase: 'training', tacticsLocked: false, cycleComplete: false };
  }
  return computeClockState(cycleStart);
}

export async function isTacticsLocked() {
  const clock = await getGameClock();
  return clock.tacticsLocked;
}

/** Avance d'une heure (outil dev) */
export async function advanceHourDev() {
  await query(
    'UPDATE game_clock SET cycle_start_at = DATE_SUB(cycle_start_at, INTERVAL 1 HOUR), last_tick_hour = 0 WHERE id = 1'
  );
  return getGameClock();
}

/** Place l'horloge à une heure précise du cycle en cours (outil dev) */
export async function setHourDev(targetHour) {
  const hour = Math.max(0, Math.min(CYCLE_HOURS, Number(targetHour)));
  await query(
    `UPDATE game_clock
     SET cycle_start_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR),
         last_tick_hour = ?
     WHERE id = 1`,
    [hour, hour]
  );
  return getGameClock();
}

/** Réinitialise le cycle (après job H72) */
export async function resetCycle() {
  await query(
    'UPDATE game_clock SET cycle_start_at = UTC_TIMESTAMP(), last_tick_hour = 0 WHERE id = 1'
  );
  return getGameClock();
}

export async function updateLastTickHour(hour) {
  await query('UPDATE game_clock SET last_tick_hour = ? WHERE id = 1', [hour]);
}

export async function getClockRow() {
  const rows = await query('SELECT cycle_start_at, last_tick_hour FROM game_clock WHERE id = 1');
  return rows[0];
}
