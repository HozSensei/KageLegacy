/**
 * Audit FR/EN des catalogues seed (cartes, talents, BP).
 * Usage: node scripts/auditCatalogI18n.js
 * Exit 1 si name/description EN manquant (hors noms volontairement identiques).
 */
import { EXPANSION_CARDS } from './data/cardExpansion.js';
import { TALENT_NODE_DEFS } from './data/talentTreeNodes.js';
import { buildSeason1QuestDefs } from './data/battlePassSeason1.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseStarterCards() {
  const src = readFileSync(join(__dirname, 'seedCards.js'), 'utf8');
  const cards = [];
  const re =
    /slug:\s*'([^']+)'[\s\S]*?nameFr:\s*'([^']+)'[\s\S]*?nameEn:\s*'([^']+)'[\s\S]*?descriptionFr:\s*'([^']+)'[\s\S]*?descriptionEn:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    cards.push({
      slug: m[1],
      nameFr: m[2],
      nameEn: m[3],
      descriptionFr: m[4],
      descriptionEn: m[5],
    });
  }
  return cards;
}

function hasFrenchOnly(text) {
  return /[àâäéèêëîïôöùûüç]/i.test(text || '');
}

function auditCards() {
  const starters = parseStarterCards();
  const bySlug = new Map(EXPANSION_CARDS.map((c) => [c.slug, c]));
  for (const s of starters) {
    if (!bySlug.has(s.slug)) bySlug.set(s.slug, s);
  }
  const all = [...bySlug.values()];
  const missing = all.filter((c) => !c.nameEn || !c.descriptionEn);
  const descStillFr = all.filter(
    (c) => c.descriptionEn && hasFrenchOnly(c.descriptionEn) && c.descriptionEn === c.descriptionFr
  );
  return { total: all.length, missing, descStillFr };
}

function auditTalents() {
  const missing = TALENT_NODE_DEFS.filter((n) => !n.nameEn || (n.descFr && !n.descEn));
  const sameDesc = TALENT_NODE_DEFS.filter((n) => n.descFr && n.descEn && n.descFr === n.descEn);
  return { total: TALENT_NODE_DEFS.length, missing, sameDesc };
}

function auditQuests() {
  const now = new Date('2026-11-01T00:00:00.000Z');
  const end = new Date('2027-02-01T00:00:00.000Z');
  const defs = buildSeason1QuestDefs(now, end);
  const missing = defs.filter((q) => !q.description_en || !q.description_fr);
  const same = defs.filter((q) => q.description_en === q.description_fr);
  return { total: defs.length, missing, same };
}

const cards = auditCards();
const talents = auditTalents();
const quests = auditQuests();

console.log('=== Catalog i18n audit ===');
console.log(
  `Cards: ${cards.total} — missing EN: ${cards.missing.length}, FR-stuck desc: ${cards.descStillFr.length}`
);
cards.missing.slice(0, 10).forEach((c) => console.log('  !', c.slug));
console.log(
  `Talents: ${talents.total} — missing EN: ${talents.missing.length}, identical desc: ${talents.sameDesc.length}`
);
console.log(
  `BP quests: ${quests.total} — missing EN: ${quests.missing.length}, identical: ${quests.same.length}`
);

const fail = cards.missing.length + talents.missing.length + quests.missing.length;
process.exit(fail ? 1 : 0);
