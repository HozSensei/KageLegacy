import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { createNinja, findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { clampStatToGradeCap, isStatAtGradeCap } from './gradeProgression.js';
import { generateNinjaProfile } from './ninjaGenerator.js';
import { collectIdentityKeys } from './ninjaNaming.js';
import {
  MISSION_TIERS,
  computeMissionOddsForTier,
  getMissionTierConfig,
  narrativeTierKey,
  normalizeMissionTier,
  rollPercent,
} from './missionRules.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { recordCycleObjectiveEvent } from './cycleObjectiveService.js';
import { recordVillageScore } from './villageService.js';
import { buildMissionReportPayload } from './missionNarrative.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { grantItemToUser } from './itemGrantService.js';
import { grantRandomTacticCard } from './tacticCards/tacticCardService.js';

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

function rollRoutineLoot() {
  const roll = rollPercent();
  if (roll <= 20) {
    return {
      lootTier: 'bonus',
      items: [{ slug: 'pansement-terrain', quantity: 1 }],
      narrative: 'pansement',
    };
  }
  if (roll <= 32) {
    return {
      lootTier: 'common',
      tacticCard: { rarity: 'common' },
      narrative: 'tactic_card',
    };
  }
  if (roll <= 45) {
    return {
      lootTier: 'common',
      items: [{ slug: 'kit-materiel-medical', quantity: 1 }],
      narrative: 'medical_kit',
    };
  }
  return { lootTier: 'none', items: [], narrative: 'empty' };
}

function rollInfiltrationLoot(ninja) {
  const stats = {
    intelligence: ninja.intelligence,
    vitesse: ninja.vitesse,
  };
  const teamBonus = stats.intelligence + stats.vitesse >= 18 ? 5 : 0;
  const roll = rollPercent() - teamBonus;

  if (roll <= 40) return { lootTier: 'none', items: [], narrative: 'empty_chests' };
  if (roll <= 80) {
    return {
      lootTier: 'common',
      items: [{ slug: 'kit-materiel-medical', quantity: 1 }],
      narrative: 'medical_kit',
    };
  }
  if (roll <= 92) {
    return {
      lootTier: 'rare',
      tacticCard: { rarity: 'common' },
      narrative: 'tactic_card',
    };
  }
  return {
    lootTier: 'rare',
    items: [{ slug: 'bandage-rapide', quantity: 1 }],
    narrative: 'quick_bandage',
  };
}

function rollCycloneRareConsumable() {
  return rollPercent() <= 50
    ? { slug: 'livre-strategie', quantity: 1 }
    : { slug: 'pilule-recuperation', quantity: 1 };
}

function rollCycloneLoot() {
  const roll = rollPercent();
  if (roll <= 30) return { lootTier: 'none', items: [], narrative: 'search_failed' };
  if (roll <= 75) {
    return {
      lootTier: 'common',
      items: [{ slug: 'kit-materiel-medical', quantity: 2 }],
      narrative: 'double_medical',
    };
  }
  if (roll <= 87) {
    return {
      lootTier: 'rare',
      tacticCard: { rarity: 'rare' },
      narrative: 'tactic_card_rare',
    };
  }
  if (roll <= 95) {
    return {
      lootTier: 'rare',
      items: [rollCycloneRareConsumable()],
      narrative: 'tactical_consumable',
    };
  }
  if (rollPercent() <= 40) {
    const stat = STAT_COLUMNS[randomInt(STAT_COLUMNS.length)];
    const gain = rollPercent() <= 50 ? 0.5 : 1.0;
    return {
      lootTier: 'legendary',
      items: [],
      scroll: { stat, gain },
      narrative: 'forbidden_scroll',
    };
  }
  if (rollPercent() <= 70) {
    return {
      lootTier: 'legendary',
      tacticCard: { rarity: 'legendary' },
      narrative: 'tactic_card_legendary',
    };
  }
  return {
    lootTier: 'legendary',
    prodige: true,
    narrative: 'prodigy_location',
  };
}

function rollTierLoot(tier, ninja) {
  const normalized = normalizeMissionTier(tier);
  if (normalized === 'D') return rollRoutineLoot();
  if (normalized === 'C') return rollInfiltrationLoot(ninja);
  if (normalized === 'B' || normalized === 'A') return rollCycloneLoot();
  return { lootTier: 'none', items: [], narrative: 'empty' };
}

function rollMissionSuccess(odds) {
  return rollPercent() <= odds.successChance;
}

function rollFailureInjury(tier, odds) {
  const config = getMissionTierConfig(tier);
  if (!config) return 'none';

  if (odds.deathChance > 0 && rollPercent() <= odds.deathChance) {
    return 'death';
  }

  if (odds.injuryChance > 0 && rollPercent() <= odds.injuryChance) {
    return config.injurySeverity === 'grave' ? 'grave' : 'light';
  }

  return 'none';
}

function pickMissionStatGainTarget(ninja) {
  const uncapped = STAT_COLUMNS.filter((stat) => !isStatAtGradeCap(ninja, stat));
  if (!uncapped.length) return null;
  return uncapped[randomInt(uncapped.length)];
}

/**
 * Gain de stat à la réussite — complément à l'entraînement, bonus pour le banc.
 */
export function computeMissionStatGain(ninja, tier, { isBench = true } = {}) {
  const config = getMissionTierConfig(tier);
  if (!config?.statGainOnSuccess) return null;

  const stat = pickMissionStatGainTarget(ninja);
  if (!stat) return null;

  const benchMult = isBench ? config.benchStatGainBonus : 1;
  const gain = Math.round(config.statGainOnSuccess * benchMult * 100) / 100;
  if (gain <= 0) return null;

  return { stat, gain };
}

async function applyMissionStatGain(ninjaId, statGain) {
  if (!statGain) return null;

  const rows = await query('SELECT * FROM ninjas WHERE id = ?', [ninjaId]);
  const ninja = rows[0];
  if (!ninja || !STAT_COLUMNS.includes(statGain.stat)) return null;

  const current = Number(ninja[statGain.stat]);
  const next = clampStatToGradeCap(ninja, statGain.stat, current + statGain.gain);
  const applied = Math.round((next - current) * 100) / 100;
  if (applied <= 0) return null;

  await query(`UPDATE ninjas SET ${statGain.stat} = ? WHERE id = ?`, [next, ninjaId]);
  return { stat: statGain.stat, gain: applied, ninjaId };
}

async function applyInjury(ninjaId, injuryType) {
  if (injuryType === 'none') return;
  if (injuryType === 'death') {
    await query('DELETE FROM ninjas WHERE id = ?', [ninjaId]);
    return;
  }
  if (injuryType === 'light') {
    await query('UPDATE ninjas SET weekly_forme = ? WHERE id = ?', ['Lamentable', ninjaId]);
    return;
  }
  if (injuryType === 'grave') {
    await query(
      'UPDATE ninjas SET weekly_forme = ?, forme_lock_cycles = GREATEST(forme_lock_cycles, 2) WHERE id = ?',
      ['Lamentable', ninjaId]
    );
  }
}

async function recruitMissionProdige(userId) {
  const clans = await query('SELECT * FROM clan_traits ORDER BY id');
  const existing = await findNinjasByUserId(userId);
  const globalKeys = await loadGlobalIdentityKeySet();
  const profile = await generateNinjaProfile({
    clans,
    grade: 'Genin',
    forcedPotential: 'prodige',
    forbiddenIdentityKeys: collectIdentityKeys(existing),
    forbiddenGlobalKeys: globalKeys,
  });
  const ninja = await createNinja({
    user_id: userId,
    name: profile.name,
    age: profile.age,
    grade: profile.grade,
    clan_trait_id: profile.clan_trait_id,
    element_affinity: profile.element_affinity,
    character_trait: profile.character_trait,
    trait_boost: profile.trait_boost,
    language: profile.language || 'fr',
    taijutsu: profile.taijutsu,
    ninjutsu: profile.ninjutsu,
    genjutsu: profile.genjutsu,
    medecine: profile.medecine,
    vitesse: profile.vitesse,
    intelligence: profile.intelligence,
    weekly_forme: profile.weekly_forme,
    moral: profile.moral,
    squad_position: null,
  });
  return { ninjaId: ninja.id, name: ninja.name, potential: 'prodige' };
}

export function rollBaseRyos(tier) {
  const config = getMissionTierConfig(tier);
  if (!config) return 0;
  if (config.baseRewardMin === config.baseRewardMax) {
    return config.baseRewardMin;
  }
  return randomInt(config.baseRewardMin, config.baseRewardMax + 1);
}

export async function resolveMissionOutcome(mission, ninja) {
  const tier = normalizeMissionTier(mission.mission_tier);
  const odds = computeMissionOddsForTier(ninja, tier);
  const success = rollMissionSuccess(odds);
  const injuryType = success ? 'none' : rollFailureInjury(tier, odds);
  const baseRyos = success && injuryType !== 'death' ? rollBaseRyos(tier) : 0;

  let loot = { lootTier: 'none', items: [], narrative: 'none' };
  let statGain = null;

  if (success && injuryType !== 'death') {
    loot = rollTierLoot(tier, ninja);
    statGain = computeMissionStatGain(ninja, tier, { isBench: ninja.squad_position == null });
    if (statGain) {
      statGain = await applyMissionStatGain(mission.ninja_id, statGain);
    }
  }

  const lootResult = {
    baseRyos,
    success,
    odds: {
      successChance: odds.successChance,
      injuryChance: odds.injuryChance,
      deathChance: odds.deathChance,
      ninjaRating: odds.ninjaRating,
      targetRating: odds.targetRating,
    },
    ...loot,
    injuryType,
    statGain: statGain ?? null,
  };

  if (success && injuryType !== 'death' && loot.prodige) {
    lootResult.prodige = await recruitMissionProdige(mission.user_id);
  }

  if (success && injuryType !== 'death' && loot.tacticCard) {
    lootResult.tacticCard = await grantRandomTacticCard(mission.user_id, loot.tacticCard);
  }

  await applyInjury(mission.ninja_id, injuryType);

  const status = injuryType === 'death' ? 'failed' : 'completed';
  await query(
    `UPDATE idle_missions
     SET status = ?, reward_amount = ?, loot_result = ?, injury_type = ?, resolved_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [status, baseRyos, JSON.stringify(lootResult), injuryType, mission.id]
  );

  const locale = await getUserLanguage(mission.user_id);
  const reportPayload = buildMissionReportPayload({
    missionId: mission.id,
    locale,
    tier,
    ninjaName: mission.ninja_name || ninja.name || ninja.ninja_name,
    status,
    lootResult: { ...lootResult, missionId: mission.id },
    injuryType,
    success,
  });
  await createSenseiNotification(mission.user_id, 'mission_report', reportPayload);

  if (success && injuryType !== 'death' && ['C', 'B', 'A'].includes(tier)) {
    await recordCycleObjectiveEvent(mission.user_id, 'mission_c_plus_success');
    await recordVillageScore(mission.user_id, 'mission_c_plus_success');
  }

  return { missionId: mission.id, status, lootResult };
}

export async function grantLootOnCollect(userId, mission) {
  const loot =
    typeof mission.loot_result === 'string'
      ? JSON.parse(mission.loot_result)
      : mission.loot_result;
  if (!loot) return { items: [], scroll: null, statGain: null };

  const grantedItems = [];
  for (const entry of loot.items ?? []) {
    grantedItems.push(...(await grantItemToUser(userId, entry.slug, entry.quantity ?? 1)));
  }

  if (loot.scroll && mission.ninja_id) {
    const { stat, gain } = loot.scroll;
    const rows = await query('SELECT * FROM ninjas WHERE id = ? AND user_id = ?', [
      mission.ninja_id,
      userId,
    ]);
    const ninja = rows[0];
    if (ninja && STAT_COLUMNS.includes(stat)) {
      const current = Number(ninja[stat]);
      const next = clampStatToGradeCap(ninja, stat, current + gain);
      await query(`UPDATE ninjas SET ${stat} = ? WHERE id = ?`, [next, ninja.id]);
      loot.scrollApplied = { stat, gain: next - current, ninjaId: ninja.id };
    }
  }

  return {
    items: grantedItems,
    scroll: loot.scrollApplied ?? null,
    statGain: loot.statGain ?? null,
    prodige: loot.prodige ?? null,
    tacticCard: loot.tacticCard ?? null,
  };
}

export async function decrementFormeLocksForAllUsers() {
  await query(
    `UPDATE ninjas
     SET forme_lock_cycles = GREATEST(0, forme_lock_cycles - 1)
     WHERE forme_lock_cycles > 0`
  );
}

export { narrativeTierKey, MISSION_TIERS };
