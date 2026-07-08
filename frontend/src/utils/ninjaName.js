export function parseNinjaNameParts(name, clanName) {
  const trimmed = (name || '').trim();
  const firstName = trimmed.split(/\s+/)[0] || trimmed;
  const familyName = (clanName || trimmed.split(/\s+/).slice(1).join(' ') || 'Roturier').trim();
  return { firstName, familyName };
}

export function formatNinjaDisplayName(name, clanName, separator = ' — ') {
  const { firstName, familyName } = parseNinjaNameParts(name, clanName);
  return `${firstName}${separator}${familyName}`;
}
