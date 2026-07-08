import { buildFullName, ninjaIdentityKey } from './ninjaNaming.js';

/**
 * Générateur de noms style Naruto (inspiré des générateurs type FantasyNameGenerators / wikiHow).
 * Les sites cités n'exposent pas d'API REST : on reproduit la logique ici.
 *
 * - Lignée noble / clan du village → nom de famille = nom du clan (ex. « Ren Uchiwa »)
 * - Roturier (sans lignée de sang) → prénom + nom civil inventé
 */

const SHINOBI_GIVEN = [
  'Aiko', 'Akio', 'Asuka', 'Ayame', 'Daichi', 'Emi', 'Gen', 'Hana', 'Haruki', 'Hayato',
  'Hikaru', 'Hinata', 'Hotaru', 'Isamu', 'Izumi', 'Jiro', 'Jun', 'Kaede', 'Kaito', 'Kana',
  'Kazuki', 'Kenji', 'Kenta', 'Kiyoshi', 'Koji', 'Makoto', 'Mari', 'Mei', 'Mio', 'Mizuki',
  'Naoki', 'Natsu', 'Noa', 'Noriko', 'Ren', 'Rei', 'Rin', 'Ryo', 'Saki', 'Satoshi',
  'Shin', 'Shiori', 'Sora', 'Sota', 'Takeshi', 'Taro', 'Tsubasa', 'Yui', 'Yuki', 'Yuna',
  'Aoi', 'Chikara', 'Eiji', 'Fumiko', 'Gaku', 'Haruna', 'Itsuki', 'Kazuma', 'Koharu', 'Masaru',
  'Nagi', 'Raiden', 'Riku', 'Sayuri', 'Shinji', 'Takumi', 'Toru', 'Yamato', 'Yoshiko', 'Zen',
];

/** Noms civils pour roturiers — pas les grands clans du jeu. */
const ROTURIER_SURNAMES = [
  'Aoki', 'Endo', 'Fujii', 'Goto', 'Hara', 'Ikeda', 'Inoue', 'Ishii', 'Kawai', 'Kondo',
  'Maeda', 'Miura', 'Mori', 'Nakano', 'Okada', 'Ono', 'Saito', 'Sakai', 'Sato', 'Shibata',
  'Sugimoto', 'Takagi', 'Tamura', 'Watanabe', 'Yamaguchi', 'Yoshida', 'Kawano', 'Matsui', 'Oshiro', 'Tachibana',
  'Hanabira', 'Kawaguchi', 'Mizuhara', 'Senbayashi', 'Takahara', 'Uzuhara', 'Kazehana', 'Shirogane', 'Amagiri', 'Tsukimori',
];

const GIVEN_PREFIX = ['Ka', 'Na', 'Ra', 'Sa', 'Shi', 'Yu', 'Hi', 'Ko', 'Mi', 'Ta', 'Ha', 'Ke', 'Ri', 'So'];
const GIVEN_SUFFIX = ['ki', 'to', 'ru', 'ko', 'ta', 'ma', 'ji', 'ro', 'su', 'mi', 'na', 'haru', 'kaze', 'ren'];

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

/**
 * @param {{ name: string, is_noble?: boolean } | null} clan — lignée de sang tirée en amont
 */
function buildCandidateForClan(clan) {
  const givenName = randomGivenName();
  const familyName =
    clan?.name && clan.name !== 'Roturier' ? clan.name : randomRoturierSurname();
  return {
    givenName,
    familyName,
    fullName: buildFullName(givenName, familyName),
  };
}

/**
 * Tire un prénom + nom uniques pour l'effectif.
 * Le nom de clan noble est réutilisé comme nom de famille (comme les générateurs Naruto avec clan).
 */
export function pickUniqueCivName({ forbiddenIdentityKeys = new Set(), clan = null } = {}) {
  const maxAttempts = 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildCandidateForClan(clan);
    const key = ninjaIdentityKey(candidate.fullName);
    if (!forbiddenIdentityKeys.has(key)) {
      return candidate.fullName;
    }
  }

  throw new Error('Impossible de générer un prénom et un nom uniques pour ce ninja.');
}
