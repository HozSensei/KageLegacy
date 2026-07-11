/** Analyse de composition (consignes, éléments) — espionnage et dossier d'opération. */

export function analyzeStrategies(ninjas) {
  const counts = { Tank: 0, Offensive: 0, Protect: 0, Normal: 0 };
  for (const n of ninjas) {
    const key = n.battle_strategy || 'Normal';
    if (counts[key] != null) counts[key] += 1;
    else counts.Normal += 1;
  }
  return counts;
}

export function dominantElement(ninjas) {
  const freq = {};
  for (const n of ninjas) {
    if (!n.element_affinity) continue;
    freq[n.element_affinity] = (freq[n.element_affinity] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
