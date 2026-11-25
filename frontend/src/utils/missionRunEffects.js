/**
 * Libellés des effets / boosts actifs d’un parcours (solo + coop).
 * Source : player.runMods, player.nextCombatMods, hard mode, branchXpMult.
 *
 * @param {object} player
 * @param {{ hardMode?: boolean, t: Function }} ctx
 * @returns {{ key: string, label: string }[]}
 */
export function buildActiveRunEffects(player = {}, { hardMode = false, t } = {}) {
  const effects = [];
  if (hardMode || player.hardMode) {
    effects.push({ key: 'hardMode', label: t('combat.runEffect.hardMode') });
  }
  const runMods = player.runMods || {};
  const damagePct = Number(runMods.damagePct) || 0;
  if (damagePct > 0) {
    effects.push({
      key: 'damagePct',
      label: t('combat.runEffect.damagePct', { n: damagePct }),
    });
  }
  const xpMult = Number(runMods.xpMult);
  if (Number.isFinite(xpMult) && xpMult > 1) {
    effects.push({
      key: 'xpMult',
      label: t('combat.runEffect.xpMult', { n: xpMult }),
    });
  }
  const purseMult = Number(runMods.purseMult);
  if (Number.isFinite(purseMult) && purseMult > 1) {
    effects.push({
      key: 'purseMult',
      label: t('combat.runEffect.purseMult', { n: purseMult }),
    });
  }
  const cardChance = Number(runMods.cardChanceBonus) || 0;
  if (cardChance > 0) {
    effects.push({
      key: 'cardChance',
      label: t('combat.runEffect.cardChance', { n: cardChance }),
    });
  }
  const secondWind = Number(runMods.secondWind) || 0;
  if (secondWind > 0) {
    effects.push({
      key: 'secondWind',
      label: t('combat.runEffect.secondWind', {
        pct: Math.round(secondWind * 100),
      }),
    });
  }
  const startBlock = Number(runMods.startBlock) || 0;
  if (startBlock > 0) {
    effects.push({
      key: 'startBlock',
      label: t('combat.runEffect.startBlock', { n: startBlock }),
    });
  }
  const branchXp = Number(player.branchXpMult);
  if (Number.isFinite(branchXp) && branchXp > 1) {
    effects.push({
      key: 'branchXp',
      label: t('combat.runEffect.branchXp', { n: branchXp }),
    });
  }
  const next = player.nextCombatMods || {};
  const nextBlock = Number(next.block) || 0;
  if (nextBlock > 0) {
    effects.push({
      key: 'nextBlock',
      label: t('combat.runEffect.nextBlock', { n: nextBlock }),
    });
  }
  const nextChakra = Number(next.chakra) || 0;
  if (nextChakra > 0) {
    effects.push({
      key: 'nextChakra',
      label: t('combat.runEffect.nextChakra', { n: nextChakra }),
    });
  }
  const nextDamage = Number(next.damagePct) || 0;
  if (nextDamage > 0) {
    effects.push({
      key: 'nextDamage',
      label: t('combat.runEffect.nextDamage', { n: nextDamage }),
    });
  }
  const nextDraw = Number(next.draw) || 0;
  if (nextDraw > 0) {
    effects.push({
      key: 'nextDraw',
      label: t('combat.runEffect.nextDraw', { n: nextDraw }),
    });
  }
  return effects;
}
