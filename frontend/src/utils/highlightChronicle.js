function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeNameColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : null;
}

const IMPACT_PATTERN =
  /\((coups légers|frappe nette|impact violent|esquivé|sans effet notable|light blow|solid hit|heavy impact|dodged|no damage)\)/gi;

const MOMENTUM_PATTERN = /(→ [^.]+\.)/g;

const SCORE_PATTERN = /(\d+%)/g;

function wrapSenseiName(match, identity, { eliteBadgeLabel, eliteBadgeTitle }) {
  const color = identity?.isElite ? safeNameColor(identity.nameColor) : null;
  if (identity?.isElite && color) {
    const badge = escapeHtml(eliteBadgeLabel);
    const title = escapeHtml(eliteBadgeTitle);
    return (
      `<span class="chronicle-sensei-wrap chronicle-sensei-wrap--elite">` +
      `<strong class="chronicle-sensei chronicle-sensei--elite" style="color: ${color}">${match}</strong>` +
      `<span class="chronicle-elite-badge" title="${title}">${badge}</span>` +
      `</span>`
    );
  }
  return `<strong class="chronicle-sensei">${match}</strong>`;
}

/**
 * Met en valeur acteurs, impacts et bilans de tour sans stocker de HTML en base.
 */
export function highlightChronicleText(
  text,
  {
    senseiIdentities = [],
    ninjas = [],
    eliteBadgeLabel = 'Élite',
    eliteBadgeTitle = 'Pack Élite actif',
  } = {}
) {
  if (!text) return '';

  let html = escapeHtml(text);

  const identities = [...senseiIdentities]
    .filter((identity) => identity?.senseiName)
    .sort((a, b) => b.senseiName.length - a.senseiName.length);

  for (const identity of identities) {
    const re = new RegExp(escapeRegex(identity.senseiName), 'gi');
    html = html.replace(re, (match) =>
      wrapSenseiName(match, identity, { eliteBadgeLabel, eliteBadgeTitle })
    );
  }

  const ninjaNames = [...new Set(ninjas.filter(Boolean))].sort((a, b) => b.length - a.length);
  for (const name of ninjaNames) {
    const re = new RegExp(escapeRegex(name), 'gi');
    html = html.replace(re, `<strong class="chronicle-ninja">$&</strong>`);
  }

  html = html.replace(IMPACT_PATTERN, '<span class="chronicle-impact">($1)</span>');
  html = html.replace(MOMENTUM_PATTERN, '<span class="chronicle-momentum">$1</span>');
  html = html.replace(SCORE_PATTERN, '<span class="chronicle-stat">$1</span>');

  return html;
}

export function chronicleSegmentClass(blockType) {
  return {
    'chronicle-segment': true,
    [`chronicle-segment--${blockType || 'action'}`]: Boolean(blockType),
  };
}
