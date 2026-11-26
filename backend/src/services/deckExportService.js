/**
 * Export / import JSON du deck actif — format stable pour scripts d’équilibrage.
 *
 * Schéma `kage-deck-export` v1 :
 * - cartes identifiées par slug (pas d’id DB)
 * - quantity + upgradeLevel (0–2)
 * - métadonnées joueur / deck optionnelles pour traçabilité
 *
 * Les helpers parse / serialize sont purs (pas de DB) pour les scripts offline.
 *
 * @see scripts/simRealMissionBalance.js
 */

export const DECK_EXPORT_SCHEMA = 'kage-deck-export';
export const DECK_EXPORT_VERSION = 1;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function countCards(cards) {
  return (cards || []).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
}

/**
 * Sérialise un deck (structure getDeck) vers le format export.
 */
export function serializeDeckExport(deck, meta = {}) {
  if (!deck) throw httpError(404, 'Aucun deck actif à exporter.');

  const cards = (deck.cards || []).map(entry => {
    const card = entry.card || {};
    return {
      slug: String(card.slug || ''),
      quantity: Math.max(1, Number(entry.quantity) || 1),
      upgradeLevel: Math.max(0, Math.min(2, Number(entry.upgradeLevel ?? card.upgradeLevel) || 0)),
      // Champs informatifs (non requis à l’import) :
      nameFr: card.nameFr || null,
      rarity: card.rarity || null,
      type: card.type || null,
      statType: card.statType || null,
    };
  });

  return {
    schema: DECK_EXPORT_SCHEMA,
    schemaVersion: DECK_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    player: {
      userId: meta.userId ?? deck.userId ?? null,
      username: meta.username ?? null,
      characterName: meta.characterName ?? null,
    },
    deck: {
      id: deck.id ?? null,
      name: deck.name || null,
      archetype: deck.archetype || null,
      size: countCards(deck.cards || []),
      validation: deck.validation || null,
      cards,
    },
  };
}

/**
 * Charge le deck actif d’un joueur et le sérialise pour export admin / scripts.
 * (import dynamique DB — les scripts offline n’en ont pas besoin)
 */
export async function exportActiveDeckForUser(userId) {
  const uid = Number(userId);
  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw httpError(400, 'Identifiant joueur invalide.');
  }

  const { query } = await import('../config/database.js');
  const { getActiveDeck } = await import('./deckService.js');

  const players = await query(
    `SELECT u.id, u.username, s.character_name
     FROM users u
     LEFT JOIN player_profiles s ON s.user_id = u.id
     WHERE u.id = ? AND u.is_guest = FALSE
     LIMIT 1`,
    [uid],
  );
  if (!players[0]) throw httpError(404, 'Joueur introuvable.');

  const deck = await getActiveDeck(uid);
  if (!deck) {
    throw httpError(404, 'Ce joueur n’a pas de deck actif.');
  }

  return serializeDeckExport(deck, {
    userId: players[0].id,
    username: players[0].username,
    characterName: players[0].character_name || null,
  });
}

/**
 * Valide et normalise un payload JSON (fichier ou objet).
 * @returns {{ schemaVersion: number, cards: Array<{slug:string,quantity:number,upgradeLevel:number}>, meta: object }}
 */
export function parseDeckExport(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') {
    throw new Error('Export deck invalide : objet attendu.');
  }
  if (data.schema && data.schema !== DECK_EXPORT_SCHEMA) {
    throw new Error(`Schéma inconnu: ${data.schema} (attendu ${DECK_EXPORT_SCHEMA}).`);
  }
  const version = Number(data.schemaVersion) || 1;
  if (version !== DECK_EXPORT_VERSION) {
    throw new Error(`Version d’export non supportée: ${version}.`);
  }

  const list = data.deck?.cards ?? data.cards;
  if (!Array.isArray(list) || !list.length) {
    throw new Error('Export deck invalide : aucune carte.');
  }

  const cards = list.map((entry, i) => {
    const slug = String(entry?.slug || '').trim();
    if (!slug) throw new Error(`Carte #${i + 1} : slug manquant.`);
    return {
      slug,
      quantity: Math.max(1, Number(entry.quantity) || 1),
      upgradeLevel: Math.max(0, Math.min(2, Number(entry.upgradeLevel) || 0)),
    };
  });

  return {
    schemaVersion: version,
    cards,
    meta: {
      player: data.player || null,
      deck: data.deck
        ? { id: data.deck.id, name: data.deck.name, archetype: data.deck.archetype }
        : null,
      exportedAt: data.exportedAt || null,
    },
  };
}
