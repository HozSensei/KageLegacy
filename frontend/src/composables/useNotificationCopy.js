import { useI18n } from 'vue-i18n'

export function useNotificationCopy() {
  const { t } = useI18n()

  function title(note) {
    switch (note.kind) {
      case 'bird_flight':
        return t('bureau.birdFlight.graduationTitle')
      case 'chunin_exam_success':
        return t('bureau.chuninExam.successTitle')
      case 'chunin_exam_failure':
        return t('bureau.chuninExam.failureTitle')
      case 'market_sale':
        return t('bureau.market.saleTitle')
      case 'mission_report':
        return t('missions.notificationTitle')
      case 'stagnation':
        return t('bureau.stagnation.notificationTitle')
      case 'clan_well_fusion':
        return t('notifications.clanWellTitle')
      case 'reconnaissance_challenge':
        return t('missions.reconNotifChallengeTitle')
      case 'reconnaissance_result':
        return t('missions.reconNotifResultTitle')
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
      case 'chunin_exam_success':
        return t('bureau.chuninExam.successBody', {
          name: p.name?.split(' ')[0] || '—',
          combat: p.combatStat ?? '—',
          intelligence: p.intelligence ?? '—',
        })
      case 'chunin_exam_failure':
        return t('bureau.chuninExam.failureBody', {
          name: p.name?.split(' ')[0] || '—',
          combat: p.combatStat ?? '—',
          intelligence: p.intelligence ?? '—',
          moral: p.moral ?? '—',
        })
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
      case 'stagnation': {
        const list = p.ninjas || []
        if (list.length === 1) {
          const n = list[0]
          return t('bureau.stagnation.notificationBody', {
            name: n.name?.split(' ')[0] || '—',
            forme: n.weeklyForme || '—',
            moral: n.moral ?? '—',
          })
        }
        const names = list.map((n) => n.name?.split(' ')[0]).filter(Boolean).join(', ')
        return t('bureau.stagnation.notificationBodyMultiple', { names: names || '—' })
      }
      case 'clan_well_fusion':
        return t('notifications.clanWellBody', { clanName: p.clanName || '—' })
      case 'reconnaissance_challenge':
        return t('missions.reconNotifChallengeBody', { name: p.challengerName || '—' })
      case 'reconnaissance_result':
        return t('missions.reconNotifResultBody', {
          outcome: reconOutcomeLabel(p.outcome),
          opponent: p.opponentName || '—',
          ryos: p.ryos ?? 0,
        })
      default:
        return t('notifications.genericBody')
    }
  }

  function reconOutcomeLabel(outcome) {
    const map = {
      win: t('missions.reconOutcomeWin'),
      draw: t('missions.reconOutcomeDraw'),
      loss: t('missions.reconOutcomeLoss'),
    }
    return map[outcome] || outcome
  }

  function linkPath(note) {
    if (note.kind === 'market_sale') return '/exchanges'
    if (
      note.kind === 'mission_report' ||
      note.kind === 'stagnation' ||
      note.kind === 'chunin_exam_success' ||
      note.kind === 'chunin_exam_failure'
    ) {
      return '/bureau'
    }
    if (note.kind === 'clan_well_fusion') return '/bureau'
    if (note.kind === 'reconnaissance_challenge' || note.kind === 'reconnaissance_result') {
      return '/missions'
    }
    return null
  }

  function linkLabel(note) {
    if (note.kind === 'market_sale') return t('bureau.market.viewExchanges')
    if (note.kind === 'mission_report') return t('missions.notificationLink')
    if (note.kind === 'chunin_exam_success' || note.kind === 'chunin_exam_failure') {
      return t('notifications.viewBureau')
    }
    return null
  }

  return { title, body, linkPath, linkLabel }
}
