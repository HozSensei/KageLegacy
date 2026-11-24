/**
 * Deck management — create, activate, validate (20–30), passive bonuses
 *
 * Phase 1 branch point:
 *   playerCharacterService.getComputedStats → getDeckPassiveBonuses(userId)
 * Prefer importing this module’s getDeckPassiveBonuses (applique aussi les upgrades).
 */
import { query, getConnection } from '../config/database.js';
import { applyUpgradeBonuses, parseJsonSafe, serializeCardDefinition } from './cardService.js';

export const DECK_MIN_SIZE = 20;
export const DECK_MAX_SIZE = 30;
export const MAX_COPIES_PER_CARD = 3;
/** Hard limit: at most one lineage / clan legendary (`clan-*` slug) per deck. */
export const MAX_CLAN_CARDS = 1;
/** Hard limit: legendary + mythic copies combined (clan cards count). */
export const MAX_LEGENDARY_OR_MYTHIC = 3;

export const DECK_CONSTRAINTS = Object.freeze({
  min: DECK_MIN_SIZE,
  max: DECK_MAX_SIZE,
  maxCopies: MAX_COPIES_PER_CARD,
  maxClan: MAX_CLAN_CARDS,
  maxLegendaryOrMythic: MAX_LEGENDARY_OR_MYTHIC,
  /** Absolute floors on path cards (neutrals ignored). Splash arts are free. */
  minPrimaryArtCards: 15,
  minSecondaryArtCards: 5,
});

const ART_NAMES = {
  taijutsu: { fr: 'Taijutsu', en: 'Taijutsu' },
  ninjutsu: { fr: 'Ninjutsu', en: 'Ninjutsu' },
  genjutsu: { fr: 'Genjutsu', en: 'Genjutsu' },
  medicine: { fr: 'Médecine', en: 'Medicine' },
};

const STAT_KEYS = [
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
  'maxHp',
  'maxChakra',
  'startingBlock',
];

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function emptyStats() {
  return Object.fromEntries(STAT_KEYS.map(key => [key, 0]));
}

function mergeStats(...sources) {
  const result = emptyStats();
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      if (!STAT_KEYS.includes(key)) continue;
      const n = Number(value);
      if (Number.isFinite(n)) result[key] += n;
    }
  }
  return result;
}

function serializeDeckCard(row) {
  const card = serializeCardDefinition(row, { upgradeLevel: row.upgrade_level });
  return {
    deckCardId: row.deck_card_id,
    collectionId: row.user_card_collection_id,
    cardDefinitionId: row.card_definition_id,
    quantity: row.quantity,
    position: row.position,
    upgradeLevel: row.upgrade_level,
    card,
  };
}

async function assertDeckOwner(deckId, userId) {
  const rows = await query('SELECT * FROM user_decks WHERE id = ? AND user_id = ? LIMIT 1', [
    deckId,
    userId,
  ]);
  if (!rows[0]) throw httpError(404, 'Deck introuvable.');
  return rows[0];
}

export async function getDeckCards(deckId) {
  const rows = await query(
    `SELECT
       udc.id AS deck_card_id,
       udc.deck_id,
       udc.user_card_collection_id,
       udc.card_definition_id,
       udc.quantity,
       udc.position,
       ucc.upgrade_level,
       cd.*
     FROM user_deck_cards udc
     JOIN user_card_collection ucc ON ucc.id = udc.user_card_collection_id
     JOIN card_definitions cd ON cd.id = udc.card_definition_id
     WHERE udc.deck_id = ?
     ORDER BY udc.position IS NULL, udc.position, cd.name_fr`,
    [deckId],
  );
  return rows.map(serializeDeckCard);
}

export function countDeckSize(cards) {
  return cards.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
}

/** Resolve card meta whether the entry is nested (`card`) or flat (collection / SQL row). */
function cardMeta(entry) {
  const nested = entry?.card && typeof entry.card === 'object' ? entry.card : null;
  return {
    slug: nested?.slug ?? entry?.slug ?? '',
    rarity: nested?.rarity ?? entry?.rarity ?? '',
    statType: nested?.statType ?? nested?.stat_type ?? entry?.statType ?? entry?.stat_type,
    clan: nested?.clan ?? entry?.clan,
    tags: nested?.tags ?? entry?.tags,
    nameFr: nested?.nameFr ?? entry?.nameFr,
    nameEn: nested?.nameEn ?? entry?.nameEn,
  };
}

