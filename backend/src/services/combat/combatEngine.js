import { randomInt } from 'node:crypto';
import {
  BASE_CHAKRA_COST,
  COMBAT_STATS,
  MAX_TOURS,
  POINTS_WIN_MARGIN,
  SENSEI_SUB_COST,
  TANK_TARGET_CHANCE,
  TEMERAIRE_CHAKRA_COST,
} from './constants.js';
import { elementDamageMultiplier } from './element.js';
import {
  getEffectiveTankTargetChance,
  healMultiplierFor,
  shouldBiasGenjutsu,
  PROTECT_GENJUTSU_BIAS,
} from './battleRoleMeta.js';
import {
  collectConsumedItemIds,
  collectEquipmentSummary,
  getCycleSpeedPenalty,
  getGenjutsuDefenseBonus,
  getElementResistBonus,
  tryConsumables,
  tryDecoyRedirect,
  tryLethalMitigation,
} from './equipment.js';
import { resolveGenjutsuDuel, resolvePhysicalDuel } from './duelResolution.js';
import {
  applyEnvironmentAttackMod,
  applyEnvironmentDefenseMod,
  getEnvironmentModifier,
  getFighterInitiativePenalty,
} from '../matchEnvironment.js';
import {
  tryTriggerTacticCard,
  recordTacticCardEvent,
} from '../tacticCards/tacticCardCombat.js';

function roll(max) {
  return randomInt(max);
}

function activeFighters(team) {
  return team.fighters.filter((f) => !f.ko && f.pv > 0 && f.chakra > 0);
}

function teamTacticalSpeed(team, tour, env) {
  return activeFighters(team).reduce((sum, f) => {
    let vitesse = f.stats.vitesse - getCycleSpeedPenalty(f);
    if (env) vitesse -= getFighterInitiativePenalty(f, env);
    if (tour === 1 && f.character_trait === 'Temeraire') vitesse += 4;
    if (f.status === 'paralysis') vitesse = 0;
    return sum + Math.max(0, vitesse) + f.stats.intelligence;
  }, 0);
}

function resolveInitiative(homeTeam, awayTeam, tour, env) {
  const homeSpeed = teamTacticalSpeed(homeTeam, tour, env);
  const awaySpeed = teamTacticalSpeed(awayTeam, tour, env);
  const total = homeSpeed + awaySpeed;

  if (total === 0) {
    const homeWins = roll(2) === 0;
    return {
      attackerTeam: homeWins ? homeTeam : awayTeam,
      defenderTeam: homeWins ? awayTeam : homeTeam,
      homeChance: 50,
      roll: roll(100),
    };
  }

  const homeChance = Math.round((homeSpeed / total) * 100);
  const rollValue = roll(100);
  const homeWins = rollValue < homeChance;

  return {
    attackerTeam: homeWins ? homeTeam : awayTeam,
    defenderTeam: homeWins ? awayTeam : homeTeam,
    homeChance,
    roll: rollValue,
  };
}

function findHealTarget(attacker, allies) {
  const designated = attacker.protect_target_ninja_id
    ? allies.find((a) => a.id === attacker.protect_target_ninja_id && !a.ko)
    : null;
  if (designated && designated.pv < designated.maxPv * 0.5) {
    return designated;
  }
  return allies
    .filter((a) => a.id !== attacker.id && !a.ko)
    .sort((a, b) => a.pv / a.maxPv - b.pv / b.maxPv)[0];
}

function pickAttacker(team) {
  const pool = activeFighters(team).filter((f) => {
    if (f.battle_strategy === 'Tank') return false;
    if (f.character_trait === 'Egoiste' && f.battle_strategy === 'Protect') return true;
    return true;
  });
  const candidates = pool.length ? pool : activeFighters(team);
  if (!candidates.length) return null;

  const offensive = candidates.filter((f) => f.battle_strategy === 'Offensive');
  if (offensive.length) {
    return offensive.sort((a, b) => maxCombatStat(b.stats) - maxCombatStat(a.stats))[0];
  }

  const healer = candidates.find((f) => {
    if (f.battle_strategy !== 'Protect' || f.stats.medecine < 6) return false;
    const allies = activeFighters(team);
    const target = findHealTarget(f, allies);
    return target && target.pv < target.maxPv * 0.5;
  });
  if (healer) {
    healer.healIntent = true;
    return healer;
  }

  return candidates[roll(candidates.length)];
}

