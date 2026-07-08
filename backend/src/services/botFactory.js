import { query } from '../config/database.js';
import { createNinja } from '../models/ninja.js';
import { findAllClanTraits } from '../models/clanTrait.js';
import { pickUniqueCivName } from './ninjaNameGenerator.js';
import { ninjaIdentityKey } from './ninjaNaming.js';
const BOT_SENSEI_NAMES = ['Gennai', 'Baki', 'Ibiki', 'Shizune', 'Might'];

const ELEMENTS = ['Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'];
const TRAITS = ['Discipline', 'Discipline', 'Temeraire', 'Altruiste', 'Discipline'];

function pick(arr, index) {
  return arr[index % arr.length];
}

async function createBotSquad(userId, slotIndex, clans) {
  const clan = clans[slotIndex % clans.length];
  const base = 6 + (slotIndex % 4);
  const profiles = [
    { taijutsu: base + 2, ninjutsu: base, genjutsu: base - 1, medecine: base - 2, vitesse: base, intelligence: base + 1 },
    { taijutsu: base, ninjutsu: base + 2, genjutsu: base + 1, medecine: base - 1, vitesse: base, intelligence: base },
    { taijutsu: base - 1, ninjutsu: base, genjutsu: base, medecine: base + 1, vitesse: base + 2, intelligence: base },
  ];

  const forbidden = new Set();
  for (let i = 0; i < 3; i += 1) {
    const stats = profiles[i];
    const name = await pickUniqueCivName({ forbiddenIdentityKeys: forbidden });
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
