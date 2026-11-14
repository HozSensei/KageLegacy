/**
 * Application minimale des effect_code talents (keystones / notables).
 *
 * MVP appliqué :
 *   - iron_guard      → +3 armure début de tour joueur
 *   - boosted_regen   → +3 PV début de tour joueur
 *   - berserker       → ×1.25 dégâts si PV < 50%
 *
 * Stubs (listés dans combat.talentEffects, non appliqués) :
 *   combo_master, blade_swift, elemental_fusion, overload,
 *   illusion_master, shadow_feint, immortal, perfect_tank, elemental_mastery
 */
import { TALENT_EFFECT_MVP } from './constants.js';

export function classifyTalentEffects(effectCodes = []) {
  const applied = [];
  const stubbed = [];
  for (const code of effectCodes) {
    if (!code) continue;
    if (TALENT_EFFECT_MVP[code]) applied.push(code);
    else stubbed.push(code);
  }
  return { applied, stubbed };
}

/** Mods de dégâts dérivés des talents (recalculés à chaque carte). */
export function computeTalentDamageMods(effectCodes, player) {
  const mods = { damageMult: 1 };
  const codes = new Set(effectCodes || []);

  if (codes.has('berserker')) {
    const cfg = TALENT_EFFECT_MVP.berserker;
    const ratio = (Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1);
    if (ratio < cfg.threshold) mods.damageMult *= cfg.mult;
  }

  return mods;
}

/**
 * Effets passifs début de tour joueur.
 * @returns {{ player, logs }}
 */
export function applyTalentStartOfTurn(player, effectCodes = []) {
  const logs = [];
  const next = { ...player };
  const codes = new Set(effectCodes || []);

  if (codes.has('iron_guard')) {
    const v = TALENT_EFFECT_MVP.iron_guard.value;
    next.block = (Number(next.block) || 0) + v;
    logs.push({ type: 'talent', effect: 'iron_guard', block: v });
  }

  if (codes.has('boosted_regen')) {
    const v = TALENT_EFFECT_MVP.boosted_regen.value;
    const before = next.hp;
    next.hp = Math.min(next.maxHp, next.hp + v);
    logs.push({ type: 'talent', effect: 'boosted_regen', heal: next.hp - before });
  }

  return { player: next, logs };
}
