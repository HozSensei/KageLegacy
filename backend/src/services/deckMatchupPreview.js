/**
 * Preview deck vs adversaire (espionnage) — conseil lisible avant H71.
 */

const DOMAIN_KEYS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medecine'];

const DOMAIN_BEATS = {
  taijutsu: 'genjutsu',
  genjutsu: 'ninjutsu',
  ninjutsu: 'taijutsu',
};

function normalizeLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

function domainLabel(lang, key) {
  const fr = {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Médecine',
  };
  const en = {
    taijutsu: 'Taijutsu',
    ninjutsu: 'Ninjutsu',
    genjutsu: 'Genjutsu',
    medecine: 'Medicine',
  };
  return (lang === 'en' ? en : fr)[key] || key;
}

function countOwnDomains(ownDeck) {
  const counts = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  for (const member of ownDeck?.members || []) {
    if (member.primaryDomain) counts[member.primaryDomain] = (counts[member.primaryDomain] || 0) + 2;
    if (member.secondaryDomain) {
      counts[member.secondaryDomain] = (counts[member.secondaryDomain] || 0) + 3;
    }
  }
  return counts;
}

function countOpponentDomains(opponentDeck) {
  const raw = opponentDeck?.domainCounts || opponentDeck?.primaryDomains || {};
  const counts = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]));
  for (const key of DOMAIN_KEYS) {
    counts[key] = Number(raw[key] || 0);
  }
  return counts;
}

/**
 * @returns {{ lines: string[], strong: string[], weak: string[], scoreHint: string|null } | null}
 */
export function buildDeckMatchupPreview(ownDeck, opponentDeck, locale = 'fr') {
  if (!ownDeck || !opponentDeck) return null;

  const lang = normalizeLocale(locale);
  const mine = countOwnDomains(ownDeck);
  const theirs = countOpponentDomains(opponentDeck);
  const theirTotal = DOMAIN_KEYS.reduce((s, k) => s + theirs[k], 0);
  if (theirTotal <= 0) return null;

  const strong = [];
  const weak = [];
  const lines = [];

  for (const myDomain of DOMAIN_KEYS) {
    if (myDomain === 'medecine') continue;
    const beats = DOMAIN_BEATS[myDomain];
    if (!beats) continue;
    if (mine[myDomain] >= 3 && theirs[beats] >= 2) {
      strong.push(myDomain);
      lines.push(
        lang === 'en'
          ? `Strong in ${domainLabel(lang, myDomain)} vs their ${domainLabel(lang, beats)}.`
          : `Fort en ${domainLabel(lang, myDomain)} contre leur ${domainLabel(lang, beats)}.`
      );
    }
  }

  for (const theirDomain of DOMAIN_KEYS) {
    if (theirDomain === 'medecine') continue;
    const beats = DOMAIN_BEATS[theirDomain];
    if (!beats) continue;
    if (theirs[theirDomain] >= 2 && mine[beats] < 2 && mine[theirDomain] < 3) {
      weak.push(beats);
      lines.push(
        lang === 'en'
          ? `Weak vs their ${domainLabel(lang, theirDomain)} — reinforce ${domainLabel(lang, beats)} or counter domains.`
          : `Faible face à leur ${domainLabel(lang, theirDomain)} — renforcez ${domainLabel(lang, beats)} ou les contre-domaines.`
      );
    }
  }

  if (mine.medecine >= 3 && theirs.taijutsu + theirs.ninjutsu >= 4) {
    lines.push(
      lang === 'en'
        ? 'Medicine-heavy deck helps in long exchanges against their pressure.'
        : 'Deck riche en Médecine : utile pour tenir face à leur pression.'
    );
  }

  if (ownDeck.relaisPadding > 0 || ownDeck.techniqueCount < (ownDeck.maxTechniques || 3)) {
    lines.unshift(
      lang === 'en'
        ? 'Incomplete technique slots become weak relay plis — assign cards before H71.'
        : 'Les emplacements technique vides deviennent des relais faibles — assignez vos cartes avant H71.'
    );
  }

  if (!lines.length) {
    lines.push(
      lang === 'en'
        ? 'Matchup looks balanced — lock composition and polish technique cards.'
        : 'Matchup équilibré — verrouillez la composition et peaufinez les cartes technique.'
    );
  }

  let scoreHint = null;
  if (strong.length > weak.length) {
    scoreHint = lang === 'en' ? 'Favorable matchup on paper' : 'Matchup favorable sur le papier';
  } else if (weak.length > strong.length) {
    scoreHint = lang === 'en' ? 'Risky matchup — adjust domains' : 'Matchup risqué — ajustez les domaines';
  } else {
    scoreHint = lang === 'en' ? 'Even matchup' : 'Matchup équilibré';
  }

  return {
    lines: lines.slice(0, 4),
    strong: strong.map((d) => domainLabel(lang, d)),
    weak: weak.map((d) => domainLabel(lang, d)),
    scoreHint,
    myDomains: mine,
    theirDomains: theirs,
  };
}
