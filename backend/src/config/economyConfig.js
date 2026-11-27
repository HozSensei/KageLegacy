/**
 * Économie centrale — Kagekuni V2
 *
 * Source unique des constantes tunables (boosters, combat, dust, Battle Pass).
 * Les services doivent importer ici plutôt que hardcoder des montants.
 *
 * Principes F2P (voir docs/PROGRESSION.md) :
 * - Progression gratuite viable via missions + dust
 * - Premium (Kage Coins / BP) accélère, ne gate pas la puissance
 * - Sinks (boosters, upgrades) > sources pour éviter l’inflation
 */

/** @typedef {'D'|'C'|'B'|'A'|'S'} MissionRank */

// ---------------------------------------------------------------------------
// Boosters (shop)
// ---------------------------------------------------------------------------

/**
 * Coûts d’ouverture. Les taux de rareté restent dans boosterService
 * (poids de tirage ≠ économie monétaire).
 */
export const BOOSTER_COSTS = Object.freeze({
  /** Pack F2P de base — ~2 victoires rang D. */
  standard: Object.freeze({ ryos: 300, kageCoins: 0 }),
  /** Pack ciblé par voie (Tai / Nin / Gen / Médecine). */
  path: Object.freeze({ ryos: 550, kageCoins: 0 }),
  /** Pack ciblé élément — premium soft en Ryos. */
  elemental: Object.freeze({ ryos: 650, kageCoins: 0 }),
  /** Accélération payante — Kage Coins only (pas de Ryos). */
  premium: Object.freeze({ ryos: 0, kageCoins: 100 }),
  /** Tier KC intermédiaire — 1 légendaire+ garantie, +2 cartes. */
  elite: Object.freeze({ ryos: 0, kageCoins: 250 }),
  /** Tier KC haut — 1 légendaire+ garantie, +5 cartes. */
  ascendant: Object.freeze({ ryos: 0, kageCoins: 500 }),
});

export const BOOSTER_CARD_COUNT = 5;

/** Cartes par type (base 5 ; elite/ascendant plus généreux). */
export const BOOSTER_CARD_COUNTS = Object.freeze({
  standard: BOOSTER_CARD_COUNT,
  path: BOOSTER_CARD_COUNT,
  elemental: BOOSTER_CARD_COUNT,
  premium: BOOSTER_CARD_COUNT,
  /** 5 + 2 cartes supplémentaires. */
  elite: BOOSTER_CARD_COUNT + 2,
  /** 5 + 5 cartes supplémentaires. */
  ascendant: BOOSTER_CARD_COUNT + 5,
});

export const PATH_BOOSTER_STAT_TYPES = Object.freeze([
  'taijutsu',
  'ninjutsu',
  'genjutsu',
  'medicine',
]);

/**
 * Ryos accordés à la création de compte (register / guest).
 * 1400 ≈ 2 packs voie (550) + marge — compense un starter Normal-only.
 */
export const STARTING_RYOS = 1400;

// ---------------------------------------------------------------------------
// Combat / missions deck (récompenses de victoire)
// ---------------------------------------------------------------------------

/** Montant provisoire par membre éligible du village vainqueur de la semaine. */
export const ASYNC_DUEL_WEEKLY_VILLAGE_REWARD_RYOS = 50;

/** Fallback si mission sans rewards_json. */
export const COMBAT_DEFAULT_REWARDS = Object.freeze({
  xp: 40,
  ryos: 100,
  cardChance: 12,
  /** XP Battle Pass (aligné design : ~50 / combat générique). */
  bpPoints: 50,
});

/** Multiplicateur de fin de parcours (mission runs) — hors structure des nœuds. */
export const COMBAT_RUN_BONUS_MULT_DEFAULT = 1.8;

/** Missions coop : multiplicateur de récompenses = COOP_REWARD_MULT (coopMissionConfig). */

/**
 * Cibles par rang (utilisées comme plancher runtime + seeds).
 * bpPoints calés sur docs/PROGRESSION.md (100–500 selon rang).
 */
export const COMBAT_REWARDS_BY_RANK = Object.freeze({
  D: Object.freeze({ xp: 50, ryos: 150, cardChance: 12, bpPoints: 100 }),
  C: Object.freeze({ xp: 90, ryos: 280, cardChance: 16, bpPoints: 200 }),
  B: Object.freeze({ xp: 160, ryos: 520, cardChance: 22, bpPoints: 350 }),
  A: Object.freeze({ xp: 260, ryos: 850, cardChance: 30, bpPoints: 500 }),
  S: Object.freeze({ xp: 320, ryos: 1100, cardChance: 35, bpPoints: 600 }),
});

// ---------------------------------------------------------------------------
// Dust / upgrade
// ---------------------------------------------------------------------------

