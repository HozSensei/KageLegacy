import { consumeTacticCardCharge } from './tacticCardService.js';

/**
 * Persiste les charges consommées pendant un match (après simulation).
 */
export async function persistTacticCardCombatUsage(teams) {
  const processed = new Set();
  for (const team of teams) {
    for (const fighter of team.fighters) {
      for (const event of fighter.tacticCardEventLog || []) {
        const cardId = event.userTacticCardId;
        if (!cardId || processed.has(cardId)) continue;
        processed.add(cardId);
        await consumeTacticCardCharge(cardId);
      }
    }
  }
}
