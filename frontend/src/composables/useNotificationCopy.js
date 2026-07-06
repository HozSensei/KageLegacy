import { useI18n } from 'vue-i18n'

export function useNotificationCopy() {
  const { t } = useI18n()

  function title(note) {
    switch (note.kind) {
      case 'bird_flight':
        return t('bureau.birdFlight.graduationTitle')
      case 'market_sale':
        return t('bureau.market.saleTitle')
      case 'mission_report':
        return t('missions.notificationTitle')
      default:
        return t('notifications.genericTitle')
    }
  }

  function body(note) {
    const p = note.payload || {}
    switch (note.kind) {
      case 'bird_flight':
        return [
          t('bureau.birdFlight.graduationBody', {
            name: p.departed?.name?.split(' ')[0] || '—',
            ryos: (p.departed?.ryosReward ?? 0).toLocaleString(),
            reputation: p.departed?.reputationReward ?? 0,
          }),
          t('bureau.birdFlight.arrivalBody', {
            name: p.arrival?.name || '—',
            profile: p.arrival?.potential || p.arrival?.primaryArt || '',
          }),
        ].join(' ')
      case 'market_sale':
        return t('bureau.market.saleBody', {
          asset: p.assetLabel || '—',
          buyer: p.buyerName || '—',
          price: (p.price ?? 0).toLocaleString(),
          proceeds: (p.sellerProceeds ?? 0).toLocaleString(),
        })
      case 'mission_report':
        return p.reportText || t('missions.notificationIntro', {
          ninja: p.ninjaName || '—',
          tier: p.tierLabel || p.tier || '—',
          ryos: (p.ryos ?? 0).toLocaleString(),
        })
      default:
        return t('notifications.genericBody')
    }
  }

  function linkPath(note) {
    if (note.kind === 'market_sale') return '/exchanges'
    if (note.kind === 'mission_report') return '/bureau'
    return null
  }

  function linkLabel(note) {
    if (note.kind === 'market_sale') return t('bureau.market.viewExchanges')
    if (note.kind === 'mission_report') return t('missions.notificationLink')
    return null
  }

  return { title, body, linkPath, linkLabel }
}
