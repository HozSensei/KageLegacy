/**
 * Boosters & Shop — Kage Legacy V2 Phase 5
 *
 * Coûts monétaires : `../config/economyConfig.js`
 * (standard 300 / path 550 / élém. 650 / premium 100 KC).
 * Probabilités documentées (poids relatifs, somme = 1000) :
 *   Standard   : common 700 / rare 230 / legendary 55 / mythic 15
 *   Voie       : common 650 / rare 260 / legendary 70 / mythic 20  (+ filtre stat_type)
 *   Élémentaire: common 650 / rare 260 / legendary 70 / mythic 20  (+ filtre élément)
 *   Premium    : common 550 / rare 320 / legendary 100 / mythic 30 (+ 1 rare+ garantie)
 *
 * Tout le tirage et le débit monétaire sont serveur (anti-triche).
 */
import { query, getConnection } from '../config/database.js';
import {
  BOOSTER_CARD_COUNT,
  BOOSTER_COSTS,
  PATH_BOOSTER_STAT_TYPES,
} from '../config/economyConfig.js';
import { CARD_RARITIES, serializeCardDefinition } from './cardService.js';
import { getCollectionEntry } from './collectionService.js';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const RARITY_RANK = { common: 0, rare: 1, legendary: 2, mythic: 3 };

const PATH_PACK_META = {
  taijutsu: {
    nameFr: 'Parchemin Taijutsu',
    nameEn: 'Taijutsu Scroll',
    descriptionFr: '5 techniques de la voie Taijutsu.',
    descriptionEn: '5 techniques from the Taijutsu path.',
  },
  ninjutsu: {
    nameFr: 'Parchemin Ninjutsu',
    nameEn: 'Ninjutsu Scroll',
    descriptionFr: '5 techniques de la voie Ninjutsu.',
    descriptionEn: '5 techniques from the Ninjutsu path.',
  },
  genjutsu: {
    nameFr: 'Parchemin Genjutsu',
    nameEn: 'Genjutsu Scroll',
    descriptionFr: '5 techniques de la voie Genjutsu.',
    descriptionEn: '5 techniques from the Genjutsu path.',
  },
  medicine: {
    nameFr: 'Parchemin Médecine',
    nameEn: 'Medicine Scroll',
    descriptionFr: '5 techniques de la voie Médecine.',
    descriptionEn: '5 techniques from the Medicine path.',
  },
};

function buildPathBooster(statType) {
  const meta = PATH_PACK_META[statType];
  return {
    type: `path-${statType}`,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
    cardCount: BOOSTER_CARD_COUNT,
    cost: { ...BOOSTER_COSTS.path },
    rarityWeights: { common: 650, rare: 260, legendary: 70, mythic: 20 },
    guaranteedMinRarity: null,
    elementalOnly: false,
    pathOnly: true,
    statType,
  };
}

/** Catalogue public des parchemins (boosters). Coûts ← economyConfig. */
export const BOOSTER_CATALOG = {
  standard: {
    type: 'standard',
    nameFr: 'Parchemin Standard',
    nameEn: 'Standard Scroll',
    descriptionFr: '5 techniques tirées selon les taux de rareté classiques.',
    descriptionEn: '5 techniques rolled with classic rarity rates.',
    cardCount: BOOSTER_CARD_COUNT,
    cost: { ...BOOSTER_COSTS.standard },
    rarityWeights: { common: 700, rare: 230, legendary: 55, mythic: 15 },
    guaranteedMinRarity: null,
    elementalOnly: false,
    pathOnly: false,
    statType: null,
  },
  ...Object.fromEntries(
    PATH_BOOSTER_STAT_TYPES.map((statType) => [`path-${statType}`, buildPathBooster(statType)]),
  ),
  elemental: {
    type: 'elemental',
    nameFr: 'Parchemin Élémentaire',
    nameEn: 'Elemental Scroll',
    descriptionFr: '5 techniques liées à un élément (Katon, Suiton, Raiton, Doton, Futon).',
    descriptionEn: '5 techniques tied to an element (Fire, Water, Lightning, Earth, Wind).',
    cardCount: BOOSTER_CARD_COUNT,
    cost: { ...BOOSTER_COSTS.elemental },
    rarityWeights: { common: 650, rare: 260, legendary: 70, mythic: 20 },
    guaranteedMinRarity: null,
    elementalOnly: true,
    pathOnly: false,
    statType: null,
  },
  premium: {
    type: 'premium',
    nameFr: 'Parchemin Premium',
    nameEn: 'Premium Scroll',
    descriptionFr: '5 techniques avec taux améliorés et 1 rare (ou mieux) garantie.',
    descriptionEn: '5 techniques with improved rates and 1 rare-or-better guaranteed.',
    cardCount: BOOSTER_CARD_COUNT,
    cost: { ...BOOSTER_COSTS.premium },
    rarityWeights: { common: 550, rare: 320, legendary: 100, mythic: 30 },
    guaranteedMinRarity: 'rare',
    elementalOnly: false,
    pathOnly: false,
    statType: null,
  },
};