function maxCombatStat(stats) {
  return Math.max(stats.taijutsu, stats.ninjutsu, stats.genjutsu, stats.medecine);
}

function pickDefender(defTeam, attacker) {
  const defenders = activeFighters(defTeam);
  if (!defenders.length) return { defender: null, egoisteInsubordination: false };

  let defender = null;
  const tanks = defenders.filter((d) => d.battle_strategy === 'Tank');
  let egoisteInsubordination = false;

  if (attacker.character_trait !== 'Egoiste') {
    if (
      tanks.length &&
      roll(100) < getEffectiveTankTargetChance(TANK_TARGET_CHANCE, defenders) * 100
    ) {
      defender = tanks[roll(tanks.length)];
    }
  } else if (tanks.length) {
    egoisteInsubordination = true;
  }

  if (!defender) {
    defender = defenders[roll(defenders.length)];
  }

  const redirected = tryDecoyRedirect(defender, defenders, attacker);
  return { defender: redirected || defender, egoisteInsubordination };
}

function chooseTechnique(attacker, defender) {
  if (attacker.healIntent) {
    return { type: 'medecine', stat: 'medecine' };
  }

  if (shouldBiasGenjutsu(attacker) && roll(100) < PROTECT_GENJUTSU_BIAS * 100) {
    return { type: 'genjutsu', stat: 'genjutsu' };
  }

  if (attacker.stats.intelligence >= 12) {
    const weakest = COMBAT_STATS.reduce((min, stat) =>
      defender.stats[stat] < defender.stats[min] ? stat : min
    );
    return { type: weakest, stat: weakest };
  }

  const best = COMBAT_STATS.reduce((max, stat) =>
    attacker.stats[stat] > attacker.stats[max] ? stat : max
  );
  return { type: best, stat: best };
}

function attackValue(attacker, technique, allies) {
  let value = attacker.stats[technique.stat];
  if (
    attacker.character_trait === 'Egoiste' &&
    allies.every((a) => a.id === attacker.id || a.pv < attacker.pv)
  ) {
    value += 2;
  }
  return value;
}

function resolveDuel(attacker, defender, technique, allies, env) {
  let atk = attackValue(attacker, technique, allies);
  if (env) atk += applyEnvironmentAttackMod(attacker, technique, env);
  let def = defender.stats[technique.stat];
  if (env) def += applyEnvironmentDefenseMod(defender, env);
  if (technique.type === 'genjutsu') {
    def += getGenjutsuDefenseBonus(defender);
  }
  if (technique.type === 'ninjutsu') {
    def += getElementResistBonus(defender, attacker.element_affinity, technique.type);
  }
  const elementMult = elementDamageMultiplier(attacker.element_affinity, defender.element_affinity);

  if (technique.type === 'medecine') {
    const ally = findHealTarget(attacker, allies.filter((a) => !a.ko));
    if (!ally || ally.id === attacker.id) {
      return { pvDamage: 0, chakraCost: BASE_CHAKRA_COST, healed: 0, status: null };
    }
    const heal = Math.max(
      4,
      Math.floor(attacker.stats.medecine * 1.5 * healMultiplierFor(attacker))
    );
    ally.pv = Math.min(ally.maxPv, ally.pv + heal);
    return { pvDamage: 0, chakraCost: BASE_CHAKRA_COST, healed: heal, targetName: ally.name, status: null };
  }

  if (technique.type === 'genjutsu') {
    const chakraCost =
      attacker.character_trait === 'Temeraire' ? TEMERAIRE_CHAKRA_COST : BASE_CHAKRA_COST;
    const genjutsu = resolveGenjutsuDuel(atk, def);
    if (genjutsu.success) {
      let status = roll(2) === 0 ? 'paralysis' : 'confusion';
      if (defender.character_trait === 'Faineant' && !defender.genjutsuReceived) {
        defender.genjutsuReceived = true;
        status = null;
      } else {
        defender.status = status;
      }
      return {
        pvDamage: genjutsu.chip,
        chakraCost,
        status,
        chakraDrain: 0,
        duelEdge: genjutsu.atkContest - genjutsu.defContest,
        crit: false,
        fumble: false,
        missed: false,
        genjutsuSucceeded: true,
      };
    }
    return {
      pvDamage: 0,
      chakraCost,
      status: null,
      chakraDrain: 0,
      duelEdge: genjutsu.atkContest - genjutsu.defContest,
      crit: false,
      fumble: false,
      missed: true,
      genjutsuSucceeded: false,
    };
  }

  const chakraCost =
    attacker.character_trait === 'Temeraire' ? TEMERAIRE_CHAKRA_COST : BASE_CHAKRA_COST;
  const physical = resolvePhysicalDuel(atk, def, elementMult, technique.type);
  return {
    pvDamage: physical.pvDamage,
    chakraCost,
    status: null,
    chakraDrain: physical.chakraDrain,
    duelEdge: physical.duelEdge,
    crit: physical.crit,
    fumble: physical.fumble,
    missed: physical.missed,
    genjutsuSucceeded: false,
  };
}

