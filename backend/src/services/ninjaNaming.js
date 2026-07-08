/**
 * Identité civile d'un ninja : prénom + nom de famille (indépendant de la lignée de sang).
 * Ex. « Haruki Tanaka » → affiché « Haruki — Tanaka »
 */

export function parseNinjaNameParts(name) {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  const firstName = parts[0] || trimmed;
  const familyName = parts.slice(1).join(' ').trim();
  return { firstName, familyName };
}

export function buildFullName(firstName, familyName) {
  return `${firstName.trim()} ${familyName.trim()}`;
}

export function ninjaIdentityKey(name) {
  const { firstName, familyName } = parseNinjaNameParts(name);
  if (!familyName) {
    return firstName.toLowerCase();
  }
  return `${firstName.toLowerCase()}|${familyName.toLowerCase()}`;
}

export function formatNinjaDisplayName(name, separator = ' — ') {
  const { firstName, familyName } = parseNinjaNameParts(name);
  if (!familyName) return firstName;
  return `${firstName}${separator}${familyName}`;
}

export function collectIdentityKeys(ninjas) {
  return new Set(ninjas.map((n) => ninjaIdentityKey(n.name)));
}

export function assertUniqueAmongRoster(name, existingNinjas) {
  const key = ninjaIdentityKey(name);
  const collision = existingNinjas.find((n) => ninjaIdentityKey(n.name) === key);
  if (collision) {
    const error = new Error(
      `Un ninja nommé « ${formatNinjaDisplayName(name)} » fait déjà partie de votre effectif.`
    );
    error.statusCode = 409;
    throw error;
  }
}
