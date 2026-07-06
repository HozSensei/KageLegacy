import { pick } from './narrative/phraseDictionary.js';
import { MISSION_TIERS } from './missionRules.js';

const MISSION_OPENING = {
  routine: [
    '{ninja_name} est parti sur une mission de routine dans les environs du village.',
    'Le contrat de routine de {ninja_name} s\'est déroulé sans incident majeur sur le terrain.',
  ],
  infiltration: [
    '{ninja_name} a infiltré un avant-poste ennemi et en est revenu sous le couvert de la nuit.',
    'L\'infiltration menée par {ninja_name} s\'est terminée — le messager attend au portail du dojo.',
  ],
  cyclone: [
    '{ninja_name} revient de l\'Opération Cyclone, le haillon en lambeaux mais debout.',
    'Le détachement de {ninja_name} a échappé de justesse à l\'embuscade — le rapport arrive au bureau.',
  ],
};

const INJURY_LINES = {
  light: [
    '{ninja_name} ramène une blessure légère : forme Lamentable jusqu\'au prochain soin.',
    'Le ninja {ninja_name} a besoin du dispensaire — contusion sérieuse au retour.',
  ],
  grave: [
    '{ninja_name} est cloué à l\'infirmerie : blessure grave, forme bloquée plusieurs cycles.',
    'Le rapport médical est formel — {ninja_name} ne repartira pas de sitôt en mission.',
  ],
  death: [
    '{ninja_name} n\'est jamais revenu du terrain. Mort clinique confirmée.',
    'Aucun signe de {ninja_name}… l\'équipe de récupération n\'a retrouvé que son bandeau.',
  ],
};

const LOOT_LINES = {
  empty: ['Aucun butin bonus — seulement les Ryos convenus.'],
  pansement: ['Un pansement de terrain a été glissé dans le sac du ninja.'],
  empty_chests: ['Mission accomplie, mais les coffres étaient vides.'],
  medical_kit: ['Un kit de matériel médical a été récupéré dans la cachette.'],
  smoke_bomb: ['Un fumigène de secours a été dérobé à l\'ennemi.'],
  search_failed: ['Échec de fouille — ils reviennent avec l\'argent de base, rien d\'autre.'],
  double_medical: ['Double ration de matériel médical trouvée dans les ruines.'],
  tactical_consumable: ['Un consommable tactique a été extrait des décombres.'],
  forbidden_scroll: ['Un Parchemin de Jutsu interdit a été déchiffré — gain immédiat en stat.'],
  prodigy_location: ['Un Aspirant prodige a été recruté sur la piste laissée par l\'opération.'],
};

function fill(template, vars) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value ?? '')),
    template
  );
}

export function buildMissionReportPayload({ tier, ninjaName, status, lootResult, injuryType }) {
  const tierLabel = MISSION_TIERS[tier]?.label ?? tier;
  const lines = [fill(pick(MISSION_OPENING[tier] || MISSION_OPENING.routine), { ninja_name: ninjaName })];

  if (injuryType && injuryType !== 'none') {
    const injuryPool = INJURY_LINES[injuryType];
    if (injuryPool) lines.push(fill(pick(injuryPool), { ninja_name: ninjaName }));
  }

  if (status === 'completed' && lootResult) {
    const lootKey = lootResult.prodige
      ? 'prodigy_location'
      : lootResult.scroll
        ? 'forbidden_scroll'
        : lootResult.narrative;
    const lootPool = LOOT_LINES[lootKey] || LOOT_LINES.empty;
    lines.push(pick(lootPool));
  }

  const lootSummaryKey =
    lootResult?.prodige
      ? 'prodigy_location'
      : lootResult?.scroll
        ? 'forbidden_scroll'
        : lootResult?.narrative || 'empty';

  return {
    missionId: lootResult?.missionId,
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
  };
}
