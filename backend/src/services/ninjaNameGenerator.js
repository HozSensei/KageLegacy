import { ninjaIdentityKey, buildFullName } from './ninjaNaming.js';

const NAMEY_API = 'https://namey.muffinlabs.com/name.json';

/** Prénoms et noms de famille romaji (repli si l'API est indisponible). */
const GIVEN_NAMES = [
  'Haruki', 'Yuki', 'Sora', 'Ren', 'Akira', 'Hana', 'Rin', 'Kenji', 'Mio', 'Takeshi',
  'Aoi', 'Kaito', 'Naoki', 'Emi', 'Shin', 'Mei', 'Daichi', 'Yui', 'Koji', 'Nana',
  'Hayato', 'Saki', 'Ryo', 'Mika', 'Taro', 'Asuka', 'Jun', 'Kaori', 'Iori', 'Noa',
  'Hinata', 'Sota', 'Ayame', 'Kenta', 'Mari', 'Sho', 'Yuna', 'Tsubasa', 'Rei', 'Kana',
];

const FAMILY_NAMES = [
  'Yamamoto', 'Tanaka', 'Suzuki', 'Saito', 'Kobayashi', 'Takahashi', 'Ito', 'Watanabe',
  'Nakamura', 'Yoshida', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamada',
  'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamaguchi', 'Ishikawa', 'Maeda', 'Fujita', 'Ogawa',
  'Goto', 'Okada', 'Hasegawa', 'Murakami', 'Kondo', 'Ishii', 'Sakamoto', 'Endo', 'Aoki', 'Fukuda',
  'Nishimura', 'Fujii', 'Ota', 'Miura', 'Okamoto', 'Matsuda', 'Nakajima', 'Harada', 'Ono', 'Tamura',
];

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function parseWesternFullName(raw) {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  if (parts.length < 2) return null;
  const firstName = parts[0];
  const familyName = parts.slice(1).join(' ');
  if (!firstName || !familyName) return null;
  return { firstName, familyName, fullName: buildFullName(firstName, familyName) };
}

async function fetchNamesFromApi(count) {
  const url = `${NAMEY_API}?count=${Math.min(Math.max(count, 1), 20)}&with_surname=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map(parseWesternFullName)
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function pickLocalCandidate() {
  const firstName = pickRandom(GIVEN_NAMES);
  const familyName = pickRandom(FAMILY_NAMES);
  return {
    firstName,
    familyName,
    fullName: buildFullName(firstName, familyName),
  };
}

/**
 * Tire un prénom + nom civil unique (hors lignée de sang).
 * Essaie d'abord l'API publique namey.muffinlabs.com, puis repli local.
 */
export async function pickUniqueCivName({ forbiddenIdentityKeys = new Set() } = {}) {
  const maxAttempts = 100;

  for (let round = 0; round < 5; round += 1) {
    const localBatch = Array.from({ length: 12 }, () => pickLocalCandidate());
    const fromApi = round === 0 ? await fetchNamesFromApi(8) : [];
    const candidates = [...localBatch, ...fromApi];

    for (const candidate of candidates) {
      const key = ninjaIdentityKey(candidate.fullName);
      if (!forbiddenIdentityKeys.has(key)) {
        return candidate.fullName;
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = pickLocalCandidate();
      const key = ninjaIdentityKey(candidate.fullName);
      if (!forbiddenIdentityKeys.has(key)) {
        return candidate.fullName;
      }
    }
  }

  throw new Error('Impossible de générer un prénom et un nom civils uniques.');
}
