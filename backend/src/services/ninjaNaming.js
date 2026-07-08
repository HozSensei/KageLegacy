/**
 * Identité affichable d'un ninja : prénom + lignée (clan).
 * Ex. « Sora » roturier → Sora — Roturier ; « Kenji Uchiwa » → Kenji — Uchiwa
 */

export function parseNinjaNameParts(name, clanName) {
  const trimmed = (name || '').trim();
  const firstName = trimmed.split(/\s+/)[0] || trimmed;
  const familyName = (clanName || trimmed.split(/\s+/).slice(1).join(' ') || 'Roturier').trim();
  return { firstName, familyName };
}

export function ninjaIdentityKey(name, clanName) {
  const { firstName, familyName } = parseNinjaNameParts(name, clanName);
  return `${firstName.toLowerCase()}|${familyName.toLowerCase()}`;
}

export function formatNinjaDisplayName(name, clanName, separator = ' — ') {
  const { firstName, familyName } = parseNinjaNameParts(name, clanName);
  return `${firstName}${separator}${familyName}`;
}

export function collectIdentityKeys(ninjas) {
  return new Set(ninjas.map((n) => ninjaIdentityKey(n.name, n.clan_name)));
}

export function assertUniqueAmongRoster(name, clanName, existingNinjas) {
  const key = ninjaIdentityKey(name, clanName);
  const collision = existingNinjas.find((n) => ninjaIdentityKey(n.name, n.clan_name) === key);
  if (collision) {
    const error = new Error(
      `Un ninja nommé « ${formatNinjaDisplayName(name, clanName)} » fait déjà partie de votre effectif.`
    );
    error.statusCode = 409;
    throw error;
  }
}
