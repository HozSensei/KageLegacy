/**
 * Gestion des statuts (buffs / debuffs) — module pur.
 */
import { DOT_STATUS_KEYS } from './constants.js';
import { getStatusValue, hasStatus } from './formulas.js';

/** Malus purifiables (cartes cleanse_self + talent purify). */
export const PLAYER_DEBUFF_KEYS = new Set([
  'weak',
  'vulnerable',
  'poison',
  'burn',
  'bleed',
  'madness',
]);

/**
 * Empile un statut.
 * DoT : durée additionnée, intensité inchangée si déjà présent.
 * Autres : valeur cumulée, durée = max des durées.
 */
export function applyStatus(statuses, { key, value = 0, duration = 1 }) {
  const list = Array.isArray(statuses) ? [...statuses] : [];
  const idx = list.findIndex(s => s.key === key);
  const v = Number(value) || 0;
  const d = duration == null ? null : Number(duration);
  const isDot = DOT_STATUS_KEYS.has(key);

  if (idx === -1) {
    list.push({ key, value: v, duration: d });
    return list;
  }

  const existing = list[idx];

  if (isDot) {
    const nextDuration =
      existing.duration == null || d == null
        ? (existing.duration ?? d)
        : (Number(existing.duration) || 0) + (Number(d) || 0);
    list[idx] = {
      key,
      value: Number(existing.value) || 0,
      duration: nextDuration,
    };
    return list;
  }

  const nextDuration =
    existing.duration == null || d == null
      ? (existing.duration ?? d)
      : Math.max(existing.duration, d);

  list[idx] = {
    key,
    value: (Number(existing.value) || 0) + v,
    duration: nextDuration,
  };
  return list;
}

/** Décrémente les durées ; retire les expirés. */
export function tickStatuses(statuses, { skipKeys = null } = {}) {
  return (statuses || [])
    .map(s => {
      if (s.duration == null) return s;
      if (skipKeys && skipKeys.has(s.key)) return s;
      return { ...s, duration: s.duration - 1 };
    })
    .filter(s => s.duration == null || s.duration > 0);
}

function tickDotDurations(statuses) {
  return (statuses || [])
    .map(s => {
      if (!DOT_STATUS_KEYS.has(s.key) || s.duration == null) return s;
      return { ...s, duration: s.duration - 1 };
    })
    .filter(s => s.duration == null || s.duration > 0);
}

/**
 * Début de tour : DoT (PV) puis décrément durée DoT, puis regen (soin).
 * La durée d'un DoT = nombre de ticks restants.
 * @returns {{ entity, logs }}
 */
export function resolveStartOfTurnStatuses(entity) {
  const logs = [];
  let hp = Number(entity.hp) || 0;
  const maxHp = Number(entity.maxHp) || hp;
  let statuses = [...(entity.statuses || [])];

  for (const key of DOT_STATUS_KEYS) {
    const amount = getStatusValue(statuses, key);
    if (amount > 0) {
      hp = Math.max(0, hp - amount);
      logs.push({ type: key, value: amount, hp });
      if (hp <= 0) break;
    }
  }

  statuses = tickDotDurations(statuses);

  const regen = getStatusValue(statuses, 'regen');
  if (regen > 0 && hp > 0) {
    const before = hp;
    hp = Math.min(maxHp, hp + regen);
    logs.push({ type: 'regen', value: hp - before, hp });
  }

  return { entity: { ...entity, hp, statuses }, logs };
}

/**
 * Armure non consommée : conserve la moitié (arrondi vers le bas) à chaque tour.
 * Ex. 10 → 5 → 2 → 1 → 0. Une unité restante disparaît au tour suivant.
 * @returns {{ block: number, faded: number }}
 */
export function fadeRemainingBlock(block) {
  const current = Math.max(0, Math.floor(Number(block) || 0));
  if (current <= 0) return { block: 0, faded: 0 };
  const next = Math.floor(current / 2);
  return { block: next, faded: current - next };
}

/**
 * Applique le fade progressif d'armure et produit un log `block_fade` si besoin.
 * @param {object} [logExtra] — champs additionnels du log (ex. side)
 * @returns {{ entity: object, logs: object[] }}
 */
export function applyBlockFade(entity, logExtra = {}) {
  const { block, faded } = fadeRemainingBlock(entity?.block);
  const logs = faded > 0 ? [{ type: 'block_fade', value: faded, ...logExtra }] : [];
  return { entity: { ...entity, block }, logs };
}

/**
 * Fin de tour : tick durées (hors DoT), fade progressif d'armure (sauf flag persistBlock).
 */
export function resolveEndOfTurnStatuses(entity, { persistBlock = false } = {}) {
  const logs = [];
  const hp = Number(entity.hp) || 0;
  let block = Number(entity.block) || 0;
  const statuses = tickStatuses(entity.statuses || [], { skipKeys: DOT_STATUS_KEYS });

  if (!persistBlock) {
    const faded = fadeRemainingBlock(block);
    if (faded.faded > 0) logs.push({ type: 'block_fade', value: faded.faded });
    block = faded.block;
  }

  return { entity: { ...entity, hp, block, statuses }, logs };
}

export { hasStatus, getStatusValue };
