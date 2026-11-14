/**
 * Helpers pour définir des cartes catalogue de façon compacte et cohérente.
 */

const STAT_LABELS_FR = {
  taijutsu: 'Taijutsu',
  ninjutsu: 'Ninjutsu',
  genjutsu: 'Genjutsu',
  medicine: 'Médecine',
  dexterity: 'Dextérité',
  vitesse: 'Vitesse',
  intelligence: 'Intelligence',
  maxHp: 'PV max',
  force: 'Force',
};

const STAT_LABELS_EN = {
  taijutsu: 'Taijutsu',
  ninjutsu: 'Ninjutsu',
  genjutsu: 'Genjutsu',
  medicine: 'Medicine',
  dexterity: 'Dexterity',
  vitesse: 'Speed',
  intelligence: 'Intelligence',
  maxHp: 'max HP',
  force: 'Strength',
};

export function formatPassiveFr(passive = {}) {
  const parts = Object.entries(passive).map(([k, v]) => {
    const label = STAT_LABELS_FR[k] || k;
    return `+${v} ${label}`;
  });
  return parts.length ? `Bonus passif : ${parts.join(', ')}` : 'Bonus passif : aucun';
}

export function formatPassiveEn(passive = {}) {
  const parts = Object.entries(passive).map(([k, v]) => {
    const label = STAT_LABELS_EN[k] || k;
    return `+${v} ${label}`;
  });
  return parts.length ? `Passive: ${parts.join(', ')}` : 'Passive: none';
}

/**
 * Définition compacte → objet seed upsertCardDefinition.
 */
export function defineCard({
  slug,
  nameFr,
  nameEn,
  type,
  statType,
  element = null,
  rarity = 'common',
  cost = 0,
  damage = 0,
  block = 0,
  heal = 0,
  effects = [],
  summon = null,
  exhaust = false,
  passive = {},
  descriptionFr,
  descriptionEn,
  loreFr = null,
  loreEn = null,
  upgrades = {},
  upgradable = true,
}) {
  if (!slug || !nameFr || !nameEn || !type || !statType || !rarity) {
    throw new Error(`defineCard incomplete: ${slug || '?'}`);
  }
  if (!descriptionFr || !descriptionEn) {
    throw new Error(`defineCard missing descriptions: ${slug}`);
  }

  return {
    slug,
    nameFr,
    nameEn,
    type,
    statType,
    element,
    rarity,
    baseCost: cost,
    baseDamage: damage,
    baseBlock: block,
    baseHeal: heal,
    effects,
    summon: summon || undefined,
    exhaust: Boolean(exhaust),
    passiveBonus: passive,
    passiveDescriptionFr: formatPassiveFr(passive),
    passiveDescriptionEn: formatPassiveEn(passive),
    descriptionFr,
    descriptionEn,
    loreFr,
    loreEn,
    upgradable,
    upgradeBonuses: {
      level_1: upgrades.level_1 || {},
      level_2: upgrades.level_2 || {},
    },
  };
}

/** Résumé type / rareté / élément pour logs & tests. */
export function summarizeCatalog(cards) {
  const byType = {};
  const byRarity = {};
  const byElement = {};
  for (const c of cards) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1;
    const el = c.element == null ? 'null' : c.element;
    byElement[el] = (byElement[el] || 0) + 1;
  }
  return { total: cards.length, byType, byRarity, byElement };
}

const FORBIDDEN_NAME_RE =
  /\b(rasengan|sharingan|byakugan|rinnegan|chidori|raikiri|amaterasu|tsukuyomi|susanoo|kawarimi|konoha|akatsuki|uchiha|uchiwa|uzumaki|senju|hyuga|sarutobi|akimichi|yamanaka|hatake|kakashi|naruto|sasuke|sakura|jiraiya|tsunade|orochimaru|madara|itachi|gaara|gamabunta|hokage|kazekage|mizukage|raikage|tsuchikage|jinch[uū]+riki|no\s+kuni|kage\s*bunshin|shadow\s*clone\s*jutsu|chakra\s*scalpel|scalpel\s+de\s+chakra|soldier\s*pill|pilule\s+du\s+soldat|sand\s*tomb|tombeau\s+de\s+sable)\b/i;

export function assertOriginalNaming(cards) {
  const hits = [];
  for (const c of cards) {
    const blob = [c.slug, c.nameFr, c.nameEn, c.loreFr, c.loreEn, c.descriptionFr, c.descriptionEn]
      .filter(Boolean)
      .join(' ');
    if (FORBIDDEN_NAME_RE.test(blob)) hits.push(c.slug);
  }
  if (hits.length) {
    throw new Error(`Forbidden franchise refs in cards: ${hits.join(', ')}`);
  }
}

export function assertUniqueSlugs(cards) {
  const seen = new Set();
  const dupes = [];
  for (const c of cards) {
    if (seen.has(c.slug)) dupes.push(c.slug);
    seen.add(c.slug);
  }
  if (dupes.length) throw new Error(`Duplicate slugs: ${dupes.join(', ')}`);
}
