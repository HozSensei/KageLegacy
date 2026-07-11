/**
 * Tests cartes tactiques — starter, équipement, charges, marché.
 * Usage: node scripts/testTacticCards.js
 */
import { query } from '../src/config/database.js';
import {
  ensureStarterTacticCards,
  equipTacticCard,
  getTacticCardsForUser,
  grantTacticCard,
  unequipTacticCard,
} from '../src/services/tacticCards/tacticCardService.js';
import { createTacticCardListing } from '../src/services/playerMarketService.js';
import { tryTriggerTacticCard, initTacticCardOnFighter } from '../src/services/tacticCards/tacticCardCombat.js';
import { STARTER_CARD_SLUGS, TACTIC_CARD_MAX_CHARGES } from '../src/services/tacticCards/tacticCardCatalog.js';

const PREFIX = `tactic_cards_${Date.now()}`;

async function createUser() {
  const userResult = await query('INSERT INTO users (username, is_bot) VALUES (?, FALSE)', [
    `${PREFIX}_user`,
  ]);
  const userId = userResult.insertId;
  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, 'Test', 'Taijutsu', 10000, 0, 100, 'fr')`,
    [userId]
  );
  const ninjaResult = await query(
    `INSERT INTO ninjas (
       user_id, name, grade, age, squad_position, training_focus,
       taijutsu, ninjutsu, genjutsu, medecine, vitesse, intelligence,
       moral, weekly_forme, battle_strategy, character_trait, element_affinity
     ) VALUES (?, ?, 'Chunin', 16, 1, 'Taijutsu', 40, 35, 30, 25, 45, 30, 15, 'Passable', 'Tank', 'Discipline', 'Katon')`,
    [userId, `${PREFIX}_ninja`]
  );
  return { userId, ninjaId: ninjaResult.insertId };
}

async function cleanup(userId) {
  await query('DELETE FROM player_listings WHERE seller_user_id = ?', [userId]);
  await query('DELETE FROM ninja_tactic_cards WHERE user_tactic_card_id IN (SELECT id FROM user_tactic_cards WHERE user_id = ?)', [userId]);
  await query('DELETE FROM user_tactic_cards WHERE user_id = ?', [userId]);
  await query('DELETE FROM ninjas WHERE user_id = ?', [userId]);
  await query('DELETE FROM sensei WHERE user_id = ?', [userId]);
  await query('DELETE FROM users WHERE id = ?', [userId]);
}

function makeFighter(id, name, stats = {}) {
  return {
    id,
    name,
    side: 'home',
    ko: false,
    pv: 80,
    maxPv: 100,
    chakra: 50,
    maxChakra: 50,
    stats: { taijutsu: 40, ninjutsu: 35, genjutsu: 30, medecine: 25, ...stats },
    tacticCardUsedThisMatch: false,
  };
}

async function main() {
  const defRows = await query('SELECT COUNT(*) AS c FROM tactic_card_definitions');
  if (!Number(defRows[0]?.c)) {
    console.error('SKIP: migration 039 non appliquée — exécutez les migrations.');
    process.exit(0);
  }

  const { userId, ninjaId } = await createUser();

  const granted = await ensureStarterTacticCards(userId);
  console.assert(granted, 'starter cards granted');
  const cards = await getTacticCardsForUser(userId);
  console.assert(cards.length === 3, `3 starter cards, got ${cards.length}`);
  console.assert(
    STARTER_CARD_SLUGS.every((slug) => cards.some((c) => c.slug === slug)),
    'starter slugs present'
  );
  console.assert(cards.every((c) => c.chargesRemaining === TACTIC_CARD_MAX_CHARGES), '3 charges each');
  console.assert(cards.every((c) => c.userTacticCardId === c.id), 'userTacticCardId exposed');

  const dup = await ensureStarterTacticCards(userId);
  console.assert(!dup, 'no duplicate starter grant');
  const cardsAfter = await getTacticCardsForUser(userId);
  console.assert(cardsAfter.length === 3, 'still 3 cards after second ensure');

  const duplicateSlug = 'tai-parade-ecole';
  await grantTacticCard(userId, duplicateSlug);
  await grantTacticCard(userId, duplicateSlug);
  const duplicates = (await getTacticCardsForUser(userId)).filter((c) => c.slug === duplicateSlug);
  console.assert(duplicates.length >= 2, 'duplicate card copies listed');
  console.assert(
    new Set(duplicates.map((c) => c.id)).size === duplicates.length,
    'each card copy has a distinct user_tactic_card id'
  );

  const cardId = cards[0].id;
  await equipTacticCard(userId, ninjaId, cardId);
  const equipped = await getTacticCardsForUser(userId);
  console.assert(equipped.find((c) => c.id === cardId)?.equippedNinjaId === ninjaId, 'card equipped');

  let blocked = false;
  try {
    await createTacticCardListing(userId, cardId, 400);
  } catch (e) {
    blocked = e.statusCode === 400;
  }
  console.assert(blocked, 'cannot list equipped card');

  await unequipTacticCard(userId, ninjaId);
  const listing = await createTacticCardListing(userId, cardId, 450);
  console.assert(listing.listingId, 'card listed');

  const fighter = makeFighter(1, 'Tank');
  initTacticCardOnFighter(fighter, {
    user_tactic_card_id: 999,
    charges_remaining: 3,
    slug: 'tai-parade-ecole',
    name_fr: 'Parade',
    name_en: 'Parry',
    card_type: 'defense',
    stat_type: 'taijutsu',
    trigger_kind: 'targeted_twice_same_tour',
    trigger_params: { minHits: 2 },
    target_kind: 'self',
    target_params: {},
    effect_kind: 'damage_reduction_pct',
    effect_params: { basePct: 0.35 },
    narrative_key: 'card_parry',
  });

  const team = { fighters: [fighter] };
  const ctx = {
    attackerTeam: team,
    defenderTeam: { fighters: [makeFighter(2, 'Enemy')] },
    attacker: makeFighter(2, 'Enemy'),
    defender: fighter,
    technique: { type: 'taijutsu' },
    tourTargetCounts: { 1: 2 },
    genjutsuSucceeded: false,
  };

  const first = tryTriggerTacticCard(fighter, ctx);
  console.assert(first, 'card procs');
  console.assert(fighter.tacticCardUsedThisMatch, 'one proc per match flag');
  console.assert(fighter.tacticCard.charges_remaining === 2, 'charge consumed on proc');

  const second = tryTriggerTacticCard(fighter, ctx);
  console.assert(!second, 'no second proc same match');

  const extra = await grantTacticCard(userId, 'nin-eclair-discret', 1);
  console.assert(extra.chargesRemaining === 1, 'grant respects max 1 charge when requested');

  await query('DELETE FROM player_listings WHERE id = ?', [listing.listingId]);
  await cleanup(userId);

  console.log('testTacticCards: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