function trySenseiSave(defTeam, defender, damage) {
  const sensei = defTeam.sensei;
  if (defender.pv - damage > 0) return { saved: false, damage };

  if (sensei.chakraPool >= SENSEI_SUB_COST) {
    const iqRoll = roll(20) + Math.floor(defTeam.fighters.reduce((s, f) => s + f.stats.intelligence, 0) / 3);
    if (iqRoll >= 14) {
      sensei.chakraPool -= SENSEI_SUB_COST;
      return { saved: true, damage: 0, senseiInterception: true };
    }
  }

  const altruiste = defTeam.fighters.find(
    (f) => f.id !== defender.id && !f.ko && f.character_trait === 'Altruiste'
  );
  if (altruiste && roll(2) === 0) {
    altruiste.pv = Math.max(0, altruiste.pv - damage);
    if (altruiste.pv <= 0) altruiste.ko = true;
    return { saved: true, damage: 0, altruisteSacrifice: true, sacrificialName: altruiste.name };
  }

  return { saved: false, damage };
}

function applyKo(fighter) {
  if (fighter.pv <= 0 || fighter.chakra <= 0) {
    fighter.ko = true;
    fighter.pv = 0;
  }
}

function teamRemainingScore(team) {
  const fighters = team.fighters;
  const pv = fighters.reduce((s, f) => s + f.pv, 0);
  const maxPv = fighters.reduce((s, f) => s + f.maxPv, 0);
  const chakra = fighters.reduce((s, f) => s + f.chakra, 0);
  const maxChakra = fighters.reduce((s, f) => s + f.maxChakra, 0);
  return (pv / Math.max(maxPv, 1)) * 0.6 + (chakra / Math.max(maxChakra, 1)) * 0.4;
}

function allKo(team) {
  return activeFighters(team).length === 0;
}

function buildCardCtx(attackerTeam, defenderTeam, attacker, defender, technique, tourTargetCounts, genjutsuSucceeded) {
  return {
    attackerTeam,
    defenderTeam,
    attacker,
    defender,
    technique,
    tourTargetCounts,
    genjutsuSucceeded,
  };
}

function maybeProcCard(bearer, ctx, logs, tour) {
  const event = tryTriggerTacticCard(bearer, ctx);
  if (!event) return null;
  recordTacticCardEvent(bearer, event);
  logs.push({
    tour,
    type: 'tactic_card',
    card_slug: event.slug,
    card_narrative_key: event.narrativeKey,
    card_type: event.cardType,
    ninja_name: bearer.name,
    equipe_attaque: bearer.side,
    attaquant_name: ctx.attacker?.name || null,
    cible_name: ctx.defender?.name || null,
    card_efficacy: event.efficacy,
    card_healed: event.healed || 0,
    card_damage: event.pvDamage || 0,
    card_status: event.status,
    card_targets: event.targets,
  });
  return event;
}

