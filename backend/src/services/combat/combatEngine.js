import { randomInt } from 'node:crypto';
import {
  BASE_CHAKRA_COST,
  COMBAT_STATS,
  MAX_TOURS,
  SENSEI_SUB_COST,
  TANK_TARGET_CHANCE,
  TEMERAIRE_CHAKRA_COST,
} from './constants.js';
import { elementDamageMultiplier } from './element.js';

function roll(max) {
  return randomInt(max);
}

function activeFighters(team) {
  return team.fighters.filter((f) => !f.ko && f.pv > 0 && f.chakra > 0);
}

function teamTacticalSpeed(team, tour) {
  return activeFighters(team).reduce((sum, f) => {
    let vitesse = f.stats.vitesse;
    if (tour === 1 && f.character_trait === 'Temeraire') vitesse += 4;
    if (f.status === 'paralysis') vitesse = 0;
    return sum + vitesse + f.stats.intelligence;
  }, 0);
}

/**
 * Initiative probabiliste (M1) : la vitesse tactique donne un % de chances,
 * pas une victoire automatique. Formule M5 : Σ(vitesse + intelligence).
 */
function resolveInitiative(homeTeam, awayTeam, tour) {
  const homeSpeed = teamTacticalSpeed(homeTeam, tour);
  const awaySpeed = teamTacticalSpeed(awayTeam, tour);
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
    return offensive.sort(
      (a, b) => maxCombatStat(b.stats) - maxCombatStat(a.stats)
    )[0];
  }

  const healer = candidates.find(
    (f) =>
      f.battle_strategy === 'Protect' &&
      f.stats.medecine >= 6 &&
      activeFighters(team).some((ally) => ally.id !== f.id && ally.pv < ally.maxPv * 0.5)
  );
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
  if (!defenders.length) return null;

  if (attacker.character_trait !== 'Egoiste') {
    const tanks = defenders.filter((d) => d.battle_strategy === 'Tank');
    if (tanks.length && roll(100) < TANK_TARGET_CHANCE * 100) {
      return tanks[roll(tanks.length)];
    }
  }

  return defenders[roll(defenders.length)];
}

function chooseTechnique(attacker, defender) {
  if (attacker.healIntent) {
    return { type: 'medecine', stat: 'medecine' };
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

function resolveDuel(attacker, defender, technique, allies) {
  const atk = attackValue(attacker, technique, allies);
  const def = defender.stats[technique.stat];
  const elementMult = elementDamageMultiplier(attacker.element_affinity, defender.element_affinity);

  if (technique.type === 'medecine') {
    const ally = allies
      .filter((a) => a.id !== attacker.id && !a.ko)
      .sort((a, b) => a.pv / a.maxPv - b.pv / b.maxPv)[0];
    if (!ally) return { pvDamage: 0, chakraCost: BASE_CHAKRA_COST, healed: 0, status: null };
    const heal = Math.max(4, Math.floor(attacker.stats.medecine * 1.5));
    ally.pv = Math.min(ally.maxPv, ally.pv + heal);
    return { pvDamage: 0, chakraCost: BASE_CHAKRA_COST, healed: heal, targetName: ally.name, status: null };
  }

  if (technique.type === 'genjutsu') {
    const chakraCost =
      attacker.character_trait === 'Temeraire' ? TEMERAIRE_CHAKRA_COST : BASE_CHAKRA_COST;
    if (atk + roll(6) > def + roll(6)) {
      let status = roll(2) === 0 ? 'paralysis' : 'confusion';
      if (defender.character_trait === 'Faineant' && !defender.genjutsuReceived) {
        defender.genjutsuReceived = true;
        status = null;
      } else {
        defender.status = status;
      }
      const chip = Math.max(2, Math.floor(atk * 0.3));
      return { pvDamage: chip, chakraCost, status, chakraDrain: 0 };
    }
    return { pvDamage: 0, chakraCost, status: null, chakraDrain: 0 };
  }

  const chakraCost =
    attacker.character_trait === 'Temeraire' ? TEMERAIRE_CHAKRA_COST : BASE_CHAKRA_COST;
  const raw = Math.max(3, Math.floor(atk * 2.2 - def * 0.8));
  const pvDamage = Math.max(1, Math.floor(raw * elementMult));
  const chakraDrain = technique.type === 'taijutsu' ? Math.floor(atk * 0.3) : 0;
  return { pvDamage, chakraCost, status: null, chakraDrain };
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

export function simulateCombat(homeTeam, awayTeam) {
  const logs = [];
  let endingTour = MAX_TOURS;
  let endReason = 'points';
  let homePossession = 0;
  let awayPossession = 0;

  for (let tour = 1; tour <= MAX_TOURS; tour += 1) {
    const initiative = resolveInitiative(homeTeam, awayTeam, tour);
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

    const defender = pickDefender(defenderTeam, attacker);
    if (!defender) break;

    if (attacker.status === 'paralysis') {
      attacker.status = null;
      logs.push({ tour, type: 'skip', ninja: attacker.name, reason: 'paralysis' });
      continue;
    }

    const technique = chooseTechnique(attacker, defender);
    const allies = activeFighters(attackerTeam);
    attacker.healIntent = false;
    const outcome = resolveDuel(attacker, defender, technique, allies);

    attacker.chakra = Math.max(0, attacker.chakra - outcome.chakraCost);

    if (technique.type !== 'medecine') {
      let damage = outcome.pvDamage;
      const save = trySenseiSave(defenderTeam, defender, damage);
      damage = save.damage;
      defender.pv = Math.max(0, defender.pv - damage);
      if (outcome.chakraDrain) {
        defender.chakra = Math.max(0, defender.chakra - outcome.chakraDrain);
      }
      applyKo(defender);
      applyKo(attacker);

      logs.push({
        tour,
        equipe_attaque: attackerTeam.label,
        attaquant_name: attacker.name,
        technique_type: technique.type.charAt(0).toUpperCase() + technique.type.slice(1),
        cible_name: defender.name,
        degats_pv: damage,
        chakra_perdu_cible: outcome.chakraDrain || 0,
        statut_consequence: outcome.status,
        sensei_interception: Boolean(save.senseiInterception),
        altruiste_sacrifice: Boolean(save.altruisteSacrifice),
        sacrificial_name: save.sacrificialName || null,
        initiative_chance_home: initiative.homeChance,
        initiative_roll: initiative.roll,
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
    if (homeScore > awayScore + 0.02) winner = 'home';
    else if (awayScore > homeScore + 0.02) winner = 'away';
    else winner = 'draw';
  }

  const koNinjaIds = [...homeTeam.fighters, ...awayTeam.fighters]
    .filter((f) => f.ko)
    .map((f) => ({ id: f.id, name: f.name, side: f.side }));

  const totalPossession = homePossession + awayPossession || 1;

  return {
    logs,
    endingTour,
    endReason,
    winner,
    homeTeam,
    awayTeam,
    koNinjaIds,
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
