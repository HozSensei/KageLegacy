/** Analyse de composition (voies, éléments) — espionnage et briefing. */

import { inferPrimaryArt } from './ninjaProfile.js';

export function analyzeDomainMix(ninjas) {
  const counts = { taijutsu: 0, ninjutsu: 0, genjutsu: 0, medecine: 0 };
  for (const n of ninjas) {
    const art = n.primaryArt || inferPrimaryArt(n);
    if (counts[art] != null) counts[art] += 1;
  }
  return counts;
}

/** @deprecated */
export function analyzeStrategies(ninjas) {
  const domains = analyzeDomainMix(ninjas);
  return {
    Offensive: domains.taijutsu + domains.ninjutsu,
    Tank: domains.taijutsu,
    Protect: domains.medecine,
    Normal: domains.genjutsu,
  };
}

export function dominantElement(ninjas) {
  const freq = {};
  for (const n of ninjas) {
    if (!n.element_affinity) continue;
    freq[n.element_affinity] = (freq[n.element_affinity] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function dominantArt(ninjas) {
  const freq = {};
  for (const n of ninjas) {
    const art = n.primaryArt || inferPrimaryArt(n);
    freq[art] = (freq[art] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
