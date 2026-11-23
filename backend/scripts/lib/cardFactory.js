/**
 * Helpers pour définir des cartes catalogue de façon compacte et cohérente.
 * Arts combat : taijutsu / ninjutsu / genjutsu / medicine (plus de Vit/Int).
 */
import {
  deriveCritChance,
  normalizeArtKey,
  remapAbandonedPassives,
} from '../../src/services/deckCombat/combatArts.js';

const STAT_LABELS_FR = {
  taijutsu: 'Taijutsu',
  ninjutsu: 'Ninjutsu',
  genjutsu: 'Genjutsu',
  medicine: 'Médecine',
  maxHp: 'PV max',
  maxChakra: 'Chakra max',
  startingBlock: 'Armure de départ',
};

const PASSIVE_BUDGETS = {
  common: [0, 5],
  rare: [5, 10],
  legendary: [10, 15],
  mythic: [15, 20],
};
const ART_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const STAT_LABELS_EN = {
  taijutsu: 'Taijutsu',
  ninjutsu: 'Ninjutsu',
  genjutsu: 'Genjutsu',
  medicine: 'Medicine',
  maxHp: 'max HP',
  maxChakra: 'max Chakra',
  startingBlock: 'Starting armor',
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

function trimPassiveToTotal(passive, target, preferredArt) {
  const next = { ...(passive || {}) };
  const total = ART_KEYS.reduce((sum, key) => sum + Math.max(0, Number(next[key]) || 0), 0);
  if (total < target) {
    const art = ART_KEYS.includes(preferredArt) ? preferredArt : 'medicine';
    next[art] = (Number(next[art]) || 0) + (target - total);
    return next;
  }
  if (total <= target) return next;

  let overflow = total - target;
  for (const key of [...ART_KEYS].reverse()) {
    const removable = Math.min(Math.max(0, Number(next[key]) || 0), overflow);
    if (removable > 0) next[key] = Number(next[key]) - removable;
    overflow -= removable;
    if (overflow === 0) break;
  }
  return next;
}

function normalizePassiveBudgets(passive, upgrades, { rarity, statType }) {
  const [min, max] = PASSIVE_BUDGETS[rarity] || PASSIVE_BUDGETS.common;
  const preferredArt = ART_KEYS.includes(statType)
    ? statType
    : ART_KEYS.reduce(
        (best, key) => ((Number(passive[key]) || 0) > (Number(passive[best]) || 0) ? key : best),
        'medicine'
      );
  const baseTotal = ART_KEYS.reduce((sum, key) => sum + Math.max(0, Number(passive[key]) || 0), 0);
  const baseTarget = baseTotal < min ? min : Math.min(max, baseTotal);
  const safeBase = trimPassiveToTotal(passive, baseTarget, preferredArt);
  const base = ART_KEYS.reduce((sum, key) => sum + Math.max(0, Number(safeBase[key]) || 0), 0);
  const normalizedUpgrades = {};

  for (const levelKey of ['level_1', 'level_2']) {
    const original = upgrades[levelKey] || {};
    const passiveBonus = { ...(original.passive || {}) };
    const bonusTotal = ART_KEYS.reduce(
      (sum, key) => sum + Math.max(0, Number(passiveBonus[key]) || 0),
      0
    );
    const allowedBonus = Math.max(min - base, Math.min(max - base, bonusTotal));
    const normalizedBonus = trimPassiveToTotal(passiveBonus, allowedBonus, preferredArt);
    for (const key of ART_KEYS) {
      const value = Math.max(0, Number(normalizedBonus[key]) || 0);
      if (value > 0) passiveBonus[key] = value;
      else delete passiveBonus[key];
    }
    normalizedUpgrades[levelKey] = { ...original, passive: passiveBonus };
  }
  return { passive: safeBase, upgrades: normalizedUpgrades, base };
}

function remapUpgradePassives(upgrades, { statType }) {
  const out = {};
  for (const [levelKey, bonus] of Object.entries(upgrades || {})) {
    if (!bonus || typeof bonus !== 'object') {
      out[levelKey] = bonus;
      continue;
    }
    const next = { ...bonus };
    if (bonus.passive && typeof bonus.passive === 'object') {
      next.passive = remapAbandonedPassives(bonus.passive, { statType });
    }
    out[levelKey] = next;
  }
  return out;
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
  heldEffect = null,
  summon = null,
  exhaust = false,
  passive = {},
  critChance = null,
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

  const isCommonCard = type === 'item' || type === 'summon' || slug.startsWith('clan-');
  const requestedPrimary = normalizeArtKey(statType) || String(statType).toLowerCase();
  const primary = isCommonCard ? 'common' : requestedPrimary;
  const passiveBefore = { ...(passive || {}) };
  const resolvedCrit = deriveCritChance({
    critChance,
    passiveBeforeRemap: passiveBefore,
    type,
    damage,
  });
  const remappedPassive = remapAbandonedPassives(passiveBefore, {
    statType: primary,
  });
  const remappedUpgrades = remapUpgradePassives(upgrades, {
    statType: primary,
  });
  const normalized = normalizePassiveBudgets(remappedPassive, remappedUpgrades, {
    rarity,
    statType: primary,
  });

  return {
    slug,
    nameFr,
    nameEn,
    type,
    statType: primary,
    element,
    rarity,
    baseCost: cost,
    baseDamage: damage,
    baseBlock: block,
    baseHeal: heal,
    effects,
    heldEffect,
    summon: summon || undefined,
    exhaust: Boolean(exhaust),
    critChance: resolvedCrit,
    passiveBonus: normalized.passive,
    passiveDescriptionFr: formatPassiveFr(normalized.passive),
    passiveDescriptionEn: formatPassiveEn(normalized.passive),
    descriptionFr,
    descriptionEn,
    loreFr,
    loreEn,
    upgradable,
    upgradeBonuses: {
      level_1: normalized.upgrades.level_1 || {},
      level_2: normalized.upgrades.level_2 || {},
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
