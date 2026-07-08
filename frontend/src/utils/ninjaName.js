export function parseNinjaNameParts(name) {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  const firstName = parts[0] || trimmed;
  const familyName = parts.slice(1).join(' ').trim();
  return { firstName, familyName };
}

export function formatNinjaDisplayName(name, separator = ' — ') {
  const { firstName, familyName } = parseNinjaNameParts(name);
  if (!familyName) return firstName;
  return `${firstName}${separator}${familyName}`;
}