/** Dust rendu au désenchantement (1 exemplaire niveau 0). */
export const DISENCHANT_DUST = Object.freeze({
  common: 10,
  rare: 40,
  legendary: 200,
  mythic: 1000,
});

/**
 * Coûts d’upgrade par rareté : index 0 = niveau 1, index 1 = niveau 2.
 * Early-game assoupli (common L1) ; haut de gamme reste un sink lourd.
 */
export const UPGRADE_COSTS = Object.freeze({
  common: Object.freeze([
    Object.freeze({ ryos: 300, dust: 15, essence: 0 }),
    Object.freeze({ ryos: 1500, dust: 80, essence: 0 }),
  ]),
  rare: Object.freeze([
    Object.freeze({ ryos: 1200, dust: 80, essence: 0 }),
    Object.freeze({ ryos: 5000, dust: 400, essence: 0 }),
  ]),
  legendary: Object.freeze([
    Object.freeze({ ryos: 4500, dust: 400, essence: 0 }),
    Object.freeze({ ryos: 18000, dust: 1800, essence: 10 }),
  ]),
  mythic: Object.freeze([Object.freeze({ ryos: 18000, dust: 1800, essence: 20 })]),
});

// ---------------------------------------------------------------------------
// Battle Pass
// ---------------------------------------------------------------------------

export const BATTLE_PASS = Object.freeze({
  /** Déblocage piste premium (≈ 5 € pack). */
  premiumCostKageCoins: 500,
  /** Achat de niveaux (rattrapage late season, gate niveau 30). */
  levelCostKageCoins: 150,
  maxPurchasableLevels: 20,
  buyLevelsMinLevel: 30,
  /** Accélération soft — pas de double XP pay-to-win. */
  premiumXpMultiplier: 1.2,
  /** Base XP / niveau (progressive +50 / 10 niv. dans getXPForLevel). */
  baseXpPerLevel: 1000,
  xpTierBump: 50,
  xpTierSize: 10,
  maxLevel: 50,
  /** Caps design (tests). */
  maxPremiumXpMultiplier: 1.25,
  /** Durée d’une saison auto-générée (jours UTC). */
  seasonDurationDays: 90,
});

/** Pack bienvenue one-shot (Stripe / stub). */
export const WELCOME_PACK = Object.freeze({
  id: 'welcome',
  priceEur: 5,
  /** Repli si aucune saison BP active au fulfillment. */
  fallbackKageCoins: 500,
  boosterType: 'standard',
  /** Deux parchemins : ~valeur d’un pack KC 1 € ×2 en plus du BP. */
  boosterCount: 2,
  nicknameId: 'welcome',
});

/** Quêtes BP — montants XP de référence (seeds / doc). */
export const BATTLE_PASS_QUEST_XP = Object.freeze({
  daily: 200,
  weekly: 1000,
  milestone: 5000,
});

// ---------------------------------------------------------------------------
// Helpers / invariants
// ---------------------------------------------------------------------------

/**
 * Nombre de victoires rang `rank` pour un booster standard (arrondi haut).
 * @param {MissionRank} [rank='D']
 */
export function winsForStandardBooster(rank = 'D') {
  const ryos = COMBAT_REWARDS_BY_RANK[rank]?.ryos;
  const cost = BOOSTER_COSTS.standard.ryos;
  if (!ryos || !cost) return null;
  return Math.ceil(cost / ryos);
}

/**
 * Fusionne rewards mission avec défauts + plancher bpPoints du rang.
 * @param {object|null} parsed
 * @param {string|null} rank
 */
export function resolveCombatRewards(parsed, rank = null) {
  const rankKey = rank && COMBAT_REWARDS_BY_RANK[rank] ? rank : null;
  const floor = rankKey ? COMBAT_REWARDS_BY_RANK[rankKey] : null;
  const base = floor || COMBAT_DEFAULT_REWARDS;
  const src = parsed && typeof parsed === 'object' ? parsed : {};

  let xp = Number(src.xp) > 0 ? Number(src.xp) : base.xp;
  let ryos = Number(src.ryos) > 0 ? Number(src.ryos) : base.ryos;
  let cardChance =
    src.cardChance != null && Number.isFinite(Number(src.cardChance))
      ? Number(src.cardChance)
      : base.cardChance;
  let bpPoints = Number(src.bpPoints) || 0;

  if (floor) {
    xp = Math.max(xp, floor.xp);
    ryos = Math.max(ryos, floor.ryos);
    cardChance = Math.max(cardChance, floor.cardChance);
    bpPoints = Math.max(bpPoints, floor.bpPoints);
  } else if (!bpPoints) {
    bpPoints = COMBAT_DEFAULT_REWARDS.bpPoints;
  }

  return { xp, ryos, cardChance, bpPoints };
}

