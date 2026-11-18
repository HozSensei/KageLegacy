import { ALL_CARDS } from './seedCards.js';

const ART_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];
const RARITY_BUDGETS = {
  common: [0, 5],
  rare: [5, 10],
  legendary: [10, 15],
  mythic: [15, 20],
};

function passiveTotal(passive = {}) {
  return ART_KEYS.reduce((sum, key) => sum + Math.max(0, Number(passive[key]) || 0), 0);
}

function activeProfile(card) {
  const effects = card.effects || [];
  const profile = [];
  if ((Number(card.baseDamage ?? card.damage) || 0) > 0) profile.push('damage');
  if ((Number(card.baseBlock ?? card.block) || 0) > 0) profile.push('block');
  if ((Number(card.baseHeal ?? card.heal) || 0) > 0) profile.push('heal');
  if (card.summon || card.type === 'summon') profile.push('summon');
  for (const effect of effects) {
    if (effect.type === 'apply_status') profile.push(`status:${effect.status}`);
    else profile.push(effect.type);
  }
  return [...new Set(profile)];
}

const findings = [];
const byArt = Object.fromEntries([...ART_KEYS, 'common'].map(key => [key, []]));
const roleCounts = Object.fromEntries([...ART_KEYS, 'common'].map(key => [key, {}]));
for (const card of ALL_CARDS) {
  const isCommon = card.type === 'item' || card.type === 'summon' || card.slug.startsWith('clan-');
  const expectedArt = isCommon ? 'common' : card.statType;
  const passiveBudget = RARITY_BUDGETS[card.rarity];
  const levels = [0, 1, 2].map(level => {
    const base = { ...(card.passiveBonus || {}) };
    if (level > 0) {
      for (const [key, value] of Object.entries(
        card.upgradeBonuses?.[`level_${level}`]?.passive || {}
      )) {
        base[key] = (Number(base[key]) || 0) + (Number(value) || 0);
      }
    }
    return { level, total: passiveTotal(base) };
  });
  const overBudget = levels.filter(item => item.total > passiveBudget[1]);
  const underBudget = levels.filter(item => item.total < passiveBudget[0]);

  if (card.statType !== expectedArt) {
    findings.push({ kind: 'art', slug: card.slug, expected: expectedArt, actual: card.statType });
  }
  if (card.statType === 'medicine' && (Number(card.baseDamage) || 0) > 0) {
    findings.push({ kind: 'medicine_damage', slug: card.slug, damage: card.baseDamage });
  }
  if (card.slug.startsWith('clan-') && !card.heldEffect) {
    findings.push({ kind: 'heritage_missing_held_effect', slug: card.slug });
  }
  if (overBudget.length || underBudget.length) {
    findings.push({
      kind: 'passive_budget',
      slug: card.slug,
      rarity: card.rarity,
      allowed: passiveBudget,
      levels,
    });
  }
  const profile = activeProfile(card);
  for (const role of profile) {
    roleCounts[card.statType][role] = (roleCounts[card.statType][role] || 0) + 1;
  }
  byArt[card.statType]?.push({
    slug: card.slug,
    rarity: card.rarity,
    cost: card.baseCost,
    profile,
    passive: levels,
  });
}

const summary = {
  total: ALL_CARDS.length,
  target: 250,
  byArt: Object.fromEntries(Object.entries(byArt).map(([key, cards]) => [key, cards.length])),
  roles: roleCounts,
  byRarity: ALL_CARDS.reduce((out, card) => {
    out[card.rarity] = (out[card.rarity] || 0) + 1;
    return out;
  }, {}),
  findings: findings.reduce((out, finding) => {
    out[finding.kind] = (out[finding.kind] || 0) + 1;
    if (finding.kind === 'passive_budget') {
      const key = finding.rarity;
      out.passiveByRarity = out.passiveByRarity || {};
      out.passiveByRarity[key] = (out.passiveByRarity[key] || 0) + 1;
    }
    return out;
  }, {}),
};

const payload = process.argv.includes('--summary') ? { summary } : { summary, findings };
console.log(JSON.stringify(payload, null, 2));
