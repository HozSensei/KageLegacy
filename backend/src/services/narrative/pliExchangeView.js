/**
 * Vue structurée d'un échange de pli pour l'UI face-à-face.
 * left = premier Sensei (colonne gauche), right = second — sans vocabulaire foot.
 */

export function buildPliExchangeView(segment) {
  const vars = segment?.template_vars || {};
  const parts = vars.parts || [];
  const impact = vars.impact_log || {};
  const leftSensei = vars.home_sensei;
  const rightSensei = vars.away_sensei;

  const playParts = parts.filter((p) => p?.vars?.domain && p?.vars?.actor);
  const leftPlay =
    playParts.find((p) => p.vars.sensei === leftSensei) || playParts[0] || null;
  const rightPlay =
    playParts.find((p) => p.vars.sensei === rightSensei) || playParts[1] || null;

  const outcomePart = parts.find(
    (p) =>
      String(p?.action_key || '').includes('outcome_win') ||
      String(p?.action_key || '').includes('outcome_draw'),
  );

  let winner = 'draw';
  if (String(outcomePart?.action_key || '').includes('outcome_win') && outcomePart?.vars?.sensei) {
    if (outcomePart.vars.sensei === leftSensei) winner = 'left';
    else if (outcomePart.vars.sensei === rightSensei) winner = 'right';
  }

  let leftDamageReceived = 0;
  let rightDamageReceived = 0;
  let leftHeal = 0;
  let rightHeal = 0;
  let leftHitTarget = null;
  let rightHitTarget = null;

  if (winner === 'left') {
    rightDamageReceived = Number(impact.degats_pv) || 0;
    rightHitTarget = impact.cible_name || null;
    leftHeal = Number(impact.soins_pv) || 0;
    rightHeal = Number(impact.soins_pv_away) || 0;
  } else if (winner === 'right') {
    leftDamageReceived = Number(impact.degats_pv) || 0;
    leftHitTarget = impact.cible_name || null;
    leftHeal = Number(impact.soins_pv) || 0;
    rightHeal = Number(impact.soins_pv_away) || 0;
  } else {
    leftDamageReceived = Number(impact.degats_pv) || 0;
    rightDamageReceived = Number(impact.degats_pv_away) || 0;
    leftHitTarget = impact.cible_name || null;
    rightHitTarget = impact.cible_name_away || null;
    leftHeal =
      Number(impact.soins_pv_draw_home) || Number(impact.soins_pv) || 0;
    rightHeal =
      Number(impact.soins_pv_draw_away) || Number(impact.soins_pv_away) || 0;
  }

  const leftVars = leftPlay?.vars || {};
  const rightVars = rightPlay?.vars || {};

  return {
    pli: Number(vars.pli_num) || Number(segment.template_index) || null,
    winner,
    left: {
      senseiName: leftSensei || leftVars.sensei || null,
      actor: leftVars.actor || null,
      cardName: leftVars.card_name || null,
      domain: leftVars.domain || null,
      damageReceivedPv: leftDamageReceived,
      healPv: leftHeal,
      hitTarget: leftHitTarget,
    },
    right: {
      senseiName: rightSensei || rightVars.sensei || null,
      actor: rightVars.actor || null,
      cardName: rightVars.card_name || null,
      domain: rightVars.domain || null,
      damageReceivedPv: rightDamageReceived,
      healPv: rightHeal,
      hitTarget: rightHitTarget,
    },
  };
}

export function mapChronicleSegmentForClient(segment, resolveText) {
  const base = {
    order: segment.segment_order,
    blockType: segment.block_type,
    templateKey: segment.template_key || null,
    text: resolveText(segment),
  };

  if (segment.template_key === 'chronicle.pli') {
    return {
      ...base,
      kind: 'pli',
      exchange: buildPliExchangeView(segment),
    };
  }

  if (segment.template_key === 'chronicle.pli.combatOpen') {
    return { ...base, kind: 'combatOpen' };
  }

  return { ...base, kind: segment.block_type || 'text' };
}
