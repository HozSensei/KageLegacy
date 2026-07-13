import { getEnvironmentModifier } from '../../matchEnvironment.js';
import { buildTeamDeck } from './deckBuilder.js';
import {
  MAX_PLIS,
  DOMAIN_LABELS,
  GEN_MALUS_NEXT,
  TAI_BONUS_NEXT,
} from './constants.js';
import {
  computeCardPower,
  computeDamage,
  computeTieDamage,
  computeHealAmount,
  computeMedFailDamage,
  hasTypeAdvantage,
  pickDominantDomain,
  findMostWoundedPct,
  teamTotalPv,
  allFightersKo,
  randomProxy,
} from './power.js';

function getFighter(team, id) {
  return team.fighters.find((f) => f.id === id);
}

function aliveFighters(team) {
  return team.fighters.filter((f) => !f.ko && f.pv > 0);
}

function applyDamage(fighter, amount) {
  if (!fighter || fighter.ko) return 0;
  const dealt = Math.max(0, amount);
  fighter.pv = Math.max(0, fighter.pv - dealt);
  if (fighter.pv <= 0) {
    fighter.ko = true;
    fighter.pv = 0;
  }
  return dealt;
}

function applyHeal(fighter, amount) {
  if (!fighter || fighter.ko) return 0;
  const before = fighter.pv;
  fighter.pv = Math.min(fighter.maxPv, fighter.pv + amount);
  return fighter.pv - before;
}

function resolveCardActor(team, card, koSet) {
  if (card.kind === 'element') {
    const alive = aliveFighters(team);
    if (!alive.length) return null;
    const best = alive.reduce((a, b) =>
      (b.stats[card.domain] || 0) > (a.stats[card.domain] || 0) ? b : a
    );
    return { fighter: best, domain: card.domain, relais: false, element: true, cardOwner: null };
  }

  if (card.kind === 'relais' && card.padded) {
    const proxy = randomProxy(team);
    if (!proxy) return null;
    return {
      fighter: proxy,
      domain: pickDominantDomain(proxy),
      relais: true,
      padded: true,
      relaisOwner: null,
      deckLabel: card.label,
      cardOwner: null,
    };
  }

  const owner = getFighter(team, card.ownerId);
  if (!owner) return null;

  if (owner.ko || koSet.has(card.ownerId)) {
    const proxy = randomProxy(team);
    if (!proxy) return null;
    return {
      fighter: proxy,
      domain: pickDominantDomain(proxy),
      relais: true,
      relaisOwner: owner,
      deckLabel: card.label,
      cardOwner: owner,
    };
  }

  return { fighter: owner, domain: card.domain, relais: false, cardOwner: owner };
}

function damageBearer(actor) {
  return actor.relais ? actor.fighter : actor.cardOwner || actor.fighter;
}

function computePowers(homeActor, awayActor, homeDomain, awayDomain, env, state) {
  const homePower = computeCardPower(homeActor.fighter, homeDomain, {
    env,
    nextMod: state.homeNextMod,
    typeAdvantage: hasTypeAdvantage(homeDomain, awayDomain),
    opponentElement: awayActor.fighter.element_affinity,
  });
  const awayPower = computeCardPower(awayActor.fighter, awayDomain, {
    env,
    nextMod: state.awayNextMod,
    typeAdvantage: hasTypeAdvantage(awayDomain, homeDomain),
    opponentElement: homeActor.fighter.element_affinity,
  });
  return { homePower, awayPower };
}

function scheduleDomainEffect(domain, winnerSide, relais, state) {
  if (relais) return;
  if (domain === 'taijutsu') {
    if (winnerSide === 'home') state.pendingHomeMod = TAI_BONUS_NEXT;
    else state.pendingAwayMod = TAI_BONUS_NEXT;
  }
  if (domain === 'genjutsu') {
    if (winnerSide === 'home') state.pendingAwayMod = GEN_MALUS_NEXT;
    else state.pendingHomeMod = GEN_MALUS_NEXT;
  }
}

function applyPendingMods(state) {
  if (state.pendingHomeMod != null) {
    state.homeNextMod = state.pendingHomeMod;
    state.pendingHomeMod = null;
  } else {
    state.homeNextMod = 1;
  }
  if (state.pendingAwayMod != null) {
    state.awayNextMod = state.pendingAwayMod;
    state.pendingAwayMod = null;
  } else {
    state.awayNextMod = 1;
  }
}

