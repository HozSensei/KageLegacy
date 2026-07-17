import { useI18n } from 'vue-i18n'

export function useNotificationCopy() {
  const { t, locale } = useI18n()

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
      case 'training_billing':
        return t('notifications.trainingBillingTitle')
      case 'scout_roster':
        return t('notifications.scoutRosterTitle')
      case 'operation_start':
        return t('notifications.operationStartTitle')
      case 'cycle_close':
        return t('notifications.cycleCloseTitle')
      case 'upset':
        return t('notifications.upsetTitle')
      case 'rivalry_nemesis':
        return t('notifications.rivalryTitle')
      case 'cycle_objective':
        return t('notifications.cycleObjectiveTitle')
      default:
        return t('notifications.genericTitle')
    }
  }

  function body(note) {
    const p = note.payload || {}
    switch (note.kind) {
      case 'bird_flight': {
        const farewell =
          typeof p.ceremony?.farewellLine === 'string'
            ? p.ceremony.farewellLine
            : p.ceremony?.farewellLine?.[locale.value?.startsWith?.('en') ? 'en' : 'fr'] ||
              p.ceremony?.farewellLine?.fr ||
              ''
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
          farewell,
        ]
          .filter(Boolean)
          .join(' ')
      }
      case 'chunin_exam_success':
        return t('bureau.chuninExam.successBody', {
          name: p.name?.split(' ')[0] || '—',
          average: p.overallRating ?? '—',
          ryos: (p.ryosReward ?? 0).toLocaleString(),
          reputation: p.reputationReward ?? 0,
          moral: p.moralAfter ?? '—',
          forme: p.formeAfter ?? '—',
        })
      case 'chunin_exam_failure':
        return t('bureau.chuninExam.failureBody', {
          name: p.name?.split(' ')[0] || '—',
          average: p.overallRating ?? '—',
          required: p.averageRequired ?? 8,
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
      case 'training_billing':
        if (p.paidCount === 0 && p.skippedCount > 0) {
          return t('notifications.trainingBillingSkipped', { count: p.skippedCount })
        }
        return t('notifications.trainingBillingBody', {
          paid: p.paidCount ?? 0,
          cost: (p.totalCost ?? 0).toLocaleString(),
          balance: (p.balanceAfter ?? 0).toLocaleString(),
        })
      case 'scout_roster':
        return t('notifications.scoutRosterBody', {
          opponent: p.opponentName || '—',
          tier: p.tier || 'partial',
        })
      case 'operation_start':
        return t('notifications.operationStartBody', {
          opponent: p.opponentName || '—',
        })
      case 'cycle_close': {
        const match = p.match
        if (match?.outcome) {
          return t('notifications.cycleCloseBodyMatch', {
            salary: (p.salaryDeducted ?? 0).toLocaleString(),
            balance: (p.balanceAfter ?? 0).toLocaleString(),
            opponent: match.opponentName || '—',
            outcome: cycleOutcomeLabel(match.outcome),
          })
        }
        return t('notifications.cycleCloseBody', {
          salary: (p.salaryDeducted ?? 0).toLocaleString(),
          balance: (p.balanceAfter ?? 0).toLocaleString(),
        })
      }
      case 'upset':
        return p.role === 'winner'
          ? t('notifications.upsetBodyWin', {
              loser: p.loserName || '—',
            })
          : t('notifications.upsetBodyLoss', {
              winner: p.winnerName || '—',
            })
      case 'rivalry_nemesis':
        return t('notifications.rivalryBody', {
          name: p.rivalName || '—',
          count: p.consecutiveLosses ?? 2,
        })
      case 'cycle_objective':
        return t('notifications.cycleObjectiveBody', {
          ryos: (p.rewardRyos ?? 0).toLocaleString(),
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

  function cycleOutcomeLabel(outcome) {
    const map = {
      win: t('notifications.matchWin'),
      draw: t('notifications.matchDraw'),
      loss: t('notifications.matchLoss'),
    }
    return map[outcome] || outcome
  }

  function linkPath(note) {
    if (note.kind === 'bird_flight') return '/bureau'
    if (note.kind === 'market_sale') return '/exchanges'
    if (note.kind === 'training_billing') return '/training'
    if (note.kind === 'scout_roster') return '/squad'
    if (note.kind === 'operation_start') {
      const matchId = note.payload?.matchId
      if (matchId) return `/operation/match/${matchId}`
      return '/operation'
    }
    if (note.kind === 'cycle_close') {
      const matchId = note.payload?.match?.matchId
      if (matchId) return `/operation/match/${matchId}`
      return '/journal'
    }
    if (
      note.kind === 'mission_report' ||
      note.kind === 'stagnation' ||
      note.kind === 'chunin_exam_success' ||
      note.kind === 'chunin_exam_failure'
    ) {
      return '/bureau'
    }
    if (note.kind === 'clan_well_fusion') return '/bureau'
    if (note.kind === 'reconnaissance_challenge') return '/missions'
    if (note.kind === 'reconnaissance_result') {
      const missionId = note.payload?.missionId
      if (missionId) return `/missions/recon/${missionId}`
      return '/missions'
    }
    if (note.kind === 'upset' || note.kind === 'rivalry_nemesis') {
      const matchId = note.payload?.matchId
      if (matchId) return `/operation/match/${matchId}`
      return '/league'
    }
    if (note.kind === 'cycle_objective') return '/bureau'
    return null
  }

  function linkLabel(note) {
    if (note.kind === 'bird_flight') return t('notifications.viewBureau')
    if (note.kind === 'market_sale') return t('bureau.market.viewExchanges')
    if (note.kind === 'training_billing') return t('notifications.viewTraining')
    if (note.kind === 'scout_roster') return t('notifications.viewSquad')
    if (note.kind === 'operation_start' || note.kind === 'cycle_close') {
      return note.kind === 'cycle_close' && !note.payload?.match?.matchId
        ? t('notifications.viewJournal')
        : t('notifications.viewOperation')
    }
    if (note.kind === 'mission_report') return t('missions.notificationLink')
    if (note.kind === 'chunin_exam_success' || note.kind === 'chunin_exam_failure') {
      return t('notifications.viewBureau')
    }
    if (note.kind === 'clan_well_fusion') return t('notifications.viewBureau')
    if (note.kind === 'stagnation') return t('notifications.viewBureau')
    if (note.kind === 'reconnaissance_challenge') return t('missions.reconNotifLink')
    if (note.kind === 'reconnaissance_result') return t('missions.reconViewChronicle')
    if (note.kind === 'upset' || note.kind === 'rivalry_nemesis') return t('notifications.viewOperation')
    if (note.kind === 'cycle_objective') return t('notifications.viewBureau')
    return null
  }

  return { title, body, linkPath, linkLabel }
}
