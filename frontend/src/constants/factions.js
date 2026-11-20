/** Accents cosmétique des villages — alignés sur `backend/src/services/factionCatalog.js`. */
export const FACTION_ACCENTS = Object.freeze({
  midorihara: '#2d6a4f',
  kareno: '#b5651d',
  oborohama: '#1d4e89',
});

export function factionAccentColor(factionId) {
  return FACTION_ACCENTS[factionId] ?? null;
}