function resolveMedSide(team, sideKey, actor, power, oppPower, outcome, log, suffix = '') {
  const bearer = damageBearer(actor);
  const won = outcome === sideKey;
  const key = suffix ? `degats_pv${suffix}` : 'degats_pv';
  const cibleKey = suffix ? `cible_name${suffix}` : 'cible_name';

  if (won && !actor.relais) {
    const target = findMostWoundedPct(team.fighters);
    if (target && target.pv < target.maxPv) {
      const heal = applyHeal(target, computeHealAmount(power));
      log[`soins_pv${suffix}`] = heal;
      log[cibleKey] = target.name;
      return;
    }
    log[`soin_inutile${suffix}`] = true;
    return;
  }

  if (outcome === 'draw') {
    const dmg = applyDamage(bearer, computeTieDamage(power, oppPower));
    log[key] = dmg;
    log[cibleKey] = bearer?.name;
    return;
  }

  if (!won) {
    const full = computeDamage(oppPower, power);
    const dmg = applyDamage(bearer, computeMedFailDamage(full));
    log[key] = dmg;
    log[cibleKey] = bearer?.name;
  }
}

export function simulatePliCombat(homeTeam, awayTeam, options = {}) {
  const env = options.environmentSlug ? getEnvironmentModifier(options.environmentSlug) : null;
  const homeDeck = buildTeamDeck(homeTeam, options.homeDeck || {});
  const awayDeck = buildTeamDeck(awayTeam, options.awayDeck || {});

  const logs = [];
  const plisWon = { home: 0, away: 0 };
  const playedElementCardIds = [];
  const koOwnerIds = { home: new Set(), away: new Set() };
  const state = {
    homeNextMod: 1,
    awayNextMod: 1,
    pendingHomeMod: null,
    pendingAwayMod: null,
  };

  const totalPlis = Math.min(homeDeck.length, awayDeck.length, MAX_PLIS);
  let endingPli = totalPlis;
  let endReason = 'points';

  for (let pli = 1; pli <= totalPlis; pli += 1) {
    const homeCard = homeDeck[pli - 1];
    const awayCard = awayDeck[pli - 1];
    if (!homeCard || !awayCard) break;

    const homeActor = resolveCardActor(homeTeam, homeCard, koOwnerIds.home);
    const awayActor = resolveCardActor(awayTeam, awayCard, koOwnerIds.away);
    if (!homeActor?.fighter || !awayActor?.fighter) break;

    if (homeCard.userTacticCardId) playedElementCardIds.push(homeCard.userTacticCardId);
    if (awayCard.userTacticCardId) playedElementCardIds.push(awayCard.userTacticCardId);

    const homeDomain = homeActor.domain;
    const awayDomain = awayActor.domain;
    const { homePower, awayPower } = computePowers(
      homeActor,
      awayActor,
      homeDomain,
      awayDomain,
      env,
      state
    );

    let outcome = 'draw';
    if (homePower > awayPower) outcome = 'home';
    else if (awayPower > homePower) outcome = 'away';

    const log = {
      tour: pli,
      pli,
      type:
        homeActor.relais || awayActor.relais
          ? 'relais'
          : homeCard.kind === 'element' || awayCard.kind === 'element'
            ? 'element'
            : 'pli',
      carte_home: homeCard.label,
      carte_away: awayCard.label,
      technique_type_home: DOMAIN_LABELS[homeDomain],
      technique_type_away: DOMAIN_LABELS[awayDomain],
      puissance_home: homePower,
      puissance_away: awayPower,
      pli_winner: outcome,
      degats_pv: 0,
      cible_name: null,
    };

    if (homeActor.relais) {
      log.relais_home = true;
      log.proxy_home = homeActor.fighter.name;
      if (homeActor.padded) log.relais_padding_home = true;
      else log.owner_ko_home = homeActor.relaisOwner?.name;
      log.carte_resolution_home = `${homeActor.fighter.name} · ${DOMAIN_LABELS[homeDomain]}`;
    }
    if (awayActor.relais) {
      log.relais_away = true;
      log.proxy_away = awayActor.fighter.name;
      if (awayActor.padded) log.relais_padding_away = true;
      else log.owner_ko_away = awayActor.relaisOwner?.name;
      log.carte_resolution_away = `${awayActor.fighter.name} · ${DOMAIN_LABELS[awayDomain]}`;
    }

    if (outcome === 'home') plisWon.home += 1;
    else if (outcome === 'away') plisWon.away += 1;
    else {
      plisWon.home += 0.5;
      plisWon.away += 0.5;
    }

    const medHome = homeDomain === 'medecine';
    const medAway = awayDomain === 'medecine';

    if (medHome) resolveMedSide(homeTeam, 'home', homeActor, homePower, awayPower, outcome, log);
    if (medAway) resolveMedSide(awayTeam, 'away', awayActor, awayPower, homePower, outcome, log, '_away');

    if (!medHome && !medAway) {
      if (outcome === 'home') {
        const dmg = computeDamage(homePower, awayPower, { relais: awayActor.relais });
        log.degats_pv = applyDamage(damageBearer(awayActor), dmg);
        log.cible_name = damageBearer(awayActor)?.name;
        log.attaquant_name = homeActor.fighter.name;
        scheduleDomainEffect(homeDomain, 'home', homeActor.relais, state);
      } else if (outcome === 'away') {
        const dmg = computeDamage(awayPower, homePower, { relais: homeActor.relais });
        log.degats_pv = applyDamage(damageBearer(homeActor), dmg);
        log.cible_name = damageBearer(homeActor)?.name;
        log.attaquant_name = awayActor.fighter.name;
        scheduleDomainEffect(awayDomain, 'away', awayActor.relais, state);
      } else {
        const tieDmg = computeTieDamage(homePower, awayPower);
        log.degats_pv = applyDamage(damageBearer(homeActor), tieDmg);
        log.degats_pv_away = applyDamage(damageBearer(awayActor), tieDmg);
        log.cible_name = damageBearer(homeActor)?.name;
        log.cible_name_away = damageBearer(awayActor)?.name;
        log.egallite = true;
      }
    } else if (!medHome && medAway && outcome === 'home') {
      const dmg = computeDamage(homePower, awayPower, { relais: awayActor.relais });
      log.degats_pv = applyDamage(damageBearer(awayActor), dmg);
      scheduleDomainEffect(homeDomain, 'home', homeActor.relais, state);
    } else if (medHome && !medAway && outcome === 'away') {
      const dmg = computeDamage(awayPower, homePower, { relais: homeActor.relais });
      log.degats_pv = applyDamage(damageBearer(homeActor), dmg);
      scheduleDomainEffect(awayDomain, 'away', awayActor.relais, state);
    }

    applyPendingMods(state);

    for (const f of homeTeam.fighters) {
      if ((f.ko || f.pv <= 0) && !koOwnerIds.home.has(f.id)) koOwnerIds.home.add(f.id);
    }
    for (const f of awayTeam.fighters) {
      if ((f.ko || f.pv <= 0) && !koOwnerIds.away.has(f.id)) koOwnerIds.away.add(f.id);
    }

    logs.push(log);

    if (allFightersKo(homeTeam) || allFightersKo(awayTeam)) {
      endingPli = pli;
      endReason = 'ko';
      break;
    }
  }

  let winner = null;
  if (allFightersKo(homeTeam) && !allFightersKo(awayTeam)) winner = 'away';
  else if (allFightersKo(awayTeam) && !allFightersKo(homeTeam)) winner = 'home';
  else {
    const homePv = teamTotalPv(homeTeam);
    const awayPv = teamTotalPv(awayTeam);
    if (homePv > awayPv) winner = 'home';
    else if (awayPv > homePv) winner = 'away';
    else if (plisWon.home > plisWon.away) winner = 'home';
    else if (plisWon.away > plisWon.home) winner = 'away';
    else winner = 'draw';
  }

  return {
    logs,
    endingTour: endingPli,
    endReason,
    winner,
    homeTeam,
    awayTeam,
    koNinjaIds: [...homeTeam.fighters, ...awayTeam.fighters]
      .filter((f) => f.ko)
      .map((f) => ({ id: f.id, name: f.name, side: f.side })),
    consumedItemIds: [],
    equipmentSummary: {},
    environment: env ? { slug: env.slug, type: env.type } : null,
    homeScorePct: teamTotalPv(homeTeam),
    awayScorePct: teamTotalPv(awayTeam),
    plisWon: { home: Math.round(plisWon.home), away: Math.round(plisWon.away) },
    playedElementCardIds: [...new Set(playedElementCardIds)],
    possession: { home: 0, away: 0, homePct: 50, awayPct: 50 },
  };
}