export const BOOSTER_TYPES = Object.keys(BOOSTER_CATALOG);

export const ELEMENTS = ['katon', 'suiton', 'raiton', 'doton', 'futon'];

export function getBoosterDefinition(type) {
  const def = BOOSTER_CATALOG[type];
  if (!def) throw httpError(400, 'Type de booster invalide.');
  return def;
}

export function serializeBooster(def) {
  return {
    type: def.type,
    nameFr: def.nameFr,
    nameEn: def.nameEn,
    descriptionFr: def.descriptionFr,
    descriptionEn: def.descriptionEn,
    cardCount: def.cardCount,
    cost: { ...def.cost },
    rarityWeights: { ...def.rarityWeights },
    probabilities: weightsToProbabilities(def.rarityWeights),
    guaranteedMinRarity: def.guaranteedMinRarity,
    elementalOnly: Boolean(def.elementalOnly),
    pathOnly: Boolean(def.pathOnly),
    statType: def.statType || null,
  };
}

/** Convertit des poids en probabilités affichables (0–1). */
export function weightsToProbabilities(weights) {
  const total = Object.values(weights).reduce((s, w) => s + Number(w), 0) || 1;
  const out = {};
  for (const rarity of CARD_RARITIES) {
    out[rarity] = (Number(weights[rarity]) || 0) / total;
  }
  return out;
}

/**
 * Tire une rareté selon les poids. `rng` = () => [0,1).
 */
export function rollRarity(weights, rng = Math.random) {
  const entries = CARD_RARITIES.map((r) => [r, Number(weights[r]) || 0]).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return 'common';
  let roll = rng() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return entries[entries.length - 1][0];
}

/**
 * Tire une rareté au moins égale à `minRarity`.
 */
export function rollRarityAtLeast(weights, minRarity, rng = Math.random) {
  const minRank = RARITY_RANK[minRarity] ?? 0;
  const filtered = {};
  for (const rarity of CARD_RARITIES) {
    if ((RARITY_RANK[rarity] ?? 0) >= minRank) {
      filtered[rarity] = Number(weights[rarity]) || 0;
    }
  }
  // Si les poids filtrés sont tous à 0, forcer la rareté min.
  const total = Object.values(filtered).reduce((s, w) => s + w, 0);
  if (total <= 0) return minRarity;
  return rollRarity(filtered, rng);
}

export function pickRandom(list, rng = Math.random) {
  if (!list?.length) return null;
  const idx = Math.floor(rng() * list.length);
  return list[Math.min(idx, list.length - 1)];
}

/**
 * Construit la liste de raretés pour un booster (slots + garantie).
 * Pure — testable sans DB.
 */
export function planBoosterRarities(def, rng = Math.random) {
  const slots = [];
  const guaranteedCount = def.guaranteedMinRarity ? 1 : 0;
  const freeSlots = Math.max(0, def.cardCount - guaranteedCount);

  for (let i = 0; i < freeSlots; i += 1) {
    slots.push(rollRarity(def.rarityWeights, rng));
  }
  if (def.guaranteedMinRarity) {
    slots.push(rollRarityAtLeast(def.rarityWeights, def.guaranteedMinRarity, rng));
  }
  return slots;
}

/**
 * Sélectionne des définitions de cartes pour les raretés planifiées.
 * `poolsByRarity` : { common: [...rows], rare: [...], ... }
 * Pure si pools fournis.
 */
