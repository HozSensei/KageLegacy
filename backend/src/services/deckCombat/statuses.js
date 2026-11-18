/**
 * Gestion des statuts (buffs / debuffs) — module pur.
 */
import { getStatusValue, hasStatus } from './formulas.js';

/** Malus purifiables (cartes cleanse_self + talent purify). */
export const PLAYER_DEBUFF_KEYS = new Set(['weak', 'vulnerable', 'poison', 'burn']);

/**
 * Empile un statut : valeur cumulée, durée = max des durées.
 */
export function applyStatus(statuses, { key, value = 0, duration = 1 }) {
  const list = Array.isArray(statuses) ? [...statuses] : [];
  const idx = list.findIndex((s) => s.key === key);
  const v = Number(value) || 0;
  const d = duration == null ? null : Number(duration);

  if (idx === -1) {
    list.push({ key, value: v, duration: d });
    return list;
  }

  const existing = list[idx];
  const nextDuration =
    existing.duration == null || d == null
      ? existing.duration ?? d
      : Math.max(existing.duration, d);

  list[idx] = {
    key,
    value: (Number(existing.value) || 0) + v,
    duration: nextDuration,
  };
  return list;
}

/** Décrémente les durées ; retire les expirés. */
export function tickStatuses(statuses) {
  return (statuses || [])
    .map((s) => {
      if (s.duration == null) return s;
      return { ...s, duration: s.duration - 1 };
    })
    .filter((s) => s.duration == null || s.duration > 0);
}

/**
 * Début de tour : poison (PV), regen (soin).
 * @returns {{ entity, logs }}
 */
export function resolveStartOfTurnStatuses(entity) {
  const logs = [];
  let hp = Number(entity.hp) || 0;
  const maxHp = Number(entity.maxHp) || hp;
  const statuses = [...(entity.statuses || [])];

  const poison = getStatusValue(statuses, 'poison');
  if (poison > 0) {
    hp = Math.max(0, hp - poison);
    logs.push({ type: 'poison', value: poison, hp });
  }

  const regen = getStatusValue(statuses, 'regen');
  if (regen > 0 && hp > 0) {
    const before = hp;
    hp = Math.min(maxHp, hp + regen);
    logs.push({ type: 'regen', value: hp - before, hp });
  }

  return { entity: { ...entity, hp, statuses }, logs };
}

/**
 * Fin de tour : brûlure, tick durées, reset armure (sauf flag persistBlock).
 */
export function resolveEndOfTurnStatuses(entity, { persistBlock = false } = {}) {
  const logs = [];
  let hp = Number(entity.hp) || 0;
  let block = Number(entity.block) || 0;
  let statuses = [...(entity.statuses || [])];

  const burn = getStatusValue(statuses, 'burn');
  if (burn > 0) {
    hp = Math.max(0, hp - burn);
    logs.push({ type: 'burn', value: burn, hp });
  }

  statuses = tickStatuses(statuses);

  if (!persistBlock) {
    if (block > 0) logs.push({ type: 'block_fade', value: block });
    block = 0;
  }

  return { entity: { ...entity, hp, block, statuses }, logs };
}

export { hasStatus, getStatusValue };
