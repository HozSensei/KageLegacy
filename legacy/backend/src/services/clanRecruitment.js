/**
 * Tirage de lignée à la génération / recrutement d'un ninja.
 * Un ninja issu d'un clan nommé (surtout noble) doit rester rare.
 */

export const RECRUITMENT_WEIGHTS = {
  roturier: 65,
  clan_commun: 25,
  clan_noble: 10,
};

export function partitionClans(clans) {
  const roturier = clans.filter((c) => c.name === 'Roturier');
  const noble = clans.filter((c) => c.is_noble && c.name !== 'Roturier');
  const common = clans.filter((c) => !c.is_noble && c.name !== 'Roturier');
  return { roturier, noble, common };
}

export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * @param {Array} clans — lignées depuis clan_traits
 * @param {{ forceNoble?: boolean, forceRoturier?: boolean }} options — tests / marché futur
 */
export function pickClanForRecruitment(clans, options = {}) {
  const { roturier, noble, common } = partitionClans(clans);

  if (options.forceNoble && noble.length) return pickRandom(noble);
  if (options.forceRoturier && roturier.length) return roturier[0];

  const roll = Math.random() * 100;
  const { clan_noble, clan_commun, roturier: wRot } = RECRUITMENT_WEIGHTS;

  if (roll < clan_noble && noble.length) return pickRandom(noble);
  if (roll < clan_noble + clan_commun && common.length) return pickRandom(common);
  if (roturier.length) return roturier[0];
  if (common.length) return pickRandom(common);
  return pickRandom(clans);
}

export function getClanTier(clan) {
  if (!clan || clan.name === 'Roturier') return 'roturier';
  if (clan.is_noble) return 'noble';
  return 'common';
}

export function clanTierLabel(tier, language = 'fr') {
  const labels = {
    fr: { roturier: 'Sans lignée', common: 'Clan du village', noble: 'Lignée noble' },
    en: { roturier: 'No bloodline', common: 'Village clan', noble: 'Noble bloodline' },
  };
  return labels[language]?.[tier] || labels.fr[tier];
}
