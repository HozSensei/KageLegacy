import { consumeTacticCardCharge } from './tacticCardService.js';

/**
 * Persiste les charges des éléments de deck joués pendant un match (après simulation).
 */
export async function persistPlayedDeckElementCharges(cardIds = []) {
  const processed = new Set();
  for (const cardId of cardIds) {
    if (!cardId || processed.has(cardId)) continue;
    processed.add(cardId);
    await consumeTacticCardCharge(cardId);
  }
}

/** @deprecated Utiliser persistPlayedDeckElementCharges */
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
