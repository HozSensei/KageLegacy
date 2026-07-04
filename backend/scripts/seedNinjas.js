import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';
import { upsertClanTraits, findAllClanTraits } from '../src/models/clanTrait.js';
import { createNinja, deleteNinjasByUserId } from '../src/models/ninja.js';
import { createDemoUser, findDemoUser } from '../src/models/sensei.js';
import {
  distributeCharacterTraits,
  generateNinjaProfile,
} from '../src/services/ninjaGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_CLANS = [
  { name: 'Nara', intelligence_bonus: 4, speed_bonus: -2, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: true },
  { name: 'Uchiwa', intelligence_bonus: 0, speed_bonus: 0, genjutsu_bonus: 3, ninjutsu_bonus: 3, moral_variance: 4, is_noble: true },
  { name: 'Hyuga', intelligence_bonus: 2, speed_bonus: 2, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: true },
  { name: 'Sarutobi', intelligence_bonus: 1, speed_bonus: 1, genjutsu_bonus: 1, ninjutsu_bonus: 1, moral_variance: 0, is_noble: false },
  { name: 'Akimichi', intelligence_bonus: 0, speed_bonus: -1, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: false },
  { name: 'Yamanaka', intelligence_bonus: 3, speed_bonus: 0, genjutsu_bonus: 2, ninjutsu_bonus: 0, moral_variance: 0, is_noble: false },
];

async function seed() {
  console.log('🌱 Seeding Kage Legacy...');

  await upsertClanTraits(DEFAULT_CLANS);
  const clans = await findAllClanTraits();
  const clanByName = Object.fromEntries(clans.map((c) => [c.name, c]));

  let user = await findDemoUser();
  if (!user) {
    user = await createDemoUser({
      username: 'demo_sensei',
      senseiName: 'Kakashi',
      specialty: 'Genjutsu',
      language: 'fr',
    });
    console.log('✅ Utilisateur démo créé');
  } else {
    await deleteNinjasByUserId(user.id);
    console.log('♻️  Ninjas existants réinitialisés');
  }

  const totalNinjas = 15;
  const traits = distributeCharacterTraits(totalNinjas);
  const clanRotation = ['Nara', 'Uchiwa', 'Hyuga', 'Sarutobi', 'Akimichi', 'Yamanaka'];

  for (let i = 0; i < totalNinjas; i += 1) {
    const clanName = clanRotation[i % clanRotation.length];
    const clan = clanByName[clanName];
    const grade =
      i === 1 ? 'Chunin' : i < 10 ? 'Genin' : i < 13 ? 'Chunin' : 'Genin';
    const profile = generateNinjaProfile({
      clan,
      grade,
      characterTrait: traits[i],
      language: 'fr',
    });

    const squad_position = i < 3 ? i + 1 : null;

    await createNinja({
      user_id: user.id,
      ...profile,
      squad_position,
    });
  }

  console.log(`✅ ${totalNinjas} ninjas générés (3 actifs, ${totalNinjas - 3} remplaçants)`);
  console.log('🦅 Seed terminé.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