export function selectCardsForRarities(rarities, poolsByRarity, rng = Math.random) {
  const picked = [];
  for (const rarity of rarities) {
    let pool = poolsByRarity[rarity] || [];
    // Fallback vers rareté inférieure si pool vide (catalogue incomplet)
    if (!pool.length) {
      const rank = RARITY_RANK[rarity] ?? 0;
      for (let r = rank - 1; r >= 0; r -= 1) {
        const fallback = CARD_RARITIES[r];
        if (poolsByRarity[fallback]?.length) {
          pool = poolsByRarity[fallback];
          break;
        }
      }
    }
    const card = pickRandom(pool, rng);
    if (!card) {
      throw httpError(503, `Aucune carte disponible pour la rareté ${rarity}.`);
    }
    picked.push(card);
  }
  return picked;
}

/**
 * Charge le pool de cartes éligibles aux boosters (hors exclusives saison).
 */
export async function loadBoosterPools({
  elementalOnly = false,
  element = null,
  pathOnly = false,
  statType = null,
} = {}) {
  const where = ['is_exclusive = 0'];
  const params = [];

  if (elementalOnly) {
    where.push('element IS NOT NULL');
    where.push("element <> ''");
  }
  if (element) {
    if (!ELEMENTS.includes(element)) throw httpError(400, 'Élément invalide.');
    where.push('element = ?');
    params.push(element);
  }
  if (pathOnly || statType) {
    if (!PATH_BOOSTER_STAT_TYPES.includes(statType)) {
      throw httpError(400, 'Voie invalide.');
    }
    where.push('stat_type = ?');
    params.push(statType);
  }

  const rows = await query(
    `SELECT * FROM card_definitions
     WHERE ${where.join(' AND ')}
     ORDER BY id`,
    params,
  );

  const pools = Object.fromEntries(CARD_RARITIES.map((r) => [r, []]));
  for (const row of rows) {
    if (pools[row.rarity]) pools[row.rarity].push(row);
  }
  return { pools, total: rows.length };
}

async function getPlayerBalances(userId, connection = null) {
  const run = connection
    ? async (sql, params) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      }
    : query;

  const rows = await run(
    'SELECT ryos, card_dust, card_essence, kage_coins FROM player_profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );
  if (!rows[0]) throw httpError(404, 'Profil joueur introuvable.');
  return {
    ryos: Number(rows[0].ryos) || 0,
    dust: Number(rows[0].card_dust) || 0,
    essence: Number(rows[0].card_essence) || 0,
    kageCoins: Number(rows[0].kage_coins) || 0,
  };
}

/**
 * Grant une carte dans la collection (transactionnel).
 */
async function grantCardInTx(connection, userId, cardDefinitionId) {
  const [existing] = await connection.execute(
    `SELECT id, quantity FROM user_card_collection
     WHERE user_id = ? AND card_definition_id = ? LIMIT 1 FOR UPDATE`,
    [userId, cardDefinitionId],
  );

  let collectionId;
  let isNew = false;
  if (existing[0]) {
    await connection.execute(
      'UPDATE user_card_collection SET quantity = quantity + 1 WHERE id = ?',
      [existing[0].id],
    );
    collectionId = existing[0].id;
  } else {
    const [result] = await connection.execute(
      `INSERT INTO user_card_collection
        (user_id, card_definition_id, upgrade_level, quantity, obtained_source)
       VALUES (?, ?, 0, 1, 'booster')`,
      [userId, cardDefinitionId],
    );
    collectionId = result.insertId;
    isNew = true;
  }
  return { collectionId, isNew };
}

export async function listBoosters(userId) {
  const balances = await getPlayerBalances(userId);
  return {
    boosters: BOOSTER_TYPES.map((t) => serializeBooster(BOOSTER_CATALOG[t])),
    balances,
    elements: ELEMENTS,
  };
}

/**
 * Ouvre un booster : débit monétaire + tirage serveur + grant collection.
 * Le client ne peut PAS spécifier les cartes obtenues.
 */
