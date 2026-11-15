/**
 * Trois factions jouables V2 — noms repris des villages C0
 * (leaf → Midorihara, sand → Kareno, mist → Oborohama).
 * Identité cosmétique uniquement (pas de bonus combat).
 */

export const FACTION_IDS = ['midorihara', 'kareno', 'oborohama'];

/** Métadonnées serveur (couleurs / bannières) — libellés via i18n client. */
export const FACTION_CATALOG = {
  midorihara: {
    id: 'midorihara',
    accentColor: '#2d6a4f',
    bannerTone: 'leaf',
    legacyVillageId: 'leaf',
  },
  kareno: {
    id: 'kareno',
    accentColor: '#b5651d',
    bannerTone: 'gold',
    legacyVillageId: 'sand',
  },
  oborohama: {
    id: 'oborohama',
    accentColor: '#1d4e89',
    bannerTone: 'sky',
    legacyVillageId: 'mist',
  },
};

export function isValidFactionId(factionId) {
  return FACTION_IDS.includes(factionId);
}

export function listFactions() {
  return FACTION_IDS.map((id) => ({ ...FACTION_CATALOG[id] }));
}

export function getFaction(factionId) {
  if (!isValidFactionId(factionId)) return null;
  return { ...FACTION_CATALOG[factionId] };
}

/** Assignation déterministe si le joueur n'en choisit pas. */
export function assignFactionFromSeed(seed) {
  const n = Math.abs(Number(seed) || 0);
  return FACTION_IDS[n % FACTION_IDS.length];
}
