import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysqlPool from '../src/config/database.js';
import { upsertClanTraits, findAllClanTraits } from '../src/models/clanTrait.js';
import { createNinja, deleteNinjasByUserId } from '../src/models/ninja.js';
import { createDemoUser, findDemoUser } from '../src/models/sensei.js';
import { setUserPassword } from '../src/services/authService.js';
import {
  distributeCharacterTraits,
  generateNinjaProfile,
} from '../src/services/ninjaGenerator.js';
import { joinOrCreatePool, joinPoolByInvite } from '../src/services/poolService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_CLANS = [
  { name: 'Roturier', intelligence_bonus: 0, speed_bonus: 0, genjutsu_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0, is_noble: false },
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

  let user = await findDemoUser();
  if (!user) {
    user = await createDemoUser({
      username: 'demo_sensei',
      senseiName: 'Kakashi',
      language: 'fr',
    });
    console.log('✅ Utilisateur démo créé');
  } else {
    await deleteNinjasByUserId(user.id);
    console.log('♻️  Ninjas existants réinitialisés');
  }

  await setUserPassword(user.id, 'demo');
  console.log('🔑 Compte démo : demo_sensei / demo');

  const totalNinjas = 15;
  const traits = distributeCharacterTraits(totalNinjas);

  for (let i = 0; i < totalNinjas; i += 1) {
    const grade =
      i === 1 ? 'Chunin' : i < 10 ? 'Genin' : i < 13 ? 'Chunin' : 'Genin';
    const profile = generateNinjaProfile({
      clans,
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

  const invitePoolId = process.env.INVITE_POOL_ID;
  const joinResult = invitePoolId
    ? await joinPoolByInvite(user.id, invitePoolId)
    : { pool: await joinOrCreatePool(user.id), fallback: false };

  const userPool = joinResult.pool;
  if (joinResult.fallback) {
    console.log(`⚠️  Invitation pool ${invitePoolId} indisponible (${joinResult.reason}) — placement standard.`);
  }
  console.log(`🏆 Pool Division ${userPool.division_level} — cycle ${userPool.current_cycle}/10`);

  console.log('🦅 Seed terminé.');
  await mysqlPool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