/**
 * Clan / lineage legendaries — slug `clan-*`, or explicit `clan` flag / tag
 * (matches seed on cursor/clan-legendary-cards-4c1a).
 */
export function isClanCard(entry) {
  const meta = cardMeta(entry);
  if (typeof meta.slug === 'string' && meta.slug.startsWith('clan-')) return true;
  if (meta.clan === true || meta.clan === 1 || meta.clan === 'clan') return true;
  if (Array.isArray(meta.tags) && meta.tags.map(String).includes('clan')) return true;
  return false;
}

export function isLegendaryOrMythic(entry) {
  const rarity = cardMeta(entry).rarity;
  return rarity === 'legendary' || rarity === 'mythic';
}

export function countClanCards(cards) {
  return cards.reduce((sum, entry) => {
    const qty = Number(entry.quantity) || 0;
    return isClanCard(entry) ? sum + qty : sum;
  }, 0);
}

export function countLegendaryOrMythic(cards) {
  return cards.reduce((sum, entry) => {
    const qty = Number(entry.quantity) || 0;
    return isLegendaryOrMythic(entry) ? sum + qty : sum;
  }, 0);
}

/**
 * Valide la taille, les limites de copies/rareté et la composition de voies (15 + 5).
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   errorsEn: string[],
 *   codes: string[],
 *   size: number,
 *   clanCount: number,
 *   legendaryOrMythicCount: number,
 *   artCounts: Record<string, number>,
 *   nonNeutralCount: number,
 *   minPrimaryArtCards: number,
 *   minSecondaryArtCards: number,
 *   primaryArt: string | null,
 *   secondaryArt: string | null,
 *   primaryCount: number,
 *   secondaryCount: number
 * }}
 */
