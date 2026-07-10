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

const IMPACT_PATTERN =
  /\((coups légers|frappe nette|impact violent|esquivé|sans effet notable|light blow|solid hit|heavy impact|dodged|no damage)\)/gi;

const MOMENTUM_PATTERN = /(→ [^.]+\.)/g;

const SCORE_PATTERN = /(\d+%)/g;

/**
 * Met en valeur acteurs, impacts et bilans de tour sans stocker de HTML en base.
 */
export function highlightChronicleText(text, { senseis = [], ninjas = [] } = {}) {
  if (!text) return '';

  let html = escapeHtml(text);

  const actors = [...new Set([...senseis, ...ninjas].filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );

  for (const name of actors) {
    const re = new RegExp(escapeRegex(name), 'gi');
    const isSensei = senseis.some((sensei) => sensei.toLowerCase() === name.toLowerCase());
    const cls = isSensei ? 'chronicle-sensei' : 'chronicle-ninja';
    html = html.replace(re, `<strong class="${cls}">$&</strong>`);
  }

  html = html.replace(
    IMPACT_PATTERN,
    '<span class="chronicle-impact">($1)</span>'
  );
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
