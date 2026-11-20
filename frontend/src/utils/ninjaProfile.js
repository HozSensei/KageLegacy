import { getNinjaRankKey } from '../constants/ninjaAvatars.js';

export function ninjaRankLabel(rank, t, te) {
  const key = `player.ranks.${getNinjaRankKey(rank)}`;
  return te(key) ? t(key) : rank;
}

export function ninjaNicknameLabel(id, t, te) {
  const key = `player.nicknames.${id}`;
  if (te(key)) return t(key);
  return id.replace(/[-_]+/g, ' ').replace(/^\S/, letter => letter.toUpperCase());
}

export function safeNinjaProfileColor(value) {
  return typeof value === 'string' && value.length === 7 && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

export function readNinjaAppearance(profile) {
  return {
    avatarId: profile?.avatarId ?? null,
    borderColor: safeNinjaProfileColor(profile?.borderColor),
    backgroundColor: safeNinjaProfileColor(profile?.backgroundColor),
    nicknameId: profile?.nicknameId ?? null,
  };
}

export function ninjaAppearanceChanges(saved, draft) {
  return Object.fromEntries(Object.entries(draft).filter(([key, value]) => saved[key] !== value));
}

export function ninjaProfileStats(stats) {
  const total = stats?.total ?? stats ?? {};
  // Player stats are bonuses. The profile shows starting values for solo missions.
  const maxHp = Math.max(1, 100 + (Number(total.maxHp) || 0));
  const maxChakra = Math.max(0, 5 + (Number(total.maxChakra) || 0));
  const armor = Math.max(0, Number(total.startingBlock ?? total.block ?? total.armor) || 0);
  return { hp: maxHp, maxHp, armor, chakra: maxChakra, maxChakra };
}
