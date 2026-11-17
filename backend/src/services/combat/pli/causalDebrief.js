/**
 * Débrief causal post-match : jusqu'à 3 causes lisibles (agence tactique).
 * Analyse le combat_log pli + snapshots forme/deck.
 */

import { DOMAIN_BEATS, DOMAIN_LABELS } from './constants.js';
import { isPliLog, pliWinnerSide } from './combatLogMetrics.js';

const DOMAIN_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

function userSide(match, userId) {
  if (match.home_user_id === userId) return 'home';
  if (match.away_user_id === userId) return 'away';
  return null;
}

function normalizeDomain(raw) {
  if (!raw) return null;
  const lower = String(raw).toLowerCase();
  if (lower === 'médecine' || lower === 'medecine') return 'medecine';
  if (DOMAIN_KEYS.includes(lower)) return lower;
  const labeled = Object.entries(DOMAIN_LABELS).find(
    ([, label]) => label.toLowerCase() === lower,
  );
  return labeled ? labeled[0] : null;
}

function hasTypeAdvantage(atk, def) {
  if (!atk || !def || atk === 'medecine' || def === 'medecine') return false;
  return DOMAIN_BEATS[atk] === def;
}

function copy(lang, fr, en, vars = {}) {
  let text = lang === 'en' ? en : fr;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

function domainLabel(lang, key) {
  if (!key) return '—';
  if (lang === 'en') {
    const map = {
      taijutsu: 'Taijutsu',
      ninjutsu: 'Ninjutsu',
      genjutsu: 'Genjutsu',
      medecine: 'Medicine',
    };
    return map[key] || key;
  }
  return DOMAIN_LABELS[key] || key;
}

/**
 * @returns {{ causes: Array<{ code: string, polarity: 'helped'|'hurt'|'neutral', title: string, detail: string, weight: number }>, summary: object }}
 */
export function buildCausalDebrief(match, userId, combatLog, locale = 'fr') {
  if (!combatLog?.logs?.length) {
    return { causes: [], summary: null };
  }

  const side = userSide(match, userId);
  if (!side) return { causes: [], summary: null };

  const lang = normalizeLocale(locale);
  const opp = side === 'home' ? 'away' : 'home';
  const logs = combatLog.logs.filter(isPliLog);
  const plisWon = combatLog.plisWon || {};
  const myPlis = Number(plisWon[side] || 0);
  const theirPlis = Number(plisWon[opp] || 0);
  const myPv = Number(side === 'home' ? combatLog.homeScorePct : combatLog.awayScorePct) || 0;
  const theirPv = Number(side === 'home' ? combatLog.awayScorePct : combatLog.homeScorePct) || 0;

  const candidates = [];

  // --- Domaine / avantage de type ---
  let typeWins = 0;
  let typeLosses = 0;
  const domainWins = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  const domainLosses = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));

  for (const log of logs) {
    const winner = pliWinnerSide(log);
    if (!winner || winner === 'draw') continue;
    const myDomain = normalizeDomain(
      side === 'home' ? log.technique_type_home : log.technique_type_away,
    );
    const theirDomain = normalizeDomain(
      side === 'home' ? log.technique_type_away : log.technique_type_home,
    );
    if (winner === side) {
      if (myDomain) domainWins[myDomain] += 1;
      if (hasTypeAdvantage(myDomain, theirDomain) || log[`type_advantage_${side}`]) {
        typeWins += 1;
      }
    } else {
      if (theirDomain) domainLosses[theirDomain] += 1;
      if (hasTypeAdvantage(theirDomain, myDomain) || log[`type_advantage_${opp}`]) {
        typeLosses += 1;
      }
    }
  }

  if (typeWins >= 2) {
    candidates.push({
      code: 'domain_advantage',
      polarity: 'helped',
      weight: 40 + typeWins * 8,
      title: copy(lang, 'Avantage de domaine', 'Domain advantage'),
      detail: copy(
        lang,
        'Vous avez remporté {n} pli(s) grâce à un avantage Tai > Gen > Nin.',
        'You won {n} pli(s) thanks to a Tai > Gen > Nin type edge.',
        { n: typeWins },
      ),
    });
  }
  if (typeLosses >= 2) {
    candidates.push({
      code: 'domain_disadvantage',
      polarity: 'hurt',
      weight: 40 + typeLosses * 8,
      title: copy(lang, 'Désavantage de domaine', 'Domain disadvantage'),
      detail: copy(
        lang,
        'L\'adversaire a gagné {n} pli(s) avec un avantage de type contre vous.',
        'The opponent won {n} pli(s) with a type advantage against you.',
        { n: typeLosses },
      ),
    });
  }

  const topWinDomain = Object.entries(domainWins).sort((a, b) => b[1] - a[1])[0];
  const topLossDomain = Object.entries(domainLosses).sort((a, b) => b[1] - a[1])[0];
  if (topWinDomain && topWinDomain[1] >= 3 && typeWins < 2) {
    candidates.push({
      code: 'domain_focus',
      polarity: 'helped',
      weight: 28 + topWinDomain[1] * 4,
      title: copy(lang, 'Domaine dominant', 'Dominant domain'),
      detail: copy(
        lang,
        'Vos plis {domain} ont fait la différence ({n} gagnés).',
        'Your {domain} plis made the difference ({n} won).',
        { domain: domainLabel(lang, topWinDomain[0]), n: topWinDomain[1] },
      ),
    });
  }
  if (topLossDomain && topLossDomain[1] >= 3 && typeLosses < 2) {
    candidates.push({
      code: 'domain_weakness',
      polarity: 'hurt',
      weight: 28 + topLossDomain[1] * 4,
      title: copy(lang, 'Faille de domaine', 'Domain weakness'),
      detail: copy(
        lang,
        'Vous avez cédé {n} pli(s) face au {domain} adverse.',
        'You lost {n} pli(s) to the opponent\'s {domain}.',
        { domain: domainLabel(lang, topLossDomain[0]), n: topLossDomain[1] },
      ),
    });
  }

  // --- Cartes technique ---
  const techSwing = new Map();
  for (const log of logs) {
    const winner = pliWinnerSide(log);
    if (!winner || winner === 'draw') continue;
    const myCard = side === 'home' ? log.carte_home : log.carte_away;
    const isTech =
      (side === 'home' ? log.technique_card_home : log.technique_card_away) ||
      (myCard && !String(myCard).includes('·') && log.type === 'pli');
    const powerEdge =
      winner === side
        ? Math.abs(Number(log.puissance_home || 0) - Number(log.puissance_away || 0))
        : 0;
    if (winner === side && myCard && (isTech || powerEdge >= 6)) {
      const key = myCard;
      const prev = techSwing.get(key) || { wins: 0, edge: 0 };
      prev.wins += 1;
      prev.edge += powerEdge;
      techSwing.set(key, prev);
    }
  }
  const bestTech = [...techSwing.entries()].sort(
    (a, b) => b[1].wins * 10 + b[1].edge - (a[1].wins * 10 + a[1].edge),
  )[0];
  if (bestTech && bestTech[1].wins >= 1 && bestTech[1].edge >= 8) {
    candidates.push({
      code: 'technique_card',
      polarity: 'helped',
      weight: 35 + bestTech[1].wins * 10,
      title: copy(lang, 'Carte technique décisive', 'Decisive technique card'),
      detail: copy(
        lang,
        '« {card} » a basculé {n} pli(s) avec un écart de puissance net.',
        '"{card}" swung {n} pli(s) with a clear power edge.',
        { card: bestTech[0], n: bestTech[1].wins },
      ),
    });
  }

  // --- Relais / deck incomplet ---
  let myRelais = 0;
  let myPadding = 0;
  for (const log of logs) {
    if (side === 'home' && log.relais_home) {
      myRelais += 1;
      if (log.relais_padding_home) myPadding += 1;
    }
    if (side === 'away' && log.relais_away) {
      myRelais += 1;
      if (log.relais_padding_away) myPadding += 1;
    }
  }
  if (myPadding >= 2 || myRelais >= 4) {
    candidates.push({
      code: 'relais_padding',
      polarity: 'hurt',
      weight: 32 + myPadding * 6,
      title: copy(lang, 'Deck incomplet', 'Incomplete deck'),
      detail: copy(
        lang,
        '{n} pli(s) relais ont affaibli votre pression — assignez vos cartes technique.',
        '{n} relay pli(s) weakened your pressure — assign your technique cards.',
        { n: Math.max(myPadding, myRelais) },
      ),
    });
  }

  // --- Forme (snapshots enrichis) ---
  const snaps = combatLog.squadSnapshots?.[side] || [];
  const lame = snaps.filter((n) => n.weekly_forme === 'Lamentable' || n.forme === 'Lamentable');
  const divine = snaps.filter((n) => n.weekly_forme === 'Divin' || n.forme === 'Divin');
  if (lame.length >= 1) {
    const names = lame
      .map((n) => n.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(', ');
    candidates.push({
      code: 'forme_lamentable',
      polarity: 'hurt',
      weight: 36 + lame.length * 8,
      title: copy(lang, 'Forme Lamentable', 'Wretched form'),
      detail: names
        ? copy(
            lang,
            '{names} combattai(en)t en forme Lamentable (−25 % stats).',
            '{names} fought in Wretched form (−25% stats).',
            { names },
          )
        : copy(
            lang,
            '{n} ninja(s) en forme Lamentable ont pesé sur le match.',
            '{n} ninja(s) in Wretched form weighed on the match.',
            { n: lame.length },
          ),
    });
  }
  if (divine.length >= 1 && lame.length === 0) {
    candidates.push({
      code: 'forme_divin',
      polarity: 'helped',
      weight: 30 + divine.length * 6,
      title: copy(lang, 'Forme Divine', 'Divine form'),
      detail: copy(
        lang,
        '{n} ninja(s) en forme Divine ont amplifié vos plis (+15 % stats).',
        '{n} ninja(s) in Divine form amplified your plis (+15% stats).',
        { n: divine.length },
      ),
    });
  }

  // --- Marge PV / plis ---
  const pvDelta = myPv - theirPv;
  if (Math.abs(pvDelta) >= 25) {
    candidates.push({
      code: 'pv_margin',
      polarity: pvDelta > 0 ? 'helped' : 'hurt',
      weight: 22 + Math.min(30, Math.abs(pvDelta) / 2),
      title:
        pvDelta > 0
          ? copy(lang, 'Dominance PV', 'HP dominance')
          : copy(lang, 'Déficit PV', 'HP deficit'),
      detail: copy(
        lang,
        'Écart de PV restants : {delta} (vous {mine} / adversaire {theirs}).',
        'Remaining HP gap: {delta} (you {mine} / opponent {theirs}).',
        { delta: Math.round(pvDelta), mine: Math.round(myPv), theirs: Math.round(theirPv) },
      ),
    });
  }

  const pliDelta = myPlis - theirPlis;
  if (Math.abs(pliDelta) >= 3 && Math.abs(pvDelta) < 25) {
    candidates.push({
      code: 'plis_tempo',
      polarity: pliDelta > 0 ? 'helped' : 'hurt',
      weight: 24 + Math.abs(pliDelta) * 3,
      title: copy(lang, 'Tempo des plis', 'Pli tempo'),
      detail: copy(
        lang,
        'Plis remportés {mine}–{theirs}.',
        'Plis won {mine}–{theirs}.',
        { mine: Math.round(myPlis), theirs: Math.round(theirPlis) },
      ),
    });
  }

  // --- Élément ninjutsu ---
  let elemAdv = 0;
  let elemDis = 0;
  for (const log of logs) {
    const myMod = side === 'home' ? log.element_mod_home : log.element_mod_away;
    const winner = pliWinnerSide(log);
    if (myMod === 'advantage' && winner === side) elemAdv += 1;
    if (myMod === 'disadvantage' && winner === opp) elemDis += 1;
  }
  if (elemAdv >= 2) {
    candidates.push({
      code: 'element_advantage',
      polarity: 'helped',
      weight: 26 + elemAdv * 5,
      title: copy(lang, 'Affinité élémentaire', 'Elemental affinity'),
      detail: copy(
        lang,
        'Votre Ninjutsu a exploité l\'élément adverse sur {n} pli(s).',
        'Your Ninjutsu exploited the enemy element on {n} pli(s).',
        { n: elemAdv },
      ),
    });
  }
  if (elemDis >= 2) {
    candidates.push({
      code: 'element_disadvantage',
      polarity: 'hurt',
      weight: 26 + elemDis * 5,
      title: copy(lang, 'Contre-élément', 'Element counter'),
      detail: copy(
        lang,
        'Votre Ninjutsu a subi un désavantage élémentaire sur {n} pli(s).',
        'Your Ninjutsu suffered an elemental disadvantage on {n} pli(s).',
        { n: elemDis },
      ),
    });
  }

  if (combatLog.endReason === 'ko') {
    const myKo = (combatLog.koNinjaIds || []).filter((k) => k.side === side).length;
    const theirKo = (combatLog.koNinjaIds || []).filter((k) => k.side === opp).length;
    candidates.push({
      code: 'ko_finish',
      polarity: theirKo >= 3 ? 'helped' : 'hurt',
      weight: 45,
      title: copy(lang, 'Fin par K.O.', 'K.O. finish'),
      detail: copy(
        lang,
        'Match terminé avant les 18 plis — K.O. ({mine} / {theirs}).',
        'Match ended before 18 plis — K.O. ({mine} / {theirs}).',
        { mine: myKo, theirs: theirKo },
      ),
    });
  }

  candidates.sort((a, b) => b.weight - a.weight);
  const causes = candidates.slice(0, 3).map(({ weight: _w, ...rest }) => rest);

  if (!causes.length) {
    causes.push({
      code: 'even_match',
      polarity: 'neutral',
      title: copy(lang, 'Match serré', 'Close match'),
      detail: copy(
        lang,
        'Aucun levier n\'a nettement dominé — ajustez le deck selon l\'espionnage du prochain cycle.',
        'No single lever clearly dominated — adjust the deck from next cycle\'s scout report.',
      ),
    });
  }

  return {
    causes,
    summary: {
      myPlis: Math.round(myPlis),
      theirPlis: Math.round(theirPlis),
      myPv: Math.round(myPv),
      theirPv: Math.round(theirPv),
      endReason: combatLog.endReason || null,
      typeWins,
      typeLosses,
    },
  };
}
