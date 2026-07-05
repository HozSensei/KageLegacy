import { pickClanForRecruitment, partitionClans } from '../src/services/clanRecruitment.js';

const clans = [
  { name: 'Roturier', is_noble: false },
  { name: 'Nara', is_noble: true },
  { name: 'Uchiwa', is_noble: true },
  { name: 'Hyuga', is_noble: true },
  { name: 'Sarutobi', is_noble: false },
  { name: 'Akimichi', is_noble: false },
  { name: 'Yamanaka', is_noble: false },
];

const counts = { roturier: 0, noble: 0, common: 0 };
const n = 5000;
for (let i = 0; i < n; i += 1) {
  const c = pickClanForRecruitment(clans);
  if (c.name === 'Roturier') counts.roturier += 1;
  else if (c.is_noble) counts.noble += 1;
  else counts.common += 1;
}

console.log(`Tirage ${n} recrutements:`, {
  roturier: `${((counts.roturier / n) * 100).toFixed(1)}%`,
  common: `${((counts.common / n) * 100).toFixed(1)}%`,
  noble: `${((counts.noble / n) * 100).toFixed(1)}%`,
});

const parts = partitionClans(clans);
console.assert(parts.roturier.length === 1);
console.assert(parts.noble.length === 3);
console.assert(parts.common.length === 3);

console.log('clanRecruitment: OK');
