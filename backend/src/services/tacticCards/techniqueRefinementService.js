import { query } from '../../config/database.js';
import { assertSpendingAllowed, getDebtStatus } from '../economyDebt.js';
import { getHeritageBonuses, applyPercentDiscount } from '../heritageService.js';
import { getGameClock } from '../../models/sensei.js';
import { getTacticCardsForUser } from './tacticCardService.js';
import { rollTechniqueBonusPct } from './tacticCardRoll.js';
import { computeRefinementCost } from './tacticCardCatalog.js';

function enrichCardWithRefinement(card, heritageDiscountPct) {
  const refineBaseCost = computeRefinementCost(card.catalogPrice, card.rarity);
  const refineCost = applyPercentDiscount(refineBaseCost, heritageDiscountPct);
  return {
    ...card,
    refineBaseCost,
    refineCost,
    heritageDiscountPct,
    canRefine: !card.isListed,
  };
}

export async function getTechniqueRefinementPayload(userId) {
  const heritage = await getHeritageBonuses(userId);
  const cards = await getTacticCardsForUser(userId);
  const debt = await getDebtStatus(userId);
  const clock = await getGameClock();

  return {
    tacticCards: cards.map((card) => enrichCardWithRefinement(card, heritage.matchShopDiscountPct)),
    ryos: debt.ryos,
    debtBlocksSpending: debt.debtBlocksSpending,
    heritageDiscountPct: heritage.matchShopDiscountPct,
    gameClock: clock,
  };
}

export async function refineTechniqueCard(userId, userTacticCardId) {
  await assertSpendingAllowed(
    userId,
    'Gel administratif — remboursez votre dette avant de perfectionner une carte.'
  );

  const rows = await query(
    `SELECT utc.*, tcd.slug, tcd.catalog_price, tcd.rarity,
            tcd.pli_bonus_min, tcd.pli_bonus_max,
            s.ryos,
            pl.id AS listing_id
     FROM user_tactic_cards utc
     JOIN tactic_card_definitions tcd ON tcd.id = utc.tactic_card_definition_id
     JOIN sensei s ON s.user_id = utc.user_id
     LEFT JOIN player_listings pl ON pl.user_tactic_card_id = utc.id AND pl.status = 'active'
     WHERE utc.id = ? AND utc.user_id = ?`,
    [userTacticCardId, userId]
  );
  const row = rows[0];
  if (!row) {
    const error = new Error('Carte introuvable.');
    error.statusCode = 404;
    throw error;
  }
  if (Number(row.charges_remaining) <= 0) {
    const error = new Error('Cette carte est épuisée.');
    error.statusCode = 400;
    throw error;
  }
  if (row.listing_id) {
    const error = new Error('Retirez la carte du marché avant de la perfectionner.');
    error.statusCode = 409;
    throw error;
  }

  const heritage = await getHeritageBonuses(userId);
  const baseCost = computeRefinementCost(row.catalog_price, row.rarity);
  const cost = applyPercentDiscount(baseCost, heritage.matchShopDiscountPct);
  if (row.ryos < cost) {
    const error = new Error('Ryos insuffisants.');
    error.statusCode = 402;
    throw error;
  }

  const previousBonusPct = Number(row.pli_bonus_pct);
  const minBonus = Number(row.pli_bonus_min ?? 0.01);
  const maxBonus = Number(row.pli_bonus_max ?? row.pli_bonus_min ?? 0.2);
  const newBonusPct = rollTechniqueBonusPct(minBonus, maxBonus);

  await query('UPDATE sensei SET ryos = ryos - ? WHERE user_id = ?', [cost, userId]);
  await query('UPDATE user_tactic_cards SET pli_bonus_pct = ? WHERE id = ?', [
    newBonusPct,
    userTacticCardId,
  ]);

  const senseiRows = await query('SELECT ryos FROM sensei WHERE user_id = ?', [userId]);

  return {
    userTacticCardId,
    slug: row.slug,
    previousBonusPct,
    newBonusPct,
    cost,
    ryos: senseiRows[0]?.ryos ?? 0,
  };
}
