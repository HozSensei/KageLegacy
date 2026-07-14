import { useI18n } from 'vue-i18n'

export function useTrainingJournalDetails() {
  const { t } = useI18n()

  function statLabel(stat) {
    if (!stat) return '—'
    const key = `ninja.stats.${stat}`
    const translated = t(key)
    return translated === key ? stat : translated
  }

  function modeLabel(mode) {
    return mode === 'preparation'
      ? t('notifications.trainingJournalModePrep')
      : t('notifications.trainingJournalModeGlobal')
  }

  function typeLabel(type) {
    if (!type) return '—'
    const key = `training.types.${type}`
    const translated = t(key)
    return translated === key ? type : translated
  }

  function sessionGainLines(session) {
    if (session.legacyLine) {
      return [{ text: session.legacyLine, kind: 'legacy' }]
    }

    if (session.skipped) {
      const reasonKey = {
        lazy: 'notifications.trainingJournalSkippedLazy',
        grade_cap: 'notifications.trainingJournalSkippedCap',
        no_gain: 'notifications.trainingJournalNoGain',
      }[session.skipReason] || 'notifications.trainingJournalNoGain'

      return [{
        text: t(reasonKey, {
          type: typeLabel(session.trainingType),
          grade: session.grade || '—',
        }),
        kind: 'skipped',
      }]
    }

    const lines = []
    const applied = session.appliedGains || []
    const fractional = session.sessionGains || []

    for (const { stat, delta } of applied) {
      lines.push({
        text: t('notifications.trainingJournalGain', {
          delta,
          stat: statLabel(stat),
        }),
        kind: 'gain',
      })
    }

    for (const { stat, amount } of fractional) {
      const reserve = Number(amount)
      if (!Number.isFinite(reserve) || reserve <= 0) continue
      lines.push({
        text: t('notifications.trainingJournalGainReserve', {
          amount: reserve.toFixed(2),
          stat: statLabel(stat),
        }),
        kind: 'reserve',
      })
    }

    if (!lines.length) {
      lines.push({ text: t('notifications.trainingJournalNoGain'), kind: 'none' })
    }

    if (session.focusStat) {
      lines.push({
        text: t('notifications.trainingJournalFocus', {
          stat: statLabel(session.focusStat),
        }),
        kind: 'focus',
      })
    }

    return lines
  }

  function getTrainingDetails(note) {
    const payload = note?.payload || {}
    const rawSessions = Array.isArray(payload.trainingResults) && payload.trainingResults.length
      ? payload.trainingResults
      : (payload.trainingLogs || []).map((line) => ({ legacyLine: line }))

    return {
      globalType: payload.globalTrainingType || null,
      globalTypeLabel: payload.globalTrainingType ? typeLabel(payload.globalTrainingType) : null,
      sessions: rawSessions.map((session, index) => ({
        key: `${session.ninjaId ?? 'legacy'}-${session.mode ?? 'legacy'}-${index}`,
        firstName: session.name?.split(' ')[0] || '—',
        modeLabel: session.mode ? modeLabel(session.mode) : null,
        typeLabel: typeLabel(session.trainingType),
        gainLines: sessionGainLines(session),
        legacy: Boolean(session.legacyLine),
      })),
      billingLines: Array.isArray(payload.billingLogs) ? payload.billingLogs : [],
    }
  }

  function hasTrainingDetails(note) {
    if (note?.kind !== 'training_billing') return false
    const payload = note.payload || {}
    return Boolean(
      payload.trainingResults?.length ||
      payload.trainingLogs?.length ||
      payload.billingLogs?.length
    )
  }

  return { getTrainingDetails, hasTrainingDetails }
}