export async function openBooster(userId, boosterType, { element = null, rng = Math.random } = {}) {
  const def = getBoosterDefinition(boosterType);

  if (def.elementalOnly && element && !ELEMENTS.includes(element)) {
    throw httpError(400, 'Élément invalide.');
  }
  if (def.pathOnly && !PATH_BOOSTER_STAT_TYPES.includes(def.statType)) {
    throw httpError(400, 'Voie invalide.');
  }

  // Charger le pool avant la transaction (lecture seule)
  const { pools, total } = await loadBoosterPools({
    elementalOnly: def.elementalOnly,
    element: def.elementalOnly ? element : null,
    pathOnly: Boolean(def.pathOnly),
    statType: def.pathOnly ? def.statType : null,
  });
  if (total === 0) {
    throw httpError(503, 'Catalogue de cartes insuffisant pour ce booster.');
  }

  const rarities = planBoosterRarities(def, rng);
  const rolledRows = selectCardsForRarities(rarities, pools, rng);

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const [profileRows] = await connection.execute(
      'SELECT ryos, kage_coins, card_dust, card_essence FROM player_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE',
      [userId],
    );
    if (!profileRows[0]) throw httpError(404, 'Profil joueur introuvable.');

    const ryos = Number(profileRows[0].ryos) || 0;
    const kageCoins = Number(profileRows[0].kage_coins) || 0;
    const costRyos = def.cost.ryos || 0;
    const costCoins = def.cost.kageCoins || 0;

    if (ryos < costRyos) throw httpError(400, 'Ryos insuffisants.');
    if (kageCoins < costCoins) throw httpError(400, 'Kage Coins insuffisants.');

    if (costRyos > 0 || costCoins > 0) {
      await connection.execute(
        'UPDATE player_profiles SET ryos = ryos - ?, kage_coins = kage_coins - ? WHERE user_id = ?',
        [costRyos, costCoins, userId],
      );
    }

    const grantedMeta = [];
    for (const row of rolledRows) {
      const meta = await grantCardInTx(connection, userId, row.id);
      grantedMeta.push({ ...meta, row });
    }

    await connection.commit();

    const cards = [];
    for (const meta of grantedMeta) {
      const entry = await getCollectionEntry(userId, meta.collectionId);
      cards.push({
        card: serializeCardDefinition(meta.row),
        collectionId: meta.collectionId,
        isNew: meta.isNew,
        quantity: entry.quantity,
        rarity: meta.row.rarity,
      });
    }

    const balances = await getPlayerBalances(userId);

    try {
      const { onBattlePassAction } = await import('./battlePassQuestService.js');
      await onBattlePassAction(userId, 'booster_open', 1);
      const newCount = grantedMeta.filter((m) => m.isNew).length;
      if (newCount > 0) {
        await onBattlePassAction(userId, 'card_collect', newCount);
      }
    } catch {
      /* BP optionnel */
    }

    return {
      boosterType: def.type,
      costPaid: { ryos: costRyos, kageCoins: costCoins },
      cards,
      balances,
      raritySummary: summarizeRarities(cards.map((c) => c.rarity)),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function summarizeRarities(rarities) {
  const summary = Object.fromEntries(CARD_RARITIES.map((r) => [r, 0]));
  for (const r of rarities) {
    if (summary[r] != null) summary[r] += 1;
  }
  return summary;
}

/**
 * Simulation hors DB pour tests de probabilités.
 */
export function simulateBoosterOpenings(boosterType, iterations, rng = Math.random) {
  const def = getBoosterDefinition(boosterType);
  const counts = Object.fromEntries(CARD_RARITIES.map((r) => [r, 0]));
  let totalCards = 0;
  let openingsWithGuaranteed = 0;

  for (let i = 0; i < iterations; i += 1) {
    const rarities = planBoosterRarities(def, rng);
    totalCards += rarities.length;
    if (def.guaranteedMinRarity) {
      const minRank = RARITY_RANK[def.guaranteedMinRarity];
      if (rarities.some((r) => (RARITY_RANK[r] ?? 0) >= minRank)) {
        openingsWithGuaranteed += 1;
      }
    }
    for (const r of rarities) counts[r] += 1;
  }

  const rates = {};
  for (const r of CARD_RARITIES) {
    rates[r] = totalCards ? counts[r] / totalCards : 0;
  }

  return {
    boosterType,
    iterations,
    totalCards,
    counts,
    rates,
    expected: weightsToProbabilities(def.rarityWeights),
    guaranteedRate: def.guaranteedMinRarity ? openingsWithGuaranteed / iterations : null,
  };
}