/**
 * Vérifie les invariants F2P. Retourne { ok, errors[] }.
 * Utilisé par les tests de verrouillage.
 */
export function validateEconomyInvariants() {
  const errors = [];

  // Boosters
  if (BOOSTER_COSTS.standard.ryos <= 0) errors.push('standard booster must cost ryos');
  if (BOOSTER_COSTS.path.ryos <= BOOSTER_COSTS.standard.ryos) {
    errors.push('path must cost more ryos than standard');
  }
  if (BOOSTER_COSTS.elemental.ryos < BOOSTER_COSTS.path.ryos) {
    errors.push('elemental must cost at least as much as path');
  }
  if (BOOSTER_COSTS.premium.ryos !== 0 || BOOSTER_COSTS.premium.kageCoins <= 0) {
    errors.push('premium booster must be kageCoins-only');
  }
  if (BOOSTER_COSTS.elite.ryos !== 0 || BOOSTER_COSTS.elite.kageCoins <= BOOSTER_COSTS.premium.kageCoins) {
    errors.push('elite booster must be kageCoins-only and cost more than premium');
  }
  if (
    BOOSTER_COSTS.ascendant.ryos !== 0 ||
    BOOSTER_COSTS.ascendant.kageCoins <= BOOSTER_COSTS.elite.kageCoins
  ) {
    errors.push('ascendant booster must be kageCoins-only and cost more than elite');
  }
  if (BOOSTER_CARD_COUNTS.elite !== BOOSTER_CARD_COUNT + 2) {
    errors.push('elite pack should grant 2 extra cards');
  }
  if (BOOSTER_CARD_COUNTS.ascendant !== BOOSTER_CARD_COUNT + 5) {
    errors.push('ascendant pack should grant 5 extra cards');
  }
  if (
    BOOSTER_COSTS.standard.kageCoins !== 0 ||
    BOOSTER_COSTS.path.kageCoins !== 0 ||
    BOOSTER_COSTS.elemental.kageCoins !== 0
  ) {
    errors.push('F2P boosters must not require kageCoins');
  }
  if (!Number.isFinite(WELCOME_PACK.boosterCount) || WELCOME_PACK.boosterCount < 1) {
    errors.push('welcome pack must grant at least 1 booster');
  }

  // ~3 wins D pour 1 pack standard
  const dWins = winsForStandardBooster('D');
  if (dWins == null || dWins < 2 || dWins > 4) {
    errors.push(`standard pack should cost 2–4 D wins (got ${dWins})`);
  }

  if (!Number.isFinite(STARTING_RYOS) || STARTING_RYOS < 0) {
    errors.push('STARTING_RYOS must be a non-negative number');
  }
  // Budget départ : ~2 packs voie (+ marge d’un standard).
  const startingPackBudget = BOOSTER_COSTS.path.ryos * 2 + BOOSTER_COSTS.standard.ryos;
  if (STARTING_RYOS > startingPackBudget) {
    errors.push(`STARTING_RYOS should be ≤ 2 path packs + 1 standard (${startingPackBudget})`);
  }

  // BP soft premium
  if (BATTLE_PASS.premiumXpMultiplier > BATTLE_PASS.maxPremiumXpMultiplier) {
    errors.push('premium XP multiplier too high (P2W)');
  }
  if (BATTLE_PASS.premiumXpMultiplier < 1) {
    errors.push('premium XP multiplier must be ≥ 1');
  }
  if (BATTLE_PASS.premiumCostKageCoins > 500) {
    errors.push('premium BP cost should stay ≤ 500 KC');
  }

  // Combat floors progressifs
  const ranks = ['D', 'C', 'B', 'A'];
  for (let i = 1; i < ranks.length; i += 1) {
    const prev = COMBAT_REWARDS_BY_RANK[ranks[i - 1]];
    const cur = COMBAT_REWARDS_BY_RANK[ranks[i]];
    if (cur.ryos <= prev.ryos || cur.xp <= prev.xp || cur.bpPoints <= prev.bpPoints) {
      errors.push(`rank ${ranks[i]} rewards must exceed ${ranks[i - 1]}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export default {
  BOOSTER_COSTS,
  BOOSTER_CARD_COUNT,
  BOOSTER_CARD_COUNTS,
  PATH_BOOSTER_STAT_TYPES,
  STARTING_RYOS,
  COMBAT_DEFAULT_REWARDS,
  COMBAT_REWARDS_BY_RANK,
  DISENCHANT_DUST,
  UPGRADE_COSTS,
  BATTLE_PASS,
  BATTLE_PASS_QUEST_XP,
  WELCOME_PACK,
  winsForStandardBooster,
  resolveCombatRewards,
  validateEconomyInvariants,
};