export function validateDeck(cards) {
  const errors = [];
  const errorsEn = [];
  const codes = [];
  const size = countDeckSize(cards);
  const clanCount = countClanCards(cards);
  const legendaryOrMythicCount = countLegendaryOrMythic(cards);
  const { minPrimaryArtCards, minSecondaryArtCards } = DECK_CONSTRAINTS;
  const artCounts = Object.fromEntries(Object.keys(ART_NAMES).map(art => [art, 0]));

  if (size < DECK_MIN_SIZE) {
    codes.push('deck_too_small');
    errors.push(`Deck trop petit (${size}/${DECK_MIN_SIZE} minimum).`);
    errorsEn.push(`Deck too small (${size}/${DECK_MIN_SIZE} minimum).`);
  }
  if (size > DECK_MAX_SIZE) {
    codes.push('deck_too_big');
    errors.push(`Deck trop grand (${size}/${DECK_MAX_SIZE} maximum).`);
    errorsEn.push(`Deck too large (${size}/${DECK_MAX_SIZE} maximum).`);
  }

  for (const card of cards) {
    const qty = Number(card.quantity) || 0;
    const meta = cardMeta(card);
    if (Object.hasOwn(artCounts, meta.statType)) artCounts[meta.statType] += qty;
    if (qty > MAX_COPIES_PER_CARD) {
      const nameFr = meta.nameFr || card.cardDefinitionId || card.collectionId;
      const nameEn = meta.nameEn || meta.nameFr || card.cardDefinitionId || card.collectionId;
      codes.push('over_copies');
      errors.push(`Trop de copies de « ${nameFr} » (max ${MAX_COPIES_PER_CARD}).`);
      errorsEn.push(`Too many copies of "${nameEn}" (max ${MAX_COPIES_PER_CARD}).`);
    }
  }

  if (clanCount > MAX_CLAN_CARDS) {
    codes.push('too_many_clan');
    errors.push(`Maximum ${MAX_CLAN_CARDS} carte de clan par deck (actuellement ${clanCount}).`);
    errorsEn.push(`Max ${MAX_CLAN_CARDS} clan card per deck (currently ${clanCount}).`);
  }

  if (legendaryOrMythicCount > MAX_LEGENDARY_OR_MYTHIC) {
    codes.push('too_many_legendary');
    errors.push(
      `Maximum ${MAX_LEGENDARY_OR_MYTHIC} cartes légendaires ou mythiques par deck (actuellement ${legendaryOrMythicCount}).`,
    );
    errorsEn.push(
      `Max ${MAX_LEGENDARY_OR_MYTHIC} legendary or mythic cards per deck (currently ${legendaryOrMythicCount}).`,
    );
  }

  const rankedArts = Object.entries(artCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const nonNeutralCount = rankedArts.reduce((sum, [, count]) => sum + count, 0);
  const [primaryArt, primaryCount] = rankedArts[0] || [null, 0];
  const [secondaryArt, secondaryCount] = rankedArts[1] || [null, 0];

  if (primaryCount < minPrimaryArtCards) {
    const label = primaryArt ? ART_NAMES[primaryArt] : null;
    codes.push('insufficient_primary_art');
    errors.push(
      `Voie principale insuffisante : ${label?.fr || 'aucune'} ${primaryCount}/${minPrimaryArtCards} (il faut au moins ${minPrimaryArtCards} cartes d'une même voie).`,
    );
    errorsEn.push(
      `Primary path too low: ${label?.en || 'none'} ${primaryCount}/${minPrimaryArtCards} (need at least ${minPrimaryArtCards} cards of one path).`,
    );
  }

  if (secondaryCount < minSecondaryArtCards) {
    const label = secondaryArt ? ART_NAMES[secondaryArt] : null;
    codes.push('insufficient_secondary_art');
    errors.push(
      `Deuxième voie insuffisante : ${label?.fr || 'aucune'} ${secondaryCount}/${minSecondaryArtCards} (il faut au moins ${minSecondaryArtCards} cartes d'une autre voie).`,
    );
    errorsEn.push(
      `Secondary path too low: ${label?.en || 'none'} ${secondaryCount}/${minSecondaryArtCards} (need at least ${minSecondaryArtCards} cards of a second path).`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    errorsEn,
    codes,
    size,
    clanCount,
    legendaryOrMythicCount,
    artCounts,
    nonNeutralCount,
    minPrimaryArtCards,
    minSecondaryArtCards,
    primaryArt,
    secondaryArt,
    primaryCount,
    secondaryCount,
  };
}

/** The size floor and art composition only block activation and combat. */
function hardBuildErrors(validation) {
  const blocked = new Set(['deck_too_big', 'over_copies', 'too_many_clan', 'too_many_legendary']);
  const fr = [];
  const en = [];
  for (let i = 0; i < validation.codes.length; i += 1) {
    if (!blocked.has(validation.codes[i])) continue;
    fr.push(validation.errors[i]);
    en.push(validation.errorsEn[i]);
  }
  return { fr, en };
}

function bilingualError(frMessages, enMessages) {
  const fr = frMessages.filter(Boolean).join(' ');
  const en = enMessages.filter(Boolean).join(' ');
  if (fr && en && fr !== en) return `${fr} / ${en}`;
  return fr || en || 'Deck invalide.';
}

export async function listDecks(userId) {
  const decks = await query(
    'SELECT * FROM user_decks WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC',
    [userId],
  );

  const result = [];
  for (const deck of decks) {
    const cards = await getDeckCards(deck.id);
    result.push({
      id: deck.id,
      userId: deck.user_id,
      name: deck.name,
      isActive: Boolean(deck.is_active),
      archetype: deck.archetype,
      createdAt: deck.created_at,
      updatedAt: deck.updated_at,
      size: countDeckSize(cards),
      validation: validateDeck(cards),
      cards,
    });
  }
  return result;
}

export async function getDeck(userId, deckId) {
  const deck = await assertDeckOwner(deckId, userId);
  const cards = await getDeckCards(deck.id);
  return {
    id: deck.id,
    userId: deck.user_id,
    name: deck.name,
    isActive: Boolean(deck.is_active),
    archetype: deck.archetype,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    size: countDeckSize(cards),
    validation: validateDeck(cards),
    cards,
    passiveBonuses: computePassiveBonusesFromCards(cards),
  };
}

export async function getActiveDeck(userId) {
  const rows = await query('SELECT * FROM user_decks WHERE user_id = ? AND is_active = 1 LIMIT 1', [
    userId,
  ]);
  if (!rows[0]) return null;
  return getDeck(userId, rows[0].id);
}

/**
 * Resolve the deck that will actually be used in a combat and enforce every
 * active deck constraint immediately before the combat starts.
 */
export async function getPlayableDeckForCombat(userId, deckId = null) {
  const deck = deckId != null ? await getDeck(userId, Number(deckId)) : await getActiveDeck(userId);

  if (!deck) {
    throw httpError(
      400,
      'Aucun deck actif. Créez puis activez un deck valide de 20 à 30 cartes avant de lancer un combat.',
    );
  }

  const validation = deck.validation || validateDeck(deck.cards || []);
  if (!validation.valid) {
    throw httpError(
      400,
      `Le deck « ${deck.name} » ne peut pas être utilisé : ${bilingualError(
        validation.errors,
        validation.errorsEn,
      )} Corrigez-le avant de lancer un combat.`,
    );
  }

  return deck;
}

export async function createDeck(
  userId,
  { name, archetype = 'midrange', cards = [], skipOnboarding = false } = {},
) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 1) throw httpError(400, 'Nom du deck requis.');

  const existingCount = await query('SELECT COUNT(*) AS c FROM user_decks WHERE user_id = ?', [
    userId,
  ]);
  const isFirst = Number(existingCount[0]?.c) === 0;

  const result = await query(
    'INSERT INTO user_decks (user_id, name, is_active, archetype) VALUES (?, ?, ?, ?)',
    [userId, trimmed, 0, archetype],
  );

  const deckId = result.insertId;
  const deck =
    Array.isArray(cards) && cards.length > 0
      ? await replaceDeckCards(userId, deckId, cards, {
          skipOnboarding: true,
          // Decks starter : ne pas valider l’exploit « Arsenal complet ».
          skipAchievements: skipOnboarding,
        })
      : await getDeck(userId, deckId);

  // Les decks starter (skipOnboarding) ne doivent pas valider l’objectif « Créer un deck ».
  if (!isFirst && !skipOnboarding) {
    try {
      const { onOnboardingAction } = await import('./onboardingService.js');
      await onOnboardingAction(userId, 'deck_create');
    } catch {
      /* onboarding optionnel */
    }
  }

  return isFirst && deck.validation.valid ? setActiveDeck(userId, deckId) : deck;
}

