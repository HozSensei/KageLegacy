import { query } from '../../config/database.js';
import { computeMatchPvFromRating } from '../ninjaStats.js';
import { applyFormeToStats } from './forme.js';
import { simulatePliCombat } from './pli/pliCombatEngine.js';
import {
  getOperationDeck,
  deckConfigForCombat,
} from '../operationDeckService.js';

export async function loadTeamForCombat(userId) {
  const senseiRows = await query('SELECT * FROM sensei WHERE user_id = ?', [userId]);
  const ninjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL
     ORDER BY squad_position`,
    [userId]
  );
  const operationDeck = await getOperationDeck(userId);

  return {
    userId,
    sensei: senseiRows[0] || null,
    ninjas,
    operationDeck,
  };
}

export function buildCombatTeam(teamData, sideLabel) {
  const fighters = teamData.ninjas.map((ninja, index) => {
    const stats = applyFormeToStats(ninja);
    const maxPv = computeMatchPvFromRating(stats);
    return {
      id: ninja.id,
      name: ninja.name,
      side: sideLabel,
      character_trait: ninja.character_trait,
      element_affinity: ninja.element_affinity,
      grade: ninja.grade,
      weekly_forme: ninja.weekly_forme,
      stats,
      pv: maxPv,
      maxPv,
      ko: false,
      slot: index + 1,
    };
  });

  return {
    userId: teamData.userId,
    label: sideLabel,
    sensei: teamData.sensei ? { name: teamData.sensei.name } : { name: 'Sensei' },
    fighters,
    operationDeck: teamData.operationDeck,
  };
}

export async function simulateMatchCombat(homeUserId, awayUserId, environmentSlug = null) {
  const homeData = await loadTeamForCombat(homeUserId);
  const awayData = await loadTeamForCombat(awayUserId);

  const home = buildCombatTeam(homeData, 'home');
  const away = buildCombatTeam(awayData, 'away');

  return simulatePliCombat(home, away, {
    environmentSlug,
    homeDeck: deckConfigForCombat(homeData.operationDeck),
    awayDeck: deckConfigForCombat(awayData.operationDeck),
  });
}