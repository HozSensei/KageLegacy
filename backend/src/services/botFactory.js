import { query } from '../config/database.js';
import { createNinja, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { findAllClanTraits } from '../models/clanTrait.js';
import { pickUniqueCivName } from './ninjaNameGenerator.js';
import { ninjaIdentityKey } from './ninjaNaming.js';
import { computeMatchChakraMax, computeMatchPv, computeSalaryCost } from './ninjaStats.js';
import {
  alignBotNinjasToPower,
  squadAveragePower,
} from './combat/squadPowerScaling.js';

const BOT_SENSEI_NAMES = ['Gennai', 'Baki', 'Ibiki', 'Shizune', 'Might'];

const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
const TRAITS = ['Discipline', 'Discipline', 'Temeraire', 'Altruiste', 'Discipline'];

const STAT_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

function pick(arr, index) {
  return arr[index % arr.length];
}

async function createBotSquad(userId, slotIndex, clans) {
  const clan = clans[slotIndex % clans.length];
  const base = 4 + (slotIndex % 3);
  const profiles = [
    { taijutsu: base + 2, ninjutsu: base, genjutsu: base - 1, medecine: base - 2, vitesse: base, intelligence: base + 1 },
    { taijutsu: base, ninjutsu: base + 2, genjutsu: base + 1, medecine: base - 1, vitesse: base, intelligence: base },
    { taijutsu: base - 1, ninjutsu: base, genjutsu: base, medecine: base + 1, vitesse: base + 2, intelligence: base },
  ];

  const forbidden = new Set();
  const globalKeys = await loadGlobalIdentityKeySet();
  for (let i = 0; i < 3; i += 1) {
    const stats = profiles[i];
    const name = pickUniqueCivName({
      forbiddenIdentityKeys: forbidden,
      globalForbiddenKeys: globalKeys,
      clan,
    });
    const key = ninjaIdentityKey(name);
    forbidden.add(key);
    globalKeys.add(key);
    forbidden.add(ninjaIdentityKey(name));
    await createNinja({
      user_id: userId,
      name,
      age: 15 + (i % 2),
      grade: i === 1 ? 'Chunin' : 'Genin',
      clan_trait_id: clan.id,
      element_affinity: pick(ELEMENTS, slotIndex + i),
      character_trait: pick(TRAITS, slotIndex + i),
      language: 'fr',
      ...stats,
      weekly_forme: 'Passable',
      moral: 14,
      squad_position: i + 1,
    });
  }
}

async function persistNinjaStats(ninja) {
  const stats = {
    taijutsu: ninja.taijutsu,
    ninjutsu: ninja.ninjutsu,
    genjutsu: ninja.genjutsu,
    medecine: ninja.medecine,
    vitesse: ninja.vitesse,
    intelligence: ninja.intelligence,
  };
  const salary_cost = computeSalaryCost(ninja.grade, stats);
  const current_pv_match = computeMatchPv(stats.taijutsu);
  const current_chakra_match = computeMatchChakraMax(ninja.grade, stats.ninjutsu);

  await query(
    `UPDATE ninjas
     SET taijutsu = ?, ninjutsu = ?, genjutsu = ?, medecine = ?, vitesse = ?, intelligence = ?,
         salary_cost = ?, current_pv_match = ?, current_chakra_match = ?
     WHERE id = ?`,
    [
      stats.taijutsu,
      stats.ninjutsu,
      stats.genjutsu,
      stats.medecine,
      stats.vitesse,
      stats.intelligence,
      salary_cost,
      current_pv_match,
      current_chakra_match,
      ninja.id,
    ]
  );
}

/**
 * Puissance moyenne des escouades actives de tous les humains d'une ligue.
 */
export async function computePoolHumansAveragePower(poolId) {
  const humans = await query(
    `SELECT u.id AS user_id
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ? AND u.is_bot = FALSE`,
    [poolId]
  );
  if (!humans.length) return 0;

  let sum = 0;
  let count = 0;
  for (const human of humans) {
    const ninjas = await query(
      `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
      [human.user_id]
    );
    if (ninjas.length < 3) continue;
    sum += squadAveragePower(ninjas);
    count += 1;
  }
  return count ? sum / count : 0;
}

/**
 * Aligne les bots d'une ligue sur la puissance moyenne des humains de la pool.
 */
export async function alignPoolBotsToPoolAverage(poolId) {
  const targetPower = await computePoolHumansAveragePower(poolId);
  if (!targetPower) return { aligned: 0, targetPower: 0 };

  const bots = await query(
    `SELECT u.id AS user_id
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE`,
    [poolId]
  );

  let aligned = 0;
  for (const bot of bots) {
    const botNinjas = await query(
      `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
      [bot.user_id]
    );
    if (botNinjas.length < 3) continue;

    const scaled = alignBotNinjasToPower(botNinjas, targetPower);
    for (let i = 0; i < botNinjas.length; i += 1) {
      const next = { ...botNinjas[i], ...scaled[i] };
      const changed = STAT_KEYS.some((key) => next[key] !== botNinjas[i][key]);
      if (changed) {
        await persistNinjaStats(next);
        aligned += 1;
      }
    }
  }

  return { aligned, targetPower };
}

/**
 * Aligne les bots d'une ligue sur la puissance moyenne de l'escouade active du joueur.
 * @deprecated Préférer alignPoolBotsToPoolAverage pour un calibrage ligue entière.
 */
export async function alignPoolBotsToHuman(poolId, humanUserId) {
  const humanNinjas = await query(
    `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
    [humanUserId]
  );
  if (humanNinjas.length < 3) return { aligned: 0 };

  const targetPower = squadAveragePower(humanNinjas);
  if (!targetPower) return { aligned: 0 };

  const bots = await query(
    `SELECT u.id AS user_id
     FROM pool_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pool_id = ? AND u.is_bot = TRUE`,
    [poolId]
  );

  let aligned = 0;
  for (const bot of bots) {
    const botNinjas = await query(
      `SELECT * FROM ninjas WHERE user_id = ? AND squad_position IS NOT NULL ORDER BY squad_position`,
      [bot.user_id]
    );
    if (botNinjas.length < 3) continue;

    const scaled = alignBotNinjasToPower(botNinjas, targetPower);
    for (let i = 0; i < botNinjas.length; i += 1) {
      const next = { ...botNinjas[i], ...scaled[i] };
      const changed = STAT_KEYS.some((key) => next[key] !== botNinjas[i][key]);
      if (changed) {
        await persistNinjaStats(next);
        aligned += 1;
      }
    }
  }

  return { aligned, targetPower };
}

export async function findAvailableBotSlotIndex(poolId) {
  for (let slotIndex = 0; slotIndex < 100; slotIndex += 1) {
    const username = `bot_pool${poolId}_slot${slotIndex}`;
    const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (!rows.length) return slotIndex;
  }
  const error = new Error('Impossible de créer un bot de remplacement pour cette ligue.');
  error.statusCode = 500;
  throw error;
}

export async function createBotUser(poolId, slotIndex) {
  const senseiName = BOT_SENSEI_NAMES[slotIndex % BOT_SENSEI_NAMES.length];
  const username = `bot_pool${poolId}_slot${slotIndex}`;

  const userResult = await query(
    'INSERT INTO users (username, is_bot) VALUES (?, TRUE)',
    [username]
  );
  const userId = userResult.insertId;

  await query(
    `INSERT INTO sensei (user_id, name, training_focus, ryos, reputation, chakra_pool, language)
     VALUES (?, ?, 'Ninjutsu', 8000, 40, 80, 'fr')`,
    [userId, senseiName]
  );

  const clans = await findAllClanTraits();
  await createBotSquad(userId, slotIndex, clans);

  return { userId, senseiName };
}
