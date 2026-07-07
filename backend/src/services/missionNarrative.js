import { MISSION_TIERS } from './missionRules.js';
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
}) {
  const lang = normalizeLocale(locale);
  const rng = createNarrativeRng(missionId, 1);
  const tierLabel = MISSION_TIERS[tier]?.label ?? tier;
  const vars = { ninja_name: ninjaName };

  const opening = pickFromPool(lang, `mission.opening.${tier}`, rng.fork(2), vars);
  const lines = [opening.text];

  if (injuryType && injuryType !== 'none') {
    const injury = pickFromPool(lang, `mission.injury.${injuryType}`, rng.fork(3), vars);
    lines.push(injury.text);
  }

  if (status === 'completed' && lootResult) {
    const lootKey = lootResult.prodige
      ? 'prodigy_location'
      : lootResult.scroll
        ? 'forbidden_scroll'
        : lootResult.narrative;
    const loot = pickFromPool(lang, `mission.loot.${lootKey}`, rng.fork(4), vars);
    lines.push(loot.text);
  }

  const lootSummaryKey =
    lootResult?.prodige
      ? 'prodigy_location'
      : lootResult?.scroll
        ? 'forbidden_scroll'
        : lootResult?.narrative || 'empty';

  return {
    missionId: lootResult?.missionId ?? missionId,
    tier,
    tierLabel,
    ninjaName,
    status,
    ryos: lootResult?.baseRyos ?? 0,
    injuryType: injuryType || 'none',
    lootTier: lootResult?.lootTier ?? 'none',
    lootSummaryKey,
    prodigeName: lootResult?.prodige?.name ?? null,
    scrollStat: lootResult?.scroll?.stat ?? null,
    scrollGain: lootResult?.scroll?.gain ?? null,
    reportLines: lines,
    reportText: lines.join(' '),
    locale: lang,
  };
}
