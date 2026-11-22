/**
 * Arbre de talents V3 : quatre piliers verticaux, six paliers de trois talents.
 * Les nœuds ont des rangs ; les talents mécaniques se débloquent une seule fois.
 * Aucun talent ne modifie le Chakra : cette ressource reste équilibrée pour le PvP.
 */

const BRANCH_OFFSETS = {
  taijutsu: 0,
  ninjutsu: 400,
  genjutsu: 800,
  medicine: 1200,
};

const TIER_POINT_REQUIREMENTS = [0, 4, 9, 15, 22, 30];

export function defineNode(n) {
  return {
    id: n.id,
    nameFr: n.nameFr,
    nameEn: n.nameEn,
    descFr: n.descFr || null,
    descEn: n.descEn || null,
    type: n.effect ? 'notable' : 'stat',
    x: n.x,
    y: n.y,
    branch: n.branch,
    tier: n.tier,
    maxRank: n.maxRank ?? (n.effect ? 1 : 3),
    requiredBranchPoints: n.requiredBranchPoints ?? 0,
    bonus: n.bonus || null,
    effect: n.effect || null,
    requires: n.requires || [],
    icon: n.icon || (n.effect ? '◆' : '·'),
    color: n.color || null,
  };
}

function spec(id, nameFr, nameEn, descFr, descEn, values = {}) {
  return { id, nameFr, nameEn, descFr, descEn, ...values };
}

function buildBranch(branch, tiers) {
  const idsByTier = [];
  for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
    idsByTier[tierIndex] = tiers[tierIndex].map(entry => `${branch}_${entry.id}`);
  }

  return tiers.flatMap((entries, tierIndex) =>
    entries.map((entry, column) => {
      const requires = [];
      if (tierIndex > 0 && entry.linked) {
        requires.push(
          idsByTier[tierIndex - 1][Math.min(column, idsByTier[tierIndex - 1].length - 1)],
        );
      }
      return defineNode({
        ...entry,
        id: `${branch}_${entry.id}`,
        x: BRANCH_OFFSETS[branch] + column * 90,
        y: tierIndex * 120,
        branch,
        tier: tierIndex + 1,
        requiredBranchPoints: TIER_POINT_REQUIREMENTS[tierIndex],
        requires,
      });
    }),
  );
}

