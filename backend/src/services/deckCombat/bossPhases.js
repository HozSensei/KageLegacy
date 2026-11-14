/**
 * Boss multi-phases — seuils HP → intents / buffs / immunités / barrière.
 * Module pur (pas de DB). Voir docs/BOSS_PHASES.md.
 */
import { applyStatus } from './statuses.js';

/**
 * Ratio PV courant (0–1). Sécurise division par zéro.
 * @param {{ hp?: number, maxHp?: number }} enemy
 */
export function getEnemyHpPct(enemy) {
  const maxHp = Math.max(1, Number(enemy?.maxHp) || 1);
  const hp = Math.max(0, Number(enemy?.hp) || 0);
  return hp / maxHp;
}

/**
 * Index de phase cible selon HP.
 * phaseIndex runtime : -1 = pattern de base du template ; 0..n-1 = phases[].
 */
export function findTargetPhaseIndex(enemy) {
  const phases = enemy?.phases;
  if (!Array.isArray(phases) || !phases.length) return -1;

  const hpPct = getEnemyHpPct(enemy);
  let target = -1;
  for (let i = 0; i < phases.length; i += 1) {
    const threshold = Number(phases[i].hpPctBelow);
    if (!Number.isFinite(threshold)) continue;
    if (hpPct <= threshold) target = i;
  }
  return target;
}

/**
 * Applique onEnter d'une définition de phase (buffs, barrière, immunités, AI).
 */
export function applyPhaseEnter(enemy, phaseDef) {
  let next = {
    ...enemy,
    statuses: [...(enemy.statuses || [])],
    immunities: [...(enemy.immunities || [])],
  };
  const logs = [];
  const onEnter = phaseDef?.onEnter || {};

  if (Array.isArray(onEnter.immunities) && onEnter.immunities.length) {
    const set = new Set([...(next.immunities || []), ...onEnter.immunities]);
    next.immunities = [...set];
    logs.push({ type: 'phase_immunities', immunities: [...next.immunities] });
  }

  if (onEnter.clearStatuses) {
    next.statuses = [];
    logs.push({ type: 'phase_clear_statuses' });
  }

  if (Array.isArray(onEnter.buffs)) {
    for (const buff of onEnter.buffs) {
      next.statuses = applyStatus(next.statuses, {
        key: buff.status || buff.key || 'force',
        value: Number(buff.value) || 1,
        duration: buff.duration == null ? 2 : Number(buff.duration),
      });
      logs.push({
        type: 'phase_buff',
        status: buff.status || buff.key,
        value: buff.value,
        duration: buff.duration,
      });
    }
  }

  if (onEnter.barrier != null) {
    next.barrier = Math.max(0, Number(onEnter.barrier) || 0);
    logs.push({ type: 'phase_barrier', barrier: next.barrier });
  }

  if (onEnter.setBlock != null) {
    next.block = Math.max(0, Number(onEnter.setBlock) || 0);
    logs.push({ type: 'phase_block', block: next.block });
  }

  if (phaseDef.ai) next.ai = phaseDef.ai;
  if (Array.isArray(phaseDef.pattern)) {
    next.pattern = phaseDef.pattern.map((p) => ({ ...p }));
    next.patternIndex = 0;
  }
  if (Array.isArray(phaseDef.patterns)) {
    next.patterns = phaseDef.patterns.map((p) => ({
      ...p,
      intent: p.intent ? { ...p.intent } : p.intent,
    }));
  }

  next.phaseId = phaseDef.id || next.phaseId;
  return { enemy: next, logs };
}

/**
 * Avance les phases boss si les seuils HP sont franchis (unidirectionnel).
 * @returns {{ enemy: object, logs: object[], changed: boolean }}
 */
