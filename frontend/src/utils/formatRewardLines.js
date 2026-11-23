/**
 * Formate les gains (grants API ou résumé combat/mission) pour l’UI et les notifications.
 */

export function formatGrant(grant, t) {
  if (!grant || grant.skipped) return null;
  const n = Number(grant.amount) || 0;
  switch (grant.type) {
    case 'ryos':
      return n > 0 ? t('combat.rewardRyos', { n }) : null;
    case 'xp':
      return n > 0 ? t('combat.rewardXp', { n }) : null;
    case 'dust':
      return n > 0 ? t('achievements.reward.dust', { n }) : null;
    case 'essence':
      return n > 0 ? t('achievements.reward.essence', { n }) : null;
    case 'kage_coins':
      return n > 0 ? t('notifications.rewardKageCoins', { n }) : null;
    case 'booster':
      return t('notifications.rewardBooster', {
        kind: grant.boosterType || grant.kind || 'standard',
      });
    case 'card':
      return t('notifications.rewardCard');
    case 'nickname':
      return t('notifications.rewardNickname');
    default:
      return grant.type && n > 0 ? `+${n} ${grant.type}` : null;
  }
}

export function formatGrants(grants, t) {
  if (!Array.isArray(grants) || !grants.length) return '';
  return grants.map(g => formatGrant(g, t)).filter(Boolean).join(' · ');
}

/** Aligné sur les lignes de VictoryRewards (sans le loot reveal). */
export function formatCombatSummary(rewards, t) {
  if (!rewards || rewards.error) return '';
  const out = [];
  if (rewards.xp > 0) out.push(t('combat.rewardXp', { n: rewards.xp }));
  if (rewards.ryos > 0) out.push(t('combat.rewardRyos', { n: rewards.ryos }));
  if (rewards.leveledUp) {
    out.push(
      t('combat.rewardLevel', {
        n: rewards.levelsGained,
        talent: rewards.talentPointsGained || 0,
      })
    );
  }
  const lootCount = Array.isArray(rewards.lootCards)
    ? rewards.lootCards.filter(e => e?.card).length
    : 0;
  if (lootCount > 0) {
    out.push(t('combat.revealLootHint', { n: lootCount }));
  } else if (rewards.card) {
    out.push(t('notifications.rewardCard'));
  }
  if (rewards.runMult) {
    out.push(t('combat.rewardRunBonus', { n: rewards.runMult }));
  }
  if (rewards.purseReturned > 0) {
    out.push(t('notifications.rewardPurse', { n: rewards.purseReturned }));
  }
  return out.join(' · ');
}

export function normalizeDuelReward(reward) {
  if (reward == null) return null;
  if (typeof reward === 'number') return reward > 0 ? { ryos: reward } : null;
  if (typeof reward === 'object') {
    const ryos = Number(reward.ryos) || 0;
    const xp = Number(reward.xp) || 0;
    if (ryos <= 0 && xp <= 0) return null;
    return { ryos, xp };
  }
  return null;
}