const TAIJUTSU = buildBranch('taijutsu', [
  [
    spec(
      'stance',
      'Poings trempés',
      'Tempered Fists',
      '+2 Taijutsu par rang.',
      '+2 Taijutsu per rank.',
      { bonus: { taijutsu: 2 } },
    ),
    spec(
      'vitality',
      'Corps endurant',
      'Enduring Body',
      '+5 PV maximum par rang.',
      '+5 maximum HP per rank.',
      { bonus: { maxHp: 5 }, linked: false },
    ),
    spec(
      'guard',
      'Garde ancrée',
      'Grounded Guard',
      '+1 Armure au début du combat par rang.',
      '+1 Armor at combat start per rank.',
      { bonus: { startingBlock: 1 } },
    ),
  ],
  [
    spec(
      'quick_hand',
      'Main rapide',
      'Quick Hand',
      '+2 Taijutsu par rang.',
      '+2 Taijutsu per rank.',
      { bonus: { taijutsu: 2 }, linked: true },
    ),
    spec(
      'pressure',
      'Pression continue',
      'Relentless Pressure',
      'Chaque Taijutsu déjà joué pendant ce tour ajoute +1 dégât.',
      'Each Taijutsu already played this turn adds +1 damage.',
      { effect: 'relentless_press' },
    ),
    spec(
      'iron_guard',
      'Garde de fer',
      'Iron Guard',
      '+3 Armure au début de chaque tour.',
      '+3 Armor at the beginning of each turn.',
      { effect: 'iron_guard', linked: true },
    ),
  ],
  [
    spec(
      'counter',
      'Riposte',
      'Counterstrike',
      'Après avoir perdu des PV, la prochaine attaque Taijutsu gagne +4 dégâts.',
      'After losing HP, the next Taijutsu attack gains +4 damage.',
      { effect: 'counter_strike', linked: true },
    ),
    spec(
      'grip',
      'Entaille sanglante',
      'Bleeding Cut',
      'Le saignement inflige +2 PV par tour.',
      'Bleed deals +2 HP per turn.',
      { effect: 'bleed_focus' },
    ),
    spec(
      'force',
      'Force martiale',
      'Martial Force',
      '+3 Taijutsu par rang.',
      '+3 Taijutsu per rank.',
      { bonus: { taijutsu: 3 }, linked: true },
    ),
  ],
  [
    spec(
      'finisher',
      'Coup final',
      'Finishing Blow',
      '+50 % dégâts Taijutsu contre un ennemi sous 25 % de ses PV.',
      '+50% Taijutsu damage against an enemy below 25% HP.',
      { effect: 'finisher_blow', linked: true },
    ),
    spec(
      'adrenaline',
      'Second souffle',
      'Second Wind',
      'Sous 50 % de PV, les Taijutsu gagnent +3 dégâts.',
      'Below 50% HP, Taijutsu gain +3 damage.',
      { effect: 'adrenaline_rush' },
    ),
    spec(
      'resilience',
      'Peau dure',
      'Tough Skin',
      '+8 PV maximum par rang.',
      '+8 maximum HP per rank.',
      { bonus: { maxHp: 8 }, maxRank: 2, linked: true },
    ),
  ],
  [
    spec(
      'combo',
      'Maître des enchaînements',
      'Combo Master',
      'La troisième carte Taijutsu du tour inflige le double de dégâts.',
      'The third Taijutsu card of the turn deals double damage.',
      { effect: 'combo_master', linked: true },
    ),
    spec(
      'discipline',
      'Discipline martiale',
      'Martial Discipline',
      '+2 Taijutsu par rang.',
      '+2 Taijutsu per rank.',
      { bonus: { taijutsu: 2 } },
    ),
    spec(
      'veteran_hp',
      'Endurance du vétéran',
      'Veteran Endurance',
      '+6 PV maximum par rang.',
      '+6 maximum HP per rank.',
      { bonus: { maxHp: 6 }, linked: true },
    ),
  ],
  [
    spec(
      'mastery',
      'Maîtrise des poings',
      'Fist Mastery',
      '+4 Taijutsu par rang.',
      '+4 Taijutsu per rank.',
      { bonus: { taijutsu: 4 }, maxRank: 2, linked: true },
    ),
    spec('iron_body', 'Corps de fer', 'Iron Body', '+10 PV maximum.', '+10 maximum HP.', {
      bonus: { maxHp: 10 },
      maxRank: 1,
    }),
    spec(
      'steady_stride',
      'Assise parfaite',
      'Perfect Stance',
      '+2 Médecine et +2 Taijutsu par rang.',
      '+2 Medicine and +2 Taijutsu per rank.',
      { bonus: { medicine: 2, taijutsu: 2 }, maxRank: 2, linked: true },
    ),
  ],
]);

