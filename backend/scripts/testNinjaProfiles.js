import { inferPrimaryArt, inferPotential } from '../src/services/ninjaProfile.js';
import { generateNinjaProfile, pickPrimaryArt, rollPotential } from '../src/services/ninjaGenerator.js';

const mockClan = { id: 1, name: 'Yukisawa', is_noble: false, genjutsu_bonus: 2, intelligence_bonus: 3, speed_bonus: 0, ninjutsu_bonus: 0, moral_variance: 0 };

const samples = [];
for (let i = 0; i < 20; i += 1) {
  const p = await generateNinjaProfile({ clan: mockClan, grade: 'Genin', characterTrait: 'Brute' });
  samples.push(p);
}

const arts = {};
const pots = {};
for (const s of samples) {
  arts[s.primary_art] = (arts[s.primary_art] || 0) + 1;
  pots[s.potential] = (pots[s.potential] || 0) + 1;
}

console.log('Yukisawa 20 genin — voies:', arts);
console.log('Yukisawa 20 genin — potentiel:', pots);

const spread = samples.slice(0, 5).map((s) => ({
  name: s.name,
  art: s.primary_art,
  pot: s.potential,
  tai: s.taijutsu,
  nin: s.ninjutsu,
  gen: s.genjutsu,
  med: s.medecine,
}));
console.log('Exemples:', spread);

const flat = await generateNinjaProfile({ clan: { ...mockClan, name: 'Nagihara' }, grade: 'Genin' });
console.assert(inferPrimaryArt(flat) !== undefined);
console.assert(['ordinaire', 'prometteur', 'prodige'].includes(inferPotential(flat)));

console.log('ninjaProfiles: OK');