export async function updateDeck(userId, deckId, { name, archetype } = {}) {
  await assertDeckOwner(deckId, userId);
  const sets = [];
  const params = [];

  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) throw httpError(400, 'Nom du deck invalide.');
    sets.push('name = ?');
    params.push(trimmed);
  }
  if (archetype != null) {
    sets.push('archetype = ?');
    params.push(archetype);
  }
  if (!sets.length) return getDeck(userId, deckId);

  params.push(deckId, userId);
  await query(`UPDATE user_decks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  return getDeck(userId, deckId);
}

export async function deleteDeck(userId, deckId) {
  const deck = await assertDeckOwner(deckId, userId);
  await query('DELETE FROM user_decks WHERE id = ? AND user_id = ?', [deckId, userId]);

  if (deck.is_active) {
    const others = await query(
      'SELECT id FROM user_decks WHERE user_id = ? ORDER BY updated_at DESC',
      [userId],
    );
    for (const other of others) {
      if (validateDeck(await getDeckCards(other.id)).valid) {
        await query('UPDATE user_decks SET is_active = 1 WHERE id = ?', [other.id]);
        break;
      }
    }
  }

  return { deleted: true, id: deckId };
}

export async function setActiveDeck(userId, deckId) {
  await assertDeckOwner(deckId, userId);
  const cards = await getDeckCards(deckId);
  const validation = validateDeck(cards);
  if (!validation.valid) {
    throw httpError(400, bilingualError(validation.errors, validation.errorsEn));
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE user_decks SET is_active = 0 WHERE user_id = ?', [userId]);
    await connection.execute('UPDATE user_decks SET is_active = 1 WHERE id = ? AND user_id = ?', [
      deckId,
      userId,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getDeck(userId, deckId);
}

async function loadOwnedCollection(userId, collectionId) {
  const rows = await query(
    `SELECT ucc.*, cd.rarity, cd.stat_type, cd.slug, cd.name_fr, cd.name_en
     FROM user_card_collection ucc
     JOIN card_definitions cd ON cd.id = ucc.card_definition_id
     WHERE ucc.id = ? AND ucc.user_id = ?
     LIMIT 1`,
    [collectionId, userId],
  );
  return rows[0] || null;
}

/**
 * Remplace entièrement les cartes d’un deck.
 * cards: [{ collectionId, quantity }]
 */
export async function replaceDeckCards(
  userId,
  deckId,
  cards,
  { skipOnboarding = false, skipAchievements = false } = {},
) {
  await assertDeckOwner(deckId, userId);

  const normalized = [];
  for (const entry of cards) {
    const collectionId = Number(entry.collectionId ?? entry.user_card_collection_id);
    const quantity = Math.max(1, Number(entry.quantity) || 1);
    if (!collectionId) throw httpError(400, 'collectionId requis.');
    const owned = await loadOwnedCollection(userId, collectionId);
    if (!owned) throw httpError(400, `Carte collection #${collectionId} introuvable.`);
    if (owned.quantity < quantity) {
      throw httpError(400, `Pas assez d’exemplaires pour la carte #${collectionId}.`);
    }
    normalized.push({
      collectionId,
      cardDefinitionId: owned.card_definition_id,
      quantity,
      slug: owned.slug,
      rarity: owned.rarity,
      statType: owned.stat_type,
      nameFr: owned.name_fr,
      nameEn: owned.name_en,
    });
  }

  const preview = normalized.map(n => ({
    collectionId: n.collectionId,
    cardDefinitionId: n.cardDefinitionId,
    quantity: n.quantity,
    slug: n.slug,
    rarity: n.rarity,
    card: {
      slug: n.slug,
      rarity: n.rarity,
      statType: n.statType,
      nameFr: n.nameFr || `#${n.collectionId}`,
      nameEn: n.nameEn || n.nameFr || `#${n.collectionId}`,
    },
  }));
  const validation = validateDeck(preview);
  // Allow incomplete decks while building — hard-block oversize / copies / clan / rarity caps
  const blocked = hardBuildErrors(validation);
  if (blocked.fr.length) {
    throw httpError(400, bilingualError(blocked.fr, blocked.en));
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM user_deck_cards WHERE deck_id = ?', [deckId]);
    let position = 0;
    for (const n of normalized) {
      position += 1;
      await connection.execute(
        `INSERT INTO user_deck_cards
          (deck_id, user_card_collection_id, card_definition_id, quantity, position)
         VALUES (?, ?, ?, ?, ?)`,
        [deckId, n.collectionId, n.cardDefinitionId, n.quantity, position],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const deck = await getDeck(userId, deckId);
  if (!skipAchievements) {
    try {
      const { onAchievementAction } = await import('./achievementService.js');
      await onAchievementAction(userId, 'deck_size', Number(deck?.size) || 0);
    } catch {
      /* exploits optionnels */
    }
  }
  if (!skipOnboarding) {
    try {
      const { onOnboardingAction } = await import('./onboardingService.js');
      await onOnboardingAction(userId, 'deck_edit');
    } catch {
      /* onboarding optionnel */
    }
  }
  return deck;
}

export async function addCardToDeck(userId, deckId, collectionId, quantity = 1) {
  await assertDeckOwner(deckId, userId);
  const qty = Math.max(1, Number(quantity) || 1);
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) throw httpError(404, 'Carte de collection introuvable.');

  const existing = await query(
    'SELECT * FROM user_deck_cards WHERE deck_id = ? AND user_card_collection_id = ? LIMIT 1',
    [deckId, collectionId],
  );

  const currentQty = existing[0] ? Number(existing[0].quantity) : 0;
  const nextQty = currentQty + qty;
  if (nextQty > MAX_COPIES_PER_CARD) {
    throw httpError(
      400,
      bilingualError(
        [`Max ${MAX_COPIES_PER_CARD} copies par carte.`],
        [`Max ${MAX_COPIES_PER_CARD} copies per card.`],
      ),
    );
  }
  if (nextQty > owned.quantity) {
    throw httpError(400, 'Pas assez d’exemplaires dans la collection.');
  }

  const cards = await getDeckCards(deckId);
  const sizeWithout = countDeckSize(cards.filter(c => c.collectionId !== collectionId));
  if (sizeWithout + nextQty > DECK_MAX_SIZE) {
    throw httpError(
      400,
      bilingualError(
        [`Deck limité à ${DECK_MAX_SIZE} cartes.`],
        [`Deck limited to ${DECK_MAX_SIZE} cards.`],
      ),
    );
  }

  const preview = [
    ...cards.filter(c => c.collectionId !== collectionId),
    {
      collectionId,
      quantity: nextQty,
      slug: owned.slug,
      rarity: owned.rarity,
      card: {
        slug: owned.slug,
        rarity: owned.rarity,
        statType: owned.stat_type,
        nameFr: owned.name_fr,
        nameEn: owned.name_en,
      },
    },
  ];
  const previewValidation = validateDeck(preview);
  const blocked = hardBuildErrors(previewValidation);
  if (blocked.fr.length) {
    throw httpError(400, bilingualError(blocked.fr, blocked.en));
  }

  if (existing[0]) {
    await query('UPDATE user_deck_cards SET quantity = ? WHERE id = ?', [nextQty, existing[0].id]);
  } else {
    await query(
      `INSERT INTO user_deck_cards
        (deck_id, user_card_collection_id, card_definition_id, quantity, position)
       VALUES (?, ?, ?, ?, ?)`,
      [deckId, collectionId, owned.card_definition_id, nextQty, cards.length + 1],
    );
  }

  try {
    const { onOnboardingAction } = await import('./onboardingService.js');
    await onOnboardingAction(userId, 'deck_edit');
  } catch {
    /* onboarding optionnel */
  }
  return getDeck(userId, deckId);
}

export async function removeCardFromDeck(userId, deckId, collectionId, quantity = 1) {
  await assertDeckOwner(deckId, userId);
  const qty = Math.max(1, Number(quantity) || 1);
  const existing = await query(
    'SELECT * FROM user_deck_cards WHERE deck_id = ? AND user_card_collection_id = ? LIMIT 1',
    [deckId, collectionId],
  );
  if (!existing[0]) throw httpError(404, 'Carte absente du deck.');

  const nextQty = Number(existing[0].quantity) - qty;
  if (nextQty <= 0) {
    await query('DELETE FROM user_deck_cards WHERE id = ?', [existing[0].id]);
  } else {
    await query('UPDATE user_deck_cards SET quantity = ? WHERE id = ?', [nextQty, existing[0].id]);
  }

  try {
    const { onOnboardingAction } = await import('./onboardingService.js');
    await onOnboardingAction(userId, 'deck_edit');
  } catch {
    /* onboarding optionnel */
  }
  return getDeck(userId, deckId);
}

function computePassiveBonusesFromCards(cards) {
  const bonuses = [];
  for (const entry of cards) {
    const qty = Number(entry.quantity) || 1;
    const passive = entry.card?.passiveBonus || {};
    for (let i = 0; i < qty; i += 1) {
      bonuses.push(passive);
    }
  }
  return mergeStats(...bonuses);
}

/**
 * Somme des passive_bonus des cartes du deck actif, avec upgrades appliqués.
 * Point d’entrée pour Phase 1 getComputedStats.
 */
export async function getDeckPassiveBonuses(userId) {
  const rows = await query(
    `SELECT
       udc.quantity,
       ucc.upgrade_level,
       cd.slug,
       cd.type,
       cd.stat_type,
       cd.passive_bonus_json,
       cd.upgrade_bonuses_json
     FROM user_decks d
     JOIN user_deck_cards udc ON udc.deck_id = d.id
     JOIN user_card_collection ucc ON ucc.id = udc.user_card_collection_id
     JOIN card_definitions cd ON cd.id = udc.card_definition_id
     WHERE d.user_id = ? AND d.is_active = 1`,
    [userId],
  );

  if (!rows.length) return emptyStats();

  const bonuses = [];
  for (const row of rows) {
    const computed = applyUpgradeBonuses(row, row.upgrade_level);
    const qty = Number(row.quantity) || 1;
    for (let i = 0; i < qty; i += 1) {
      bonuses.push(computed.passiveBonus);
    }
  }

  return mergeStats(...bonuses);
}

export { emptyStats as createEmptyPassiveStats, parseJsonSafe };