const NINJUTSU = buildBranch('ninjutsu', [
  [
    spec(
      'seal',
      'Sceau élémentaire',
      'Elemental Seal',
      '+2 Ninjutsu par rang.',
      '+2 Ninjutsu per rank.',
      { bonus: { ninjutsu: 2 } },
    ),
    spec(
      'clarity',
      'Esprit clair',
      'Clear Mind',
      '+4 PV maximum par rang.',
      '+4 maximum HP per rank.',
      { bonus: { maxHp: 4 } },
    ),
    spec(
      'dual_focus',
      'Double élément',
      'Dual Focus',
      '+1 Ninjutsu et +1 Médecine par rang.',
      '+1 Ninjutsu and +1 Medicine per rank.',
      { bonus: { ninjutsu: 1, medicine: 1 } },
    ),
  ],
  [
    spec(
      'elements',
      'Fusion élémentaire',
      'Elemental Fusion',
      'Après deux éléments différents joués pendant le tour, piochez une carte.',
      'After two different elements are played in a turn, draw one card.',
      { effect: 'elemental_fusion', linked: true },
    ),
    spec(
      'mastery',
      'Maîtrise élémentaire',
      'Elemental Mastery',
      '+25 % de dégâts sur les cartes élémentaires.',
      '+25% damage with elemental cards.',
      { effect: 'elemental_mastery' },
    ),
    spec('flow', 'Flux régulier', 'Steady Flow', '+3 Ninjutsu par rang.', '+3 Ninjutsu per rank.', {
      bonus: { ninjutsu: 3 },
      linked: true,
    }),
  ],
  [
    spec(
      'cycle',
      'Cycle élémentaire',
      'Element Cycle',
      'Alterner les éléments donne +2 dégâts à la prochaine carte.',
      'Alternating elements gives +2 damage to the next card.',
      { effect: 'elemental_cycle', linked: true },
    ),
    spec(
      'dual_nature',
      'Double nature',
      'Dual Nature',
      'Avec au moins deux éléments dans le deck, +10 % de dégâts Ninjutsu.',
      'With at least two elements in the deck, +10% Ninjutsu damage.',
      { effect: 'dual_element' },
    ),
    spec(
      'reserve',
      'Réserve vitale',
      'Vital Reserve',
      '+6 PV maximum par rang.',
      '+6 maximum HP per rank.',
      { bonus: { maxHp: 6 }, linked: true },
    ),
  ],
  [
    spec(
      'echo',
      'Écho de sceau',
      'Seal Echo',
      'La première carte Ninjutsu du combat se rejoue à 50 % de dégâts.',
      'The first Ninjutsu card of the combat replays at 50% damage.',
      { effect: 'echo_cast', linked: true },
    ),
    spec(
      'lens',
      'Lentille de puissance',
      'Power Lens',
      '+3 Ninjutsu par rang.',
      '+3 Ninjutsu per rank.',
      { bonus: { ninjutsu: 3 } },
    ),
    spec(
      'focus_burn',
      'Brûlure de focus',
      'Focus Burn',
      'La brûlure inflige +2 PV par tour.',
      'Burn deals +2 HP per turn.',
      { effect: 'focus_burn', linked: true },
    ),
  ],
  [
    spec(
      'overcharge',
      'Étincelle finale',
      'Final Spark',
      '+3 Ninjutsu par rang.',
      '+3 Ninjutsu per rank.',
      { bonus: { ninjutsu: 3 }, linked: true },
    ),
    spec(
      'conduit',
      'Conduit stable',
      'Stable Conduit',
      '+3 Ninjutsu par rang.',
      '+3 Ninjutsu per rank.',
      { bonus: { ninjutsu: 3 } },
    ),
    spec(
      'balance',
      'Équilibre élémentaire',
      'Elemental Balance',
      '+2 Ninjutsu et +2 Médecine par rang.',
      '+2 Ninjutsu and +2 Medicine per rank.',
      { bonus: { ninjutsu: 2, medicine: 2 }, maxRank: 2, linked: true },
    ),
  ],
  [
    spec(
      'expertise',
      'Expertise élémentaire',
      'Elemental Expertise',
      '+4 Ninjutsu par rang.',
      '+4 Ninjutsu per rank.',
      { bonus: { ninjutsu: 4 }, maxRank: 2, linked: true },
    ),
    spec(
      'reinforced_seal',
      'Sceau renforcé',
      'Reinforced Seal',
      '+8 PV maximum par rang.',
      '+8 maximum HP per rank.',
      { bonus: { maxHp: 8 }, maxRank: 2 },
    ),
    spec(
      'precision',
      'Précision des formes',
      'Form Precision',
      '+3 Ninjutsu et +1 Genjutsu par rang.',
      '+3 Ninjutsu and +1 Genjutsu per rank.',
      { bonus: { ninjutsu: 3, genjutsu: 1 }, maxRank: 2, linked: true },
    ),
  ],
]);