function procSupportCards(team, ctx, logs, tour) {
  for (const fighter of activeFighters(team)) {
    if (!fighter.tacticCard || fighter.tacticCard.card_type !== 'support') continue;
    maybeProcCard(fighter, { ...ctx, attackerTeam: team }, logs, tour);
  }
}

export function simulateCombat(homeTeam, awayTeam, { environmentSlug = null } = {}) {
  const env = environmentSlug ? getEnvironmentModifier(environmentSlug) : null;
  const logs = [];
  const consumedItemIds = [];
  let endingTour = MAX_TOURS;
  let endReason = 'points';
  let homePossession = 0;
  let awayPossession = 0;

  for (let tour = 1; tour <= MAX_TOURS; tour += 1) {
    const tourTargetCounts = {};
    const initiative = resolveInitiative(homeTeam, awayTeam, tour, env);
    const attackerTeam = initiative.attackerTeam;
    const defenderTeam = initiative.defenderTeam;

    if (attackerTeam === homeTeam) homePossession += 1;
    else awayPossession += 1;

    const attacker = pickAttacker(attackerTeam);
    if (!attacker) break;

    if (attacker.status === 'confusion') {
      attacker.status = null;
      const ally = activeFighters(attackerTeam).find((a) => a.id !== attacker.id);
      if (ally) {
        const chip = Math.max(2, Math.floor(attacker.stats.taijutsu * 0.5));
        ally.pv = Math.max(0, ally.pv - chip);
        applyKo(ally);
        logs.push({ tour, type: 'confusion', attaquant_name: attacker.name, cible_name: ally.name, degats_pv: chip });
        if (allKo(homeTeam) || allKo(awayTeam)) {
          endingTour = tour;
          endReason = 'ko';
          break;
        }
      }
      continue;
    }

    const { defender, egoisteInsubordination } = pickDefender(defenderTeam, attacker);
    if (!defender) break;

    if (attacker.status === 'paralysis') {
      attacker.status = null;
      logs.push({ tour, type: 'skip', ninja: attacker.name, reason: 'paralysis' });
      continue;
    }

    tourTargetCounts[defender.id] = (tourTargetCounts[defender.id] || 0) + 1;

    const technique = chooseTechnique(attacker, defender);
    const allies = activeFighters(attackerTeam);
    attacker.healIntent = false;

    const baseCtx = buildCardCtx(attackerTeam, defenderTeam, attacker, defender, technique, tourTargetCounts, false);
    procSupportCards(attackerTeam, baseCtx, logs, tour);
    procSupportCards(defenderTeam, { ...baseCtx, attackerTeam: defenderTeam }, logs, tour);

    const outcome = resolveDuel(attacker, defender, technique, allies, env);
    attacker.chakra = Math.max(0, attacker.chakra - outcome.chakraCost);

    if (technique.type !== 'medecine') {
      let damage = outcome.pvDamage;

      const defCard = maybeProcCard(
        defender,
        buildCardCtx(attackerTeam, defenderTeam, attacker, defender, technique, tourTargetCounts, outcome.genjutsuSucceeded),
        logs,
        tour
      );
      if (defCard?.damageReductionPct) {
        damage = Math.max(0, Math.floor(damage * (1 - defCard.damageReductionPct)));
      }

      const save = trySenseiSave(defenderTeam, defender, damage);
      damage = save.damage;
      const mitigation = tryLethalMitigation(defender, damage);
      damage = mitigation.damage;
      defender.pv = Math.max(0, defender.pv - damage);
      if (outcome.chakraDrain) {
        defender.chakra = Math.max(0, defender.chakra - outcome.chakraDrain);
      }
      applyKo(defender);
      applyKo(attacker);
      consumedItemIds.push(...tryConsumables(defender));

      if (!outcome.missed && technique.type !== 'medecine') {
        maybeProcCard(
          attacker,
          buildCardCtx(attackerTeam, defenderTeam, attacker, defender, technique, tourTargetCounts, outcome.genjutsuSucceeded),
          logs,
          tour
        );
      }

      if (outcome.genjutsuSucceeded) {
        maybeProcCard(
          attacker,
          buildCardCtx(attackerTeam, defenderTeam, attacker, defender, technique, tourTargetCounts, true),
          logs,
          tour
        );
      }

      const elementMult = elementDamageMultiplier(attacker.element_affinity, defender.element_affinity);

      logs.push({
        tour,
        equipe_attaque: attackerTeam.label,
        attaquant_name: attacker.name,
        attaquant_element: attacker.element_affinity,
        cible_element: defender.element_affinity,
        element_effect:
          elementMult > 1 ? 'advantage' : elementMult < 1 ? 'disadvantage' : 'neutral',
        technique_type: technique.type.charAt(0).toUpperCase() + technique.type.slice(1),
        cible_name: defender.name,
        degats_pv: damage,
        chakra_perdu_cible: outcome.chakraDrain || 0,
        statut_consequence: outcome.status,
        sensei_interception: Boolean(save.senseiInterception),
        item_smoke_save: mitigation.mitigated,
        altruiste_sacrifice: Boolean(save.altruisteSacrifice),
        sacrificial_name: save.sacrificialName || null,
        initiative_chance_home: initiative.homeChance,
        initiative_roll: initiative.roll,
        duel_edge: outcome.duelEdge ?? null,
        critique: Boolean(outcome.crit),
        rate: Boolean(outcome.fumble),
        esquive: Boolean(outcome.missed),
        egoiste_insubordination: egoisteInsubordination,
      });
    } else {
      logs.push({
        tour,
        equipe_attaque: attackerTeam.label,
        attaquant_name: attacker.name,
        technique_type: 'Medecine',
        cible_name: outcome.targetName,
        soins_pv: outcome.healed,
        statut_consequence: null,
        sensei_interception: false,
        altruiste_sacrifice: false,
        initiative_chance_home: initiative.homeChance,
        initiative_roll: initiative.roll,
      });
    }

    if (allKo(homeTeam) || allKo(awayTeam)) {
      endingTour = tour;
      endReason = 'ko';
      break;
    }
  }

  let winner = null;
  if (allKo(homeTeam) && !allKo(awayTeam)) winner = 'away';
  else if (allKo(awayTeam) && !allKo(homeTeam)) winner = 'home';
  else {
    const homeScore = teamRemainingScore(homeTeam);
    const awayScore = teamRemainingScore(awayTeam);
    if (homeScore > awayScore + POINTS_WIN_MARGIN) winner = 'home';
    else if (awayScore > homeScore + POINTS_WIN_MARGIN) winner = 'away';
    else winner = 'draw';
  }

  const koNinjaIds = [...homeTeam.fighters, ...awayTeam.fighters]
    .filter((f) => f.ko)
    .map((f) => ({ id: f.id, name: f.name, side: f.side }));

  const totalPossession = homePossession + awayPossession || 1;
  const allConsumed = [
    ...consumedItemIds,
    ...collectConsumedItemIds([...homeTeam.fighters, ...awayTeam.fighters]),
  ];

  const equipmentSummary = collectEquipmentSummary([...homeTeam.fighters, ...awayTeam.fighters]);

  for (const fighter of [...homeTeam.fighters, ...awayTeam.fighters]) {
    for (const event of fighter.equipmentUsage?.eventLog || []) {
      if (event.type === 'item_smoke_save') continue;
      logs.push({
        tour: endingTour,
        type: 'item_event',
        item_event: event.type,
        ninja_name: fighter.name,
        equipe_attaque: fighter.side,
      });
    }
  }

  return {
    logs,
    endingTour,
    endReason,
    winner,
    homeTeam,
    awayTeam,
    koNinjaIds,
    consumedItemIds: [...new Set(allConsumed)],
    equipmentSummary,
    environment: env ? { slug: env.slug, type: env.type } : null,
    homeScorePct: Math.round(teamRemainingScore(homeTeam) * 100),
    awayScorePct: Math.round(teamRemainingScore(awayTeam) * 100),
    possession: {
      home: homePossession,
      away: awayPossession,
      homePct: Math.round((homePossession / totalPossession) * 100),
      awayPct: Math.round((awayPossession / totalPossession) * 100),
    },
  };
}

export { pickDefender as pickDefenderForTest };
