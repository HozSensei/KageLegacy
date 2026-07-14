function rollPercent() {
  return Math.floor(Math.random() * 100) + 1;
}

function simulateCycloneLegendaryRate(samples = 10000) {
  let legendary = 0;
  for (let i = 0; i < samples; i += 1) {
    const roll = rollPercent();
    if (roll >= 96) legendary += 1;
  }
  const rate = legendary / samples;
  console.assert(rate > 0.03 && rate < 0.07, `cyclone legendary ~5% got ${(rate * 100).toFixed(2)}%`);
  console.log(`cyclone legendary rate: ${(rate * 100).toFixed(2)}% (${samples} rolls)`);
}

function simulateRoutineBonus(samples = 10000) {
  let bonus = 0;
  for (let i = 0; i < samples; i += 1) {
    if (rollPercent() <= 20) bonus += 1;
  }
  const rate = bonus / samples;
  console.assert(rate > 0.16 && rate < 0.24, `routine bonus ~20% got ${(rate * 100).toFixed(2)}%`);
  console.log(`routine bonus rate: ${(rate * 100).toFixed(2)}%`);
}

simulateCycloneLegendaryRate();
simulateRoutineBonus();
console.log('missionLoot simulation OK');