const GENJUTSU = buildBranch('genjutsu', [
  [
    spec(
      'veil',
      'Voile trompeur',
      'Deceiving Veil',
      '+2 Genjutsu par rang.',
      '+2 Genjutsu per rank.',
      { bonus: { genjutsu: 2 } },
    ),
    spec(
      'instinct',
      'Instinct prudent',
      'Careful Instinct',
      '+5 PV maximum par rang.',
      '+5 maximum HP per rank.',
      { bonus: { maxHp: 5 } },
    ),
    spec(
      'mirage',
      'Armure de mirage',
      'Mirage Armor',
      '+2 Armure au début du combat, perdue au premier coup reçu.',
      '+2 Armor at combat start, lost on the first hit taken.',
      { effect: 'mirage_armor' },
    ),
  ],
  [
    spec(
      'shadow',
      'Pas de spectre',
      'Specter Step',
      'Après une esquive réussie, piochez une carte, une fois par combat.',
      'After a successful evade, draw a card, once per combat.',
      { effect: 'phantom_step', linked: true },
    ),
    spec(
      'duration',
      'Illusion persistante',
      'Lasting Illusion',
      'Les malus Genjutsu durent un tour de plus.',
      'Genjutsu debuffs last one additional turn.',
      { effect: 'illusion_master' },
    ),
    spec(
      'reading',
      'Lecture du danger',
      'Danger Reading',
      '+3 Genjutsu par rang.',
      '+3 Genjutsu per rank.',
      { bonus: { genjutsu: 3 }, linked: true },
    ),
  ],
  [
    spec(
      'weight',
      'Poids du mirage',
      'Mirage Weight',
      'Un ennemi sous malus Genjutsu inflige 2 dégâts de moins.',
      'An enemy under a Genjutsu debuff deals 2 less damage.',
      { effect: 'confusion_tax', linked: true },
    ),
    spec(
      'mind_trap',
      'Piège mental',
      'Mind Trap',
      'Les attaques ennemies d’au moins 3 dégâts infligent 1 dégât de moins.',
      'Enemy attacks dealing at least 3 damage deal 1 less damage.',
      { effect: 'mind_trap' },
    ),
    spec(
      'mind',
      'Folie concentrée',
      'Focused Madness',
      'La folie inflige +2 PV par tour.',
      'Madness deals +2 HP per turn.',
      { effect: 'madness_focus', linked: true },
    ),
  ],
  [
    spec(
      'silent',
      'Coupe silencieuse',
      'Silent Cut',
      'Une carte Genjutsu offensive jouée en premier dans le tour gagne +2 dégâts.',
      'An offensive Genjutsu card played first in the turn gains +2 damage.',
      { effect: 'silent_cut', linked: true },
    ),
    spec(
      'fear',
      'Graine de peur',
      'Fear Seed',
      'Le premier malus Genjutsu du combat réduit aussi la Force ennemie.',
      'The first Genjutsu debuff of combat also reduces enemy Force.',
      { effect: 'fear_seed' },
    ),
    spec(
      'echo',
      'Douleur en écho',
      'Echoed Pain',
      'Quand vous perdez des PV, l’ennemi perd 1 PV, une fois par tour.',
      'When you lose HP, the enemy loses 1 HP, once per turn.',
      { effect: 'echo_pain', linked: true },
    ),
  ],
  [
    spec(
      'thick_veil',
      'Voile épais',
      'Thick Veil',
      '+10 % d’esquive tant que l’ennemi subit un malus Genjutsu.',
      '+10% evade while the enemy has a Genjutsu debuff.',
      { effect: 'veil_thick', linked: true },
    ),
    spec(
      'focus',
      'Focalisation mentale',
      'Mental Focus',
      '+2 Genjutsu et +1 Ninjutsu par rang.',
      '+2 Genjutsu and +1 Ninjutsu per rank.',
      { bonus: { genjutsu: 2, ninjutsu: 1 }, maxRank: 2 },
    ),
    spec(
      'body',
      'Corps attentif',
      'Watchful Body',
      '+8 PV maximum par rang.',
      '+8 maximum HP per rank.',
      { bonus: { maxHp: 8 }, maxRank: 2, linked: true },
    ),
  ],
  [
    spec(
      'mastery',
      'Maîtrise des illusions',
      'Illusion Mastery',
      '+4 Genjutsu par rang.',
      '+4 Genjutsu per rank.',
      { bonus: { genjutsu: 4 }, maxRank: 2, linked: true },
    ),
    spec(
      'clarity',
      'Clarté absolue',
      'Absolute Clarity',
      '+2 Genjutsu et +2 Médecine par rang.',
      '+2 Genjutsu and +2 Medicine per rank.',
      { bonus: { genjutsu: 2, medicine: 2 }, maxRank: 2 },
    ),
    spec(
      'sanctuary',
      'Sanctuaire mental',
      'Mental Sanctuary',
      '+10 PV maximum.',
      '+10 maximum HP.',
      { bonus: { maxHp: 10 }, maxRank: 1, linked: true },
    ),
  ],
]);

