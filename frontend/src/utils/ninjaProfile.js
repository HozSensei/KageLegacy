import { getNinjaRankKey } from '../constants/ninjaAvatars.js';
import { getNinjaCardBackground } from '../constants/ninjaCardBackgrounds.js';
import { normalizeProfileColor } from '@shared/character/profileColors.js';

export function ninjaRankLabel(rank, t, te) {
  const key = `player.ranks.${getNinjaRankKey(rank)}`;
  return te(key) ? t(key) : rank;
}

export function ninjaNicknameLabel(id, t, te, catalog = [], locale = 'fr') {
  if (!id) return '';
  const key = `player.nicknames.${id}`;
  if (te(key)) return t(key);
  const entry = Array.isArray(catalog) ? catalog.find(item => item?.id === id) : null;
  const lang = String(locale || 'fr').startsWith('en') ? 'en' : 'fr';
  if (entry?.name?.[lang]) return entry.name[lang];
  if (entry?.name?.fr) return entry.name.fr;
  const seasonMatch = String(id).match(/^season_(\d+)(_free)?$/);
  if (seasonMatch) {
    const n = Number(seasonMatch[1]);
    if (seasonMatch[2]) {
      return te('player.nicknames.season_free')
        ? t('player.nicknames.season_free', { n })
        : lang === 'en'
          ? `Season ${n} Scout`
          : `Éclaireur de la Saison ${n}`;
    }
    return te('player.nicknames.season')
      ? t('player.nicknames.season', { n })
      : lang === 'en'
        ? `Season ${n} Shadow`
        : `Ombre de la Saison ${n}`;
  }
  return id.replace(/[-_]+/g, ' ').replace(/^\S/, letter => letter.toUpperCase());
}

export function safeNinjaCardBackgroundId(value) {
  return getNinjaCardBackground(value) ? value : null;
}

export function safeNinjaProfileColor(value) {
  return normalizeProfileColor(value);
}

export function readNinjaAppearance(profile) {
  return {
    avatarId: profile?.avatarId ?? null,
    backgroundId: safeNinjaCardBackgroundId(profile?.backgroundId),
    backgroundColor: safeNinjaProfileColor(profile?.backgroundColor),
    nicknameId: profile?.nicknameId ?? null,
    frameId: profile?.frameId ?? null,
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
