/** Métriques dérivées des combat_log pli (plis gagnés, tempo). */

export function plisMetrics(combatLog) {
  const plis = combatLog?.plisWon || {};
  const homePlis = Number(plis.home) || 0;
  const awayPlis = Number(plis.away) || 0;
  const total = homePlis + awayPlis;
  if (total <= 0) {
    return {
      homePlis: 0,
      awayPlis: 0,
      homePct: Number(combatLog?.possession?.homePct ?? 50),
      awayPct: Number(combatLog?.possession?.awayPct ?? 50),
    };
  }
  return {
    homePlis: Math.round(homePlis),
    awayPlis: Math.round(awayPlis),
    homePct: Math.round((homePlis / total) * 100),
    awayPct: Math.round((awayPlis / total) * 100),
  };
}

export function isPliLog(log) {
  return log?.type === 'pli' || log?.type === 'element' || log?.type === 'relais';
}

export function pliWinnerSide(log) {
  return log?.pli_winner === 'home' || log?.pli_winner === 'away' ? log.pli_winner : null;
}

export function winningTechniqueLabel(log) {
  if (log.pli_winner === 'home') return log.technique_type_home || log.technique_type;
  if (log.pli_winner === 'away') return log.technique_type_away || log.technique_type;
  return log.technique_type_home || log.technique_type_away || log.technique_type;
}

export function pliDamageTotal(log) {
  return (
    Number(log.degats_pv) ||
    Number(log.degats_pv_away) ||
    (log.egallite ? Number(log.degats_pv) + Number(log.degats_pv_away) : 0) ||
    0
  );
}
