import { randomBytes } from 'node:crypto';
import { query } from '../config/database.js';
import { createNinja, findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { collectIdentityKeys, ninjaIdentityKey } from './ninjaNaming.js';
import { pickUniqueCivName, hasRemainingGlobalNames } from './ninjaNameGenerator.js';

export async function createNinjaFromAcademyCandidate(userId, candidate, language = 'fr') {
  const globalKeys = await loadGlobalIdentityKeySet();
  const localKeys = collectIdentityKeys(await findNinjasByUserId(userId));
  const clan = { name: candidate.clanName || 'Roturier' };
  let recruitName = candidate.name;
  if (globalKeys.has(ninjaIdentityKey(recruitName)) && hasRemainingGlobalNames(globalKeys, clan)) {
    recruitName = pickUniqueCivName({
      forbiddenIdentityKeys: localKeys,
      globalForbiddenKeys: globalKeys,
      clan,
    });
  }

  return createNinja({
    user_id: userId,
    name: recruitName,
    age: candidate.age,
    grade: candidate.grade || 'Genin',
    clan_trait_id: candidate.clan_trait_id,
    element_affinity: candidate.element_affinity,
    character_trait: candidate.character_trait ?? null,
    trait_boost: candidate.trait_boost ?? null,
    language: candidate.language || language,
    taijutsu: candidate.taijutsu,
    ninjutsu: candidate.ninjutsu,
    genjutsu: candidate.genjutsu,
    medecine: candidate.medecine,
    vitesse: candidate.vitesse,
    intelligence: candidate.intelligence,
    weekly_forme: candidate.weekly_forme,
    moral: candidate.moral,
    squad_position: null,
  });
}

export function parseCandidateJson(candidateJson) {
  return typeof candidateJson === 'string' ? JSON.parse(candidateJson) : candidateJson;
}

export function generateInviteCode() {
  return randomBytes(5).toString('hex').slice(0, 10).toUpperCase();
}