export function maybeAdvanceBossPhase(enemy, { announceIntent } = {}) {
  if (!enemy || !Array.isArray(enemy.phases) || !enemy.phases.length) {
    return { enemy, logs: [], changed: false };
  }

  const current = Number.isFinite(Number(enemy.phaseIndex))
    ? Number(enemy.phaseIndex)
    : -1;
  const target = findTargetPhaseIndex(enemy);
  if (target <= current) {
    return { enemy, logs: [], changed: false };
  }

  let next = { ...enemy, statuses: [...(enemy.statuses || [])] };
  const logs = [];

  for (let i = current + 1; i <= target; i += 1) {
    const phaseDef = enemy.phases[i];
    if (!phaseDef) continue;
    const applied = applyPhaseEnter(next, phaseDef);
    next = applied.enemy;
    next.phaseIndex = i;
    logs.push({
      type: 'boss_phase',
      phaseId: phaseDef.id,
      phaseIndex: i,
      hpPct: getEnemyHpPct(next),
      hpPctBelow: phaseDef.hpPctBelow,
    });
    logs.push(...applied.logs);
  }

  if (typeof announceIntent === 'function') {
    next.intent = announceIntent(next);
    logs.push({ type: 'intent', intent: next.intent, reason: 'boss_phase' });
  }

  return { enemy: next, logs, changed: true };
}

/**
 * Dégâts entrants ennemi : barrière persistante → armure → PV.
 */
export function applyDamageThroughBarrier(
  entity,
  rawDamage,
  opts = {},
  applyDamageThroughBlock,
) {
  const incoming = Math.max(0, Math.floor(Number(rawDamage) || 0));
  let barrier = Math.max(0, Number(entity.barrier) || 0);
  const logs = [];
  let remaining = incoming;
  let barrierAbsorbed = 0;
  let barrierBroken = false;

  if (barrier > 0 && remaining > 0) {
    barrierAbsorbed = Math.min(barrier, remaining);
    barrier -= barrierAbsorbed;
    remaining -= barrierAbsorbed;
    logs.push({
      type: 'barrier_absorb',
      amount: barrierAbsorbed,
      barrier,
    });
    if (barrier === 0) {
      barrierBroken = true;
      logs.push({ type: 'shield_break', amount: barrierAbsorbed });
    }
  }

  const base = applyDamageThroughBlock(
    { ...entity, barrier },
    remaining,
    opts,
  );

  let statuses = [...(entity.statuses || [])];
  if (barrierBroken && opts.shieldBreakVulnerable !== false) {
    statuses = applyStatus(statuses, {
      key: 'vulnerable',
      value: 1,
      duration: 2,
    });
    logs.push({ type: 'shield_break_vulnerable', duration: 2 });
  }

  return {
    ...base,
    barrier,
    barrierAbsorbed,
    barrierBroken,
    statuses,
    logs,
    totalIncoming: incoming,
  };
}

export function canApplyStatus(entity, statusKey) {
  const key = String(statusKey || '');
  if (!key) return false;
  const immunities = entity?.immunities || [];
  return !immunities.includes(key);
}

/**
 * Inflige des dégâts à l'ennemi : minion (taunt) → barrière → armure → PV, puis check phase.
 */
export function hitEnemy(enemy, rawDamage, opts = {}, applyDamageThroughBlock) {
  const logs = [];
  let next = {
    ...enemy,
    statuses: [...(enemy.statuses || [])],
    immunities: [...(enemy.immunities || [])],
  };
  let remaining = Math.max(0, Math.floor(Number(rawDamage) || 0));
  let totalDealtToBoss = 0;

  if (next.minion && (next.minion.hp || 0) > 0 && next.minion.taunt !== false && remaining > 0) {
    const minionHp = Number(next.minion.hp) || 0;
    const absorbed = Math.min(minionHp, remaining);
    const minionHpAfter = minionHp - absorbed;
    remaining -= absorbed;
    next = {
      ...next,
      minion: minionHpAfter > 0 ? { ...next.minion, hp: minionHpAfter } : null,
    };
    logs.push({
      type: 'minion_damage',
      amount: absorbed,
      minionHp: minionHpAfter > 0 ? minionHpAfter : 0,
      fallen: minionHpAfter <= 0,
    });
  }

  if (remaining > 0) {
    const result = applyDamageThroughBarrier(
      next,
      remaining,
      opts,
      applyDamageThroughBlock,
    );
    next = {
      ...next,
      hp: result.hp,
      block: result.block,
      barrier: result.barrier,
      statuses: result.statuses,
    };
    totalDealtToBoss = result.damageDealt;
    logs.push(...result.logs);
  }

  const phase = maybeAdvanceBossPhase(next, {
    announceIntent: opts.announceIntent,
  });
  next = phase.enemy;
  logs.push(...phase.logs);

  return {
    enemy: next,
    logs,
    damageDealt: totalDealtToBoss,
    phaseChanged: phase.changed,
  };
}
