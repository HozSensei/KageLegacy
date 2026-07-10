/**
 * Construit un objet identity minimal à partir de données legacy (nom seul).
 * @param {{ userId?: number, senseiName: string, isBot?: boolean }} row
 */
export function fallbackIdentity(row) {
  return {
    userId: row.userId ?? 0,
    senseiName: row.senseiName ?? row.name ?? 'Sensei',
    isBot: Boolean(row.isBot),
    isGuest: Boolean(row.isGuest),
    isElite: false,
    gradeLabel: row.isBot ? 'bot' : row.isGuest ? 'guest' : 'jonin',
    title: null,
    titleSlug: null,
    bannerSlug: 'none',
    nameColor: '#e8ece9',
    profileUrl: row.userId ? `/sensei/${row.userId}` : '#',
  }
}

/**
 * @param {object|null|undefined} identity
 * @param {{ userId?: number, senseiName?: string, name?: string, isBot?: boolean }} fallback
 */
export function resolveIdentity(identity, fallback) {
  return identity ?? fallbackIdentity(fallback)
}
