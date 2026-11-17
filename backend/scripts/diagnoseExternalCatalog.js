#!/usr/bin/env node
// Diagnostic en lecture seule de catalogues bruts destinés à defineCard.
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { ALL_CARDS, validateCatalog } from './seedCards.js';
import { defineCard, assertOriginalNaming } from './lib/cardFactory.js';
import { STAT_TYPES, ELEMENTS } from '../src/services/cardService.js';

// Inventaire manuel de cardEffects.js et combatArts.js, pas une garantie de sémantique.
const PVE_EFFECTS = new Set([
  'draw',
  'gain_energy',
  'gain_chakra',
  'gain_block',
  'apply_status',
  'evade_next',
  'counter',
  'multi_strike',
  'bonus_if',
  'aoe',
  'heal_self',
  'heal',
  'cleanse_self',
  'exile_enemy_card',
  'seal_intent',
  'innate_crit',
  'crit',
]);

// Accepte uniquement le format exporté par le livrable : defineCard({ JSON }), sans évaluer le JS.
export function parseJsCatalog(source) {
  const prefix =
    /^\s*(?:\/\*\*[\s\S]*?\*\/\s*)?import\s*\{\s*defineCard\s*\}\s*from\s*['"][^'"\r\n]+['"];\s*export\s+const\s+EXPANSION_V3_CARDS\s*=\s*\[/;
  const match = source.match(prefix);
  if (!match) throw new Error('En-tête JS non reconnu');
  let rest = source.slice(match[0].length);
  const cards = [];
  for (;;) {
    rest = rest.trimStart();
    if (/^\];\s*$/.test(rest)) return cards;
    if (cards.length) {
      if (!rest.startsWith(',')) throw new Error('Séparateur JS attendu');
      rest = rest.slice(1).trimStart();
    }
    if (!rest.startsWith('defineCard(')) throw new Error('defineCard attendu');
    rest = rest.slice('defineCard('.length).trimStart();
    if (!rest.startsWith('{')) throw new Error('Objet JSON attendu');
    let depth = 0,
      inString = false,
      escaped = false,
      end = -1;
    for (let i = 0; i < rest.length; i += 1) {
      const ch = rest[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}' && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) throw new Error('Objet JS incomplet');
    cards.push(JSON.parse(rest.slice(0, end)));
    rest = rest.slice(end).trimStart();
    if (!rest.startsWith(')')) throw new Error('Fermeture defineCard attendue');
    rest = rest.slice(1);
  }
}

export function diagnose(cards, existing = ALL_CARDS) {
  if (!Array.isArray(cards)) throw new Error('Le catalogue doit être un tableau');
  const errors = [],
    warnings = [],
    normalized = [],
    effects = {};
  const seen = new Set(),
    existingSlugs = new Set(existing.map(c => c.slug));
  for (const [index, card] of cards.entries()) {
    const label = card?.slug || `#${index + 1}`;
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      errors.push(`${label}: objet attendu`);
      continue;
    }
    if (seen.has(card.slug)) errors.push(`${label}: slug externe dupliqué`);
    seen.add(card.slug);
    if (existingSlugs.has(card.slug)) errors.push(`${label}: slug déjà présent dans ALL_CARDS`);
    try {
      assertOriginalNaming([card]);
    } catch (error) {
      errors.push(error.message);
    }
    if (!STAT_TYPES.includes(card.statType))
      errors.push(`${label}: statType non reconnu: ${card.statType}`);
    if (card.element != null && !ELEMENTS.includes(card.element))
      errors.push(`${label}: élément non reconnu: ${card.element}`);
    if (card.effects != null && !Array.isArray(card.effects))
      errors.push(`${label}: effects doit être un tableau`);
    else
      for (const effect of card.effects || []) {
        const type = effect?.type;
        if (typeof type !== 'string' || !type) {
          errors.push(`${label}: effet sans type`);
          continue;
        }
        effects[type] ||= { count: 0, cards: [], recognizedPve: PVE_EFFECTS.has(type) };
        effects[type].count += 1;
        effects[type].cards.push(label);
      }
    try {
      const defined = defineCard(card);
      validateCatalog([defined]);
      normalized.push(defined);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }
  for (const [type, info] of Object.entries(effects)) {
    if (!info.recognizedPve)
      warnings.push(`${type}: ${info.count} effet(s) non reconnu(s) par l'inventaire PvE`);
  }
  return { total: cards.length, normalized: normalized.length, errors, warnings, effects };
}

async function main() {
  const [jsonPath, jsPath, ...extra] = process.argv.slice(2);
  if (!jsonPath || extra.length)
    throw new Error(
      'Usage: node backend/scripts/diagnoseExternalCatalog.js <catalogue.json> [cardExpansionV3.js]',
    );
  const cards = JSON.parse(await readFile(jsonPath, 'utf8'));
  const result = diagnose(cards);
  if (jsPath) {
    const jsCards = parseJsCatalog(await readFile(jsPath, 'utf8'));
    result.jsComparison = { total: jsCards.length, identical: isDeepStrictEqual(cards, jsCards) };
    if (!result.jsComparison.identical)
      result.errors.push('Les définitions JSON et JS diffèrent (ordre compris)');
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length || result.warnings.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 2;
  });
}
