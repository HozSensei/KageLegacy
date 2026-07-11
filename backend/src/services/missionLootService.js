import { randomInt } from 'node:crypto';
import { query } from '../config/database.js';
import { createNinja, findNinjasByUserId, loadGlobalIdentityKeySet } from '../models/ninja.js';
import { clampStatToGradeCap } from './gradeProgression.js';
import { generateNinjaProfile } from './ninjaGenerator.js';
import { collectIdentityKeys } from './ninjaNaming.js';
import {
  MISSION_TIERS,
  getRiskPenalties,
  meetsTierRequirement,
  rollPercent,
} from './missionRules.js';
import { createSenseiNotification } from './senseiNotifications.js';
import { buildMissionReportPayload } from './missionNarrative.js';
import { getUserLanguage } from './narrative/viewerLocale.js';
import { grantItemToUser } from './itemGrantService.js';
import { grantRandomTacticCard } from './tacticCards/tacticCardService.js';

const STAT_COLUMNS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine', 'vitesse', 'intelligence'];

function rollRoutineLoot() {
  const roll = rollPercent();
  if (roll <= 10) {
    return {
      lootTier: 'bonus',
      items: [{ slug: 'pansement-terrain', quantity: 1 }],
      narrative: 'pansement',
    };
  }
  if (roll <= 14) {
    return {
      lootTier: 'common',
      tacticCard: { rarity: 'common' },
      narrative: 'tactic_card',
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

  if (roll <= 60) return { lootTier: 'none', items: [], narrative: 'empty_chests' };
  if (roll <= 90) {
    return {
      lootTier: 'common',
      items: [{ slug: 'kit-materiel-medical', quantity: 1 }],
      narrative: 'medical_kit',
    };
  }
  if (roll <= 95) {
    return {
      lootTier: 'rare',
      tacticCard: { rarity: 'common' },
      narrative: 'tactic_card',
    };
  }
  return {
    lootTier: 'rare',
    items: [{ slug: 'fumigene-secours', quantity: 1 }],
    narrative: 'smoke_bomb',
  };
}

function rollCycloneRareConsumable() {
  return rollPercent() <= 50
    ? { slug: 'cachet-chakra', quantity: 1 }
    : { slug: 'livre-strategie', quantity: 1 };
}

function rollCycloneLoot() {
  const roll = rollPercent();
  if (roll <= 50) return { lootTier: 'none', items: [], narrative: 'search_failed' };
  if (roll <= 85) {
    return {
      lootTier: 'common',
      items: [{ slug: 'kit-materiel-medical', quantity: 2 }],
      narrative: 'double_medical',
    };
  }
  if (roll <= 92) {
    return {
      lootTier: 'rare',
      tacticCard: { rarity: 'rare' },
      narrative: 'tactic_card_rare',
    };
  }
  if (roll <= 97) {
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

function rollInjury(tier, ninja) {
  const config = MISSION_TIERS[tier];
  const underQualified = !meetsTierRequirement(tier, ninja);
  const penalties = getRiskPenalties(tier, ninja);

  if (tier === 'cyclone') {
    if (Math.random() < config.deathChance) return 'death';
    const graveChance =
      config.graveInjuryChance + (underQualified ? penalties.graveBonus : 0);
    if (Math.random() < graveChance) return 'grave';
    return 'none';
  }

  if (tier === 'infiltration' && Math.random() < config.lightInjuryChance) {
    return 'light';
  }

  return 'none';
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
  const config = MISSION_TIERS[tier];
  if (tier === 'routine' || tier === 'infiltration') {
    return randomInt(config.baseRewardMin, config.baseRewardMax + 1);
  }
  return config.baseReward;
}

export async function resolveMissionOutcome(mission, ninja) {
  const tier = mission.mission_tier;
  const injuryType = rollInjury(tier, ninja);
  const baseRyos = injuryType === 'death' ? 0 : rollBaseRyos(tier);

  let loot = { lootTier: 'none', items: [], narrative: 'none' };
  if (injuryType !== 'death') {
    if (tier === 'routine') loot = rollRoutineLoot();
    else if (tier === 'infiltration') loot = rollInfiltrationLoot(ninja);
    else if (tier === 'cyclone') loot = rollCycloneLoot();
  }

  const lootResult = {
    baseRyos,
    ...loot,
    injuryType,
    underQualified: !meetsTierRequirement(tier, ninja),
  };

  if (injuryType !== 'death' && loot.prodige) {
    lootResult.prodige = await recruitMissionProdige(mission.user_id);
  }

  if (injuryType !== 'death' && loot.tacticCard) {
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
  });
  await createSenseiNotification(mission.user_id, 'mission_report', reportPayload);

  return { missionId: mission.id, status, lootResult };
}

export async function grantLootOnCollect(userId, mission) {
  const loot =
    typeof mission.loot_result === 'string'
      ? JSON.parse(mission.loot_result)
      : mission.loot_result;
  if (!loot) return { items: [], scroll: null };

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

  return { items: grantedItems, scroll: loot.scrollApplied ?? null, prodige: loot.prodige ?? null, tacticCard: loot.tacticCard ?? null };
}

export async function decrementFormeLocksForAllUsers() {
  await query(
    `UPDATE ninjas
     SET forme_lock_cycles = GREATEST(0, forme_lock_cycles - 1)
     WHERE forme_lock_cycles > 0`
  );
}
