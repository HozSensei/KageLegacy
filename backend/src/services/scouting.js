import { query } from '../config/database.js';
import { getUserMatchForCycle } from './matchService.js';

function analyzeStrategies(ninjas) {
  const counts = { Tank: 0, Offensive: 0, Protect: 0, Normal: 0 };
  for (const n of ninjas) {
    counts[n.battle_strategy] = (counts[n.battle_strategy] || 0) + 1;
  }
  return counts;
}

function dominantElement(ninjas) {
  const freq = {};
  for (const n of ninjas) {
    freq[n.element_affinity] = (freq[n.element_affinity] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export async function generateScoutReport(userId, seasonCycle) {
  const match = await getUserMatchForCycle(userId, seasonCycle);
  if (!match) return null;

  const opponentId =
    match.home_user_id === userId ? match.away_user_id : match.home_user_id;
  const opponentName =
    match.home_user_id === userId ? match.away_sensei : match.home_sensei;

  const ninjas = await query(
    `SELECT battle_strategy, element_affinity, taijutsu, ninjutsu, genjutsu, vitesse, intelligence
     FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL`,
    [opponentId]
  );

  const strategies = analyzeStrategies(ninjas);
  const speed = ninjas.reduce((s, n) => s + n.vitesse + n.intelligence, 0);
  const element = dominantElement(ninjas);
  const ninjutsuAvg = Math.round(
    ninjas.reduce((s, n) => s + n.ninjutsu + n.genjutsu, 0) / Math.max(ninjas.length, 1)
  );

  const lines = [];
  if (ninjutsuAvg >= 14) lines.push('Forte tendance au Ninjutsu et aux illusions.');
  else if (Math.max(...ninjas.map((n) => n.taijutsu)) >= 10) {
    lines.push('Présence d\'une garde physique lourde (Taijutsu élevé).');
  } else {
    lines.push('Profil équilibré, peu de faille évidente.');
  }

  if (strategies.Tank >= 1) lines.push('Au moins un ninja en posture Tank repéré.');
  if (strategies.Offensive >= 2) lines.push('Disposition offensive marquée sur plusieurs membres.');

  if (speed >= 55) lines.push('Escouade très rapide — attention à l\'initiative.');
  else if (speed <= 40) lines.push('Vitesse tactique modeste, match probablement lent.');

  if (element) lines.push(`Affinité ${element} dominante dans le trio.`);

  return {
    opponentName,
    opponentIsBot: Boolean(match.home_user_id === userId ? match.away_is_bot : match.home_is_bot),
    lines,
  };
}

export async function generateScoutReportsForAllUsers() {
  const users = await query(
    `SELECT u.id FROM users u
     JOIN pool_members pm ON pm.user_id = u.id
     JOIN pools p ON p.id = pm.pool_id
     WHERE u.is_bot = FALSE AND p.status = 'active'`
  );
  const reports = [];
  for (const user of users) {
    const pool = await query(
      `SELECT p.current_cycle FROM pools p
       JOIN pool_members pm ON pm.pool_id = p.id WHERE pm.user_id = ?`,
      [user.id]
    );
    const cycle = pool[0]?.current_cycle ?? 1;
    const report = await generateScoutReport(user.id, cycle);
    if (report) reports.push({ userId: user.id, report });
  }
  return reports;
}
