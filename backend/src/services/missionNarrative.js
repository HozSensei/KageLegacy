import { getMissionTierConfig, narrativeTierKey, normalizeMissionTier } from './missionRules.js';
import {
  createNarrativeRng,
  normalizeLocale,
  pickFromPool,
} from './narrative/narrativeI18n.js';

export function buildMissionReportPayload({
  missionId = 0,
  locale = 'fr',
  tier,
  ninjaName,
  status,
  lootResult,
  injuryType,
  success,
}) {
  const lang = normalizeLocale(locale);
  const rng = createNarrativeRng(missionId, 1);
  const normalizedTier = normalizeMissionTier(tier);
  const tierConfig = getMissionTierConfig(normalizedTier);
  const tierLabel = tierConfig ? `Mission — rang ${tierConfig.rank}` : tier;
  const narrativeKey = narrativeTierKey(normalizedTier);
  const vars = { ninja_name: ninjaName };

  const opening = pickFromPool(lang, `mission.opening.${narrativeKey}`, rng.fork(2), vars);
  const lines = [opening.text];

  if (success === false) {
    const failLine = pickFromPool(lang, 'mission.outcome.failure', rng.fork(5), vars);
    if (failLine?.text) lines.push(failLine.text);
  }

  if (injuryType && injuryType !== 'none') {
    const injury = pickFromPool(lang, `mission.injury.${injuryType}`, rng.fork(3), vars);
    lines.push(injury.text);
  }

  if (status === 'completed' && lootResult?.success !== false && lootResult) {
    const lootKey = lootResult.prodige
      ? 'prodigy_location'
      : lootResult.scroll
        ? 'forbidden_scroll'
        : lootResult.narrative;
    const loot = pickFromPool(lang, `mission.loot.${lootKey}`, rng.fork(4), vars);
    lines.push(loot.text);
  }

  if (lootResult?.statGain?.gain) {
    const statLine = pickFromPool(lang, 'mission.outcome.stat_gain', rng.fork(6), {
      ...vars,
      stat: lootResult.statGain.stat,
      gain: lootResult.statGain.gain,
    });
    if (statLine?.text) lines.push(statLine.text);
  }

  const lootSummaryKey =
    lootResult?.prodige
      ? 'prodigy_location'
      : lootResult?.scroll
        ? 'forbidden_scroll'
        : lootResult?.narrative || 'empty';

  return {
    missionId: lootResult?.missionId ?? missionId,
    tier: normalizedTier,
    tierLabel,
    ninjaName,
    status,
    success: lootResult?.success ?? success ?? status === 'completed',
    ryos: lootResult?.baseRyos ?? 0,
    injuryType: injuryType || 'none',
    lootTier: lootResult?.lootTier ?? 'none',
    lootSummaryKey,
    prodigeName: lootResult?.prodige?.name ?? null,
    scrollStat: lootResult?.scroll?.stat ?? null,
    scrollGain: lootResult?.scroll?.gain ?? null,
    statGain: lootResult?.statGain ?? null,
    reportLines: lines,
    reportText: lines.join(' '),
    locale: lang,
  };
}
