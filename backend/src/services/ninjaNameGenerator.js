import { buildFullName, ninjaIdentityKey } from './ninjaNaming.js';

/**
 * Générateur de noms à consonance japonaise (prénoms courants + noms de famille composés).
 *
 * Unicité en deux paliers :
 * 1. Prénom|nom unique sur le serveur (tous les joueurs)
 * 2. Si le pool global est saturé → unique dans l'effectif du joueur seulement
 */

const SHINOBI_GIVEN = [
  'Aiko', 'Akio', 'Asuka', 'Ayame', 'Daichi', 'Emi', 'Gen', 'Hana', 'Haruki', 'Hayato',
  'Hikaru', 'Hinako', 'Hotaru', 'Isamu', 'Izumi', 'Jiro', 'Jun', 'Kaede', 'Kaito', 'Kana',
  'Kazuki', 'Kenji', 'Kenta', 'Kiyoshi', 'Koji', 'Makoto', 'Mari', 'Mei', 'Mio', 'Mizuki',
  'Naoki', 'Natsu', 'Noa', 'Noriko', 'Ren', 'Rei', 'Rin', 'Ryo', 'Saki', 'Satoshi',
  'Shin', 'Shiori', 'Sora', 'Sota', 'Takeshi', 'Taro', 'Tsubasa', 'Yui', 'Yuki', 'Yuna',
  'Aoi', 'Chikara', 'Eiji', 'Fumiko', 'Gaku', 'Haruna', 'Itsuki', 'Kazuma', 'Koharu', 'Masaru',
  'Nagi', 'Raiden', 'Riku', 'Sayuri', 'Shinji', 'Takumi', 'Toru', 'Yamato', 'Yoshiko', 'Zen',
];

const ROTURIER_SURNAMES = [
  'Aoki', 'Endo', 'Fujii', 'Goto', 'Hara', 'Ikeda', 'Inoue', 'Ishii', 'Kawai', 'Kondo',
  'Maeda', 'Miura', 'Mori', 'Nakano', 'Okada', 'Ono', 'Saito', 'Sakai', 'Sato', 'Shibata',
  'Sugimoto', 'Takagi', 'Tamura', 'Watanabe', 'Yamaguchi', 'Yoshida', 'Kawano', 'Matsui', 'Oshiro', 'Tachibana',
  'Hanabira', 'Kawaguchi', 'Mizuhara', 'Senbayashi', 'Takahara', 'Uzuhara', 'Kazehana', 'Shirogane', 'Amagiri', 'Tsukimori',
];

const GIVEN_PREFIX = ['Ka', 'Na', 'Ra', 'Sa', 'Shi', 'Yu', 'Hi', 'Ko', 'Mi', 'Ta', 'Ha', 'Ke', 'Ri', 'So'];
const GIVEN_SUFFIX = ['ki', 'to', 'ru', 'ko', 'ta', 'ma', 'ji', 'ro', 'su', 'mi', 'na', 'haru', 'kaze', 'ren'];

const GLOBAL_PROBE_SAMPLES = 80;

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomGivenName() {
  if (Math.random() < 0.75) {
    return pickRandom(SHINOBI_GIVEN);
  }
  const name = pickRandom(GIVEN_PREFIX) + pickRandom(GIVEN_SUFFIX);
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function randomRoturierSurname() {
  if (Math.random() < 0.85) {
    return pickRandom(ROTURIER_SURNAMES);
  }
  const name = pickRandom(GIVEN_PREFIX) + pickRandom(GIVEN_SUFFIX);
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function buildCandidateForClan(clan) {
  const givenName = randomGivenName();
  const familyName =
    clan?.name && clan.name !== 'Roturier' ? clan.name : randomRoturierSurname();
  return {
    givenName,
    familyName,
    fullName: buildFullName(givenName, familyName),
  };
}

/** Toutes les clés prénom|nom possibles pour un profil de clan (borne théorique). */
export function enumerateAllIdentityKeysForClan(clan) {
  const givens = new Set(SHINOBI_GIVEN);
  for (const prefix of GIVEN_PREFIX) {
    for (const suffix of GIVEN_SUFFIX) {
      const raw = prefix + suffix;
      givens.add(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
    }
  }

  const keys = new Set();
  if (clan?.name && clan.name !== 'Roturier') {
    for (const given of givens) {
      keys.add(ninjaIdentityKey(buildFullName(given, clan.name)));
    }
    return keys;
  }

  const surnames = new Set(ROTURIER_SURNAMES);
  for (const prefix of GIVEN_PREFIX) {
    for (const suffix of GIVEN_SUFFIX) {
      const raw = prefix + suffix;
      surnames.add(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
    }
  }
  for (const given of givens) {
    for (const family of surnames) {
      keys.add(ninjaIdentityKey(buildFullName(given, family)));
    }
  }
  return keys;
}

/** Reste-t-il des combinaisons jamais vues sur le serveur pour ce profil de clan ? */
export function hasRemainingGlobalNames(globalForbiddenKeys, clan, _samples = GLOBAL_PROBE_SAMPLES) {
  const theoretical = enumerateAllIdentityKeysForClan(clan);
  for (const key of theoretical) {
    if (!globalForbiddenKeys.has(key)) return true;
  }
  return false;
}

/**
 * @param {Set<string>} forbiddenIdentityKeys — prénom|nom déjà dans l'effectif du joueur
 * @param {Set<string>} globalForbiddenKeys — prénom|nom déjà sur le serveur
 */
export function pickUniqueCivName({
  forbiddenIdentityKeys = new Set(),
  globalForbiddenKeys = new Set(),
  clan = null,
} = {}) {
  const maxAttempts = 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildCandidateForClan(clan);
    const key = ninjaIdentityKey(candidate.fullName);
    if (forbiddenIdentityKeys.has(key)) continue;
    if (!globalForbiddenKeys.has(key)) return candidate.fullName;
  }

  if (hasRemainingGlobalNames(globalForbiddenKeys, clan)) {
    throw new Error('Impossible de générer un prénom et un nom uniques sur le serveur.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildCandidateForClan(clan);
    const key = ninjaIdentityKey(candidate.fullName);
    if (!forbiddenIdentityKeys.has(key)) return candidate.fullName;
  }

  throw new Error('Impossible de générer un prénom et un nom uniques pour ce ninja.');
}