const MEDICINE = buildBranch('medicine', [
  [
    spec('hands', 'Mains sûres', 'Steady Hands', '+2 Médecine par rang.', '+2 Medicine per rank.', {
      bonus: { medicine: 2 },
    }),
    spec(
      'pulse',
      'Pouls régulier',
      'Steady Pulse',
      '+5 PV maximum par rang.',
      '+5 maximum HP per rank.',
      { bonus: { maxHp: 5 } },
    ),
    spec('care', 'Premiers soins', 'First Aid', '+2 à tous les soins.', '+2 to all healing.', {
      effect: 'steady_hands',
    }),
  ],
  [
    spec(
      'regen',
      'Régénération',
      'Regeneration',
      'Récupérez 3 PV au début de chaque tour.',
      'Recover 3 HP at the beginning of each turn.',
      { effect: 'boosted_regen', linked: true },
    ),
    spec(
      'triage',
      'Triage',
      'Triage',
      'Le premier soin du combat restaure 5 PV supplémentaires.',
      'The first healing of combat restores 5 additional HP.',
      { effect: 'triage_focus' },
    ),
    spec(
      'bastion',
      'Peau réparée',
      'Mended Skin',
      '+8 PV maximum par rang.',
      '+8 maximum HP per rank.',
      { bonus: { maxHp: 8 }, maxRank: 2, linked: true },
    ),
  ],
  [
    spec(
      'bond',
      'Lien vital',
      'Vital Bond',
      'Chaque soin donne 1 Armure, jusqu’à 3 fois par combat.',
      'Each heal grants 1 Armor, up to 3 times per combat.',
      { effect: 'blood_bond', linked: true },
    ),
    spec(
      'surgeon',
      'Toxine virulente',
      'Virulent Toxin',
      'Le poison inflige +2 PV par tour.',
      'Poison deals +2 HP per turn.',
      { effect: 'virulent_toxin' },
    ),
    spec(
      'overflow',
      'Débordement vital',
      'Vital Overflow',
      '50 % du soin excédentaire est converti en Armure, jusqu’à 3.',
      '50% of overhealing is converted to Armor, up to 3.',
      { effect: 'vital_overflow', linked: true },
    ),
  ],
  [
    spec(
      'purify',
      'Purification',
      'Purification',
      'Au début du combat, retire un malus.',
      'At combat start, remove one debuff.',
      { effect: 'purify', linked: true },
    ),
    spec(
      'guard',
      'Protection du guérisseur',
      'Healer Guard',
      '+3 Médecine par rang.',
      '+3 Medicine per rank.',
      { bonus: { medicine: 3 } },
    ),
    spec(
      'last_stand',
      'Dernier rempart',
      'Last Stand',
      'Sous 20 % de PV, le premier soin du combat est doublé.',
      'Below 20% HP, the first healing of combat is doubled.',
      { effect: 'last_stand_heal', linked: true },
    ),
  ],
  [
    spec(
      'medicine_mastery',
      'Maîtrise médicale',
      'Medical Mastery',
      '+3 Médecine par rang.',
      '+3 Medicine per rank.',
      { bonus: { medicine: 3 }, linked: true },
    ),
    spec(
      'constitution',
      'Constitution',
      'Constitution',
      '+8 PV maximum par rang.',
      '+8 maximum HP per rank.',
      { bonus: { maxHp: 8 }, maxRank: 2 },
    ),
    spec(
      'balance',
      'Équilibre du soigneur',
      'Healer Balance',
      '+2 Médecine et +2 Genjutsu par rang.',
      '+2 Medicine and +2 Genjutsu per rank.',
      { bonus: { medicine: 2, genjutsu: 2 }, maxRank: 2, linked: true },
    ),
  ],
  [
    spec(
      'expert',
      'Expertise de soin',
      'Healing Expertise',
      '+4 Médecine par rang.',
      '+4 Medicine per rank.',
      { bonus: { medicine: 4 }, maxRank: 2, linked: true },
    ),
    spec('survival', 'Survie assurée', 'Assured Survival', '+10 PV maximum.', '+10 maximum HP.', {
      bonus: { maxHp: 10 },
      maxRank: 1,
    }),
    spec(
      'universal',
      'Médecine universelle',
      'Universal Medicine',
      '+2 Médecine et +2 PV maximum par rang.',
      '+2 Medicine and +2 maximum HP per rank.',
      { bonus: { medicine: 2, maxHp: 2 }, maxRank: 2, linked: true },
    ),
  ],
]);

export const TALENT_NODE_DEFS = [...TAIJUTSU, ...NINJUTSU, ...GENJUTSU, ...MEDICINE];
