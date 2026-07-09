/** Catalogue cosmétique Pack Élite — mock V1 (aligné specs/pack-elite.md) */

export const ELITE_NAME_COLORS = [
  { slug: 'ink', hex: '#e8ece9', labelFr: 'Encre', labelEn: 'Ink' },
  { slug: 'gold', hex: '#c9a66b', labelFr: 'Or du village', labelEn: 'Village gold' },
  { slug: 'jade', hex: '#8fad9a', labelFr: 'Jade', labelEn: 'Jade' },
  { slug: 'water', hex: '#6d9eb8', labelFr: 'Eau profonde', labelEn: 'Deep water' },
  { slug: 'fire', hex: '#c97d5d', labelFr: 'Braise', labelEn: 'Ember' },
]

export const ELITE_BANNERS = [
  { slug: 'none', labelFr: 'Aucune', labelEn: 'None', cssClass: '' },
  { slug: 'mist', labelFr: 'Brume du crépuscule', labelEn: 'Twilight mist', cssClass: 'sensei-banner--mist' },
  { slug: 'embers', labelFr: 'Braises du forgeur', labelEn: "Smith's embers", cssClass: 'sensei-banner--embers' },
  { slug: 'moonlight', labelFr: 'Clair de lune', labelEn: 'Moonlight', cssClass: 'sensei-banner--moonlight' },
  { slug: 'scroll', labelFr: 'Parchemin ancestral', labelEn: 'Ancient scroll', cssClass: 'sensei-banner--scroll' },
]

export const ELITE_TITLES = [
  { slug: 'shadow_architect', labelFr: 'Architecte des Ombres', labelEn: 'Shadow Architect' },
  { slug: 'veteran_league', labelFr: 'Vétéran de la Ligue', labelEn: 'League Veteran' },
  { slug: 'chronicle_keeper', labelFr: 'Gardien des Chroniques', labelEn: 'Chronicle Keeper' },
  { slug: 'dojo_founder', labelFr: 'Fondateur de Dojo', labelEn: 'Dojo Founder' },
  { slug: 'promoted_ii', labelFr: 'Promu Division II', labelEn: 'Promoted to Division II' },
  { slug: 'flawless_cycle', labelFr: 'Cycle sans défaite', labelEn: 'Flawless cycle' },
]

/** @param {string} slug @param {'fr'|'en'} locale */
export function resolveTitle(slug, locale = 'fr') {
  if (!slug) return null
  const entry = ELITE_TITLES.find((t) => t.slug === slug)
  if (!entry) return null
  return locale === 'en' ? entry.labelEn : entry.labelFr
}

/** @param {string} slug */
export function resolveBannerClass(slug) {
  const entry = ELITE_BANNERS.find((b) => b.slug === slug)
  return entry?.cssClass ?? ''
}

/**
 * Construit un objet identity mock pour la maquette.
 * @param {Record<string, unknown>} overrides
 */
export function mockSenseiIdentity(overrides = {}) {
  const locale = overrides.locale ?? 'fr'
  const isElite = overrides.isElite ?? false
  const titleSlug = overrides.titleSlug ?? null
  const userId = overrides.userId ?? 1

  return {
    userId,
    senseiName: overrides.senseiName ?? 'Kakashi_Hatake',
    isBot: overrides.isBot ?? false,
    isElite,
    gradeLabel: overrides.gradeLabel ?? (isElite ? 'jonin_elite' : 'jonin'),
    titleSlug,
    title: overrides.title ?? resolveTitle(titleSlug, locale),
    bannerSlug: overrides.bannerSlug ?? 'none',
    nameColor: overrides.nameColor ?? '#e8ece9',
    profileUrl: `/sensei/${userId}`,
    ...overrides,
  }
}

export const SHOWCASE_IDENTITIES = {
  free: mockSenseiIdentity({
    userId: 101,
    senseiName: 'Genin_Sensei',
    isElite: false,
    titleSlug: null,
    bannerSlug: 'none',
  }),
  eliteMist: mockSenseiIdentity({
    userId: 42,
    senseiName: 'Kakashi_Hatake',
    isElite: true,
    titleSlug: 'shadow_architect',
    bannerSlug: 'mist',
    nameColor: '#c9a66b',
  }),
  eliteEmbers: mockSenseiIdentity({
    userId: 7,
    senseiName: 'Tsunade_Sama',
    isElite: true,
    titleSlug: 'veteran_league',
    bannerSlug: 'embers',
    nameColor: '#8fad9a',
  }),
  eliteMoon: mockSenseiIdentity({
    userId: 13,
    senseiName: 'Hinata_Byakugan',
    isElite: true,
    titleSlug: 'chronicle_keeper',
    bannerSlug: 'moonlight',
    nameColor: '#6d9eb8',
  }),
  bot: mockSenseiIdentity({
    userId: 0,
    senseiName: 'Bot_Iwagakure',
    isBot: true,
    isElite: false,
    titleSlug: null,
  }),
}
