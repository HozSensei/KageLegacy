import { computed, ref } from 'vue';

/**
 * État module-level (singleton) des résultats de sim admin.
 * Survit aux remounts / resets de <select> / watchers du formulaire —
 * contrairement à un ref local clearé ou à un emit parent fragile.
 */
const payload = ref(null);

const RANK_ORDER = Object.freeze({ D: 0, C: 1, B: 2, A: 3 });

/** @param {unknown} value */
export function extractSimRows(value) {
  if (!value || typeof value !== 'object') return [];
  const candidate = value;
  if (Array.isArray(candidate.rows)) return candidate.rows;
  if (Array.isArray(candidate.body?.rows)) return candidate.body.rows;
  if (Array.isArray(candidate.data?.rows)) return candidate.data.rows;
  return [];
}

/** @param {unknown} raw */
export function normalizeSimPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.rows)) return raw;
  if (Array.isArray(raw.body?.rows)) return { ...raw.body };
  if (Array.isArray(raw.data?.rows)) return { ...raw.data };
  return raw;
}

function pct(rate) {
  return `${((Number(rate) || 0) * 100).toFixed(1)}%`;
}

/**
 * Heuristique d’équilibrage à partir des clearances par rang.
 * @param {Array<Record<string, unknown>>} list
 * @returns {{ code: string, tone: 'ok'|'warn'|'bad'|'mixed', detail?: Record<string, string|number> } | null}
 */
export function assessBalanceRows(list) {
  if (!Array.isArray(list) || !list.length) return null;

  const ordered = [...list].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
  const rates = ordered.map(r => Number(r.clearanceRate) || 0);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const rateOf = rank => {
    const row = ordered.find(r => r.rank === rank);
    return row == null ? null : Number(row.clearanceRate) || 0;
  };
  const dRate = rateOf('D');
  const aRate = rateOf('A');

  let drops = 0;
  let rises = 0;
  for (let i = 1; i < rates.length; i += 1) {
    const delta = rates[i] - rates[i - 1];
    if (delta < -0.05) drops += 1;
    else if (delta > 0.05) rises += 1;
  }

  if (max < 0.1) return { code: 'tooHard', tone: 'bad', detail: { max: pct(max) } };
  if (min >= 0.7) return { code: 'tooEasy', tone: 'warn', detail: { min: pct(min) } };
  if (rises > drops && rises > 0) return { code: 'inverted', tone: 'bad' };

  for (let i = 1; i < rates.length; i += 1) {
    if (rates[i - 1] >= 0.35 && rates[i] < 0.05) {
      return {
        code: 'cliff',
        tone: 'warn',
        detail: {
          from: ordered[i - 1].rank,
          to: ordered[i].rank,
          fromRate: pct(rates[i - 1]),
          toRate: pct(rates[i]),
        },
      };
    }
  }

  if (rates.length > 1 && max - min < 0.12) {
    return { code: 'flat', tone: 'warn', detail: { spread: pct(max - min) } };
  }

  const dOk = dRate == null || dRate >= 0.35;
  const aChallenging = aRate == null || aRate <= 0.55;
  if (drops >= rises && dOk && aChallenging) {
    return {
      code: 'balanced',
      tone: 'ok',
      detail: {
        d: dRate == null ? '—' : pct(dRate),
        a: aRate == null ? '—' : pct(aRate),
      },
    };
  }

  if (dRate != null && dRate < 0.2) {
    return { code: 'entryTooHard', tone: 'bad', detail: { d: pct(dRate) } };
  }
  if (aRate != null && aRate >= 0.7) {
    return { code: 'endTooEasy', tone: 'warn', detail: { a: pct(aRate) } };
  }

  return { code: 'mixed', tone: 'mixed' };
}

/**
 * Store + helpers pour l’UI admin sim.
 * Clear uniquement via `clear()` / `setPayload(null)` — jamais depuis un watcher joueur/deck.
 */
export function useAdminBalanceResults() {
  const rows = computed(() => extractSimRows(payload.value));
  const hasResults = computed(() => rows.value.length > 0);
  const assessment = computed(() => assessBalanceRows(rows.value));

  function setPayload(raw) {
    if (raw == null) {
      payload.value = null;
      return null;
    }
    const normalized = normalizeSimPayload(raw);
    const nextRows = extractSimRows(normalized);
    if (!normalized || !nextRows.length) {
      payload.value = null;
      return null;
    }
    // Snapshot figé (copie shallow) pour éviter toute mutation API ultérieure.
    payload.value = { ...normalized, rows: [...nextRows] };
    return payload.value;
  }

  function clear() {
    payload.value = null;
  }

  return {
    payload,
    rows,
    hasResults,
    assessment,
    setPayload,
    clear,
  };
}
