import { query } from '../../config/database.js';
import { computeMatchChakraMax } from '../ninjaStats.js';
import { applyFormeToStats } from './forme.js';
import { simulateCombat } from './combatEngine.js';

export async function loadTeamForCombat(userId) {
  const senseiRows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL
     ORDER BY squad_position`,
    [userId]
  );
  return {
    userId,
    sensei: senseiRows[0] || null,
    ninjas,
  };
}

export function buildCombatTeam(teamData, sideLabel) {
  const fighters = teamData.ninjas.map((ninja, index) => {
    const stats = applyFormeToStats(ninja);
    const maxPv = stats.taijutsu * 10;
    const maxChakra = computeMatchChakraMax(ninja.grade, stats.ninjutsu);
    return {
      id: ninja.id,
      name: ninja.name,
      side: sideLabel,
      character_trait: ninja.character_trait,
      element_affinity: ninja.element_affinity,
      battle_strategy: ninja.battle_strategy || 'Normal',
      grade: ninja.grade,
      weekly_forme: ninja.weekly_forme,
      stats,
      pv: maxPv,
      maxPv,
      chakra: maxChakra,
      maxChakra,
      ko: false,
      genjutsuReceived: false,
      status: null,
      slot: index + 1,
    };
  });

  return {
    userId: teamData.userId,
    label: sideLabel,
    sensei: teamData.sensei
      ? {
          name: teamData.sensei.name,
          chakraPool: teamData.sensei.chakra_pool,
          intelligence: teamData.sensei.specialty === 'Intelligence' ? 14 : 10,
        }
      : { name: 'Sensei', chakraPool: 0, intelligence: 8 },
    fighters,
  };
}

export async function simulateMatchCombat(homeUserId, awayUserId) {
  const homeData = await loadTeamForCombat(homeUserId);
  const awayData = await loadTeamForCombat(awayUserId);

  const home = buildCombatTeam(homeData, 'home');
  const away = buildCombatTeam(awayData, 'away');

  return simulateCombat(home, away);
}
