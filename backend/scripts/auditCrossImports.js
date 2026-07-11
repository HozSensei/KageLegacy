#!/usr/bin/env node
/**
 * Croise les exports du backend avec les appels — signale les imports manquants probables.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '../src');

const IGNORED_CALLS = new Set(['next', 'require', 'resolve', 'reject']);

function walkJsFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkJsFiles(full, acc);
    else if (entry.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function collectExports(source, filePath) {
  const names = new Set();
  const patterns = [
    /\bexport\s+async\s+function\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+function\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\bexport\s+class\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s*\{([^}]+)\}/g,
  ];

  for (const re of patterns.slice(0, 4)) {
    let match;
    while ((match = re.exec(source))) names.add(match[1]);
  }

  let match;
  const exportBlock = /\bexport\s*\{([^}]+)\}/g;
  while ((match = exportBlock.exec(source))) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const exported = trimmed.split(/\s+as\s+/)[0].trim();
      if (exported) names.add(exported);
    }
  }

  return [...names].map((name) => ({ name, file: filePath }));
}

function collectImports(source) {
  const names = new Set();
  const importRe =
    /import\s+(?:(?:\{([^}]+)\})|([A-Za-z_$][\w$]*)|(?:\*\s+as\s+([A-Za-z_$][\w$]*)))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(source))) {
    if (match[1]) {
      for (const part of match[1].split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        names.add(trimmed.split(/\s+as\s+/).pop().trim());
      }
    }
    if (match[2]) names.add(match[2]);
    if (match[3]) names.add(match[3]);
  }

  const dynamicRe =
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*await\s+import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRe.exec(source))) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      names.add(trimmed.split(/\s+as\s+/).pop().trim());
    }
  }

  return names;
}

function collectLocalBindings(source) {
  const names = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)/g,
    /\basync\s+function\s+([A-Za-z_$][\w$]*)/g,
    /\bclass\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    /\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(source))) names.add(match[1]);
  }
  return names;
}

function collectCallSites(source) {
  const calls = [];
  const re = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = re.exec(source))) {
    calls.push({ name: match[1], index: match.index });
  }
  return calls;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function rel(filePath) {
  return path.relative(path.resolve(__dirname, '..'), filePath);
}

function main() {
  const files = walkJsFiles(SRC_ROOT);
  const exportMap = new Map();

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    for (const entry of collectExports(raw, file)) {
      if (!exportMap.has(entry.name)) exportMap.set(entry.name, []);
      exportMap.get(entry.name).push(entry.file);
    }
  }

  const issues = [];

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const stripped = stripCommentsAndStrings(raw);
    const imports = collectImports(raw);
    const locals = collectLocalBindings(raw);
    const known = new Set([...imports, ...locals]);

    for (const call of collectCallSites(stripped)) {
      if (IGNORED_CALLS.has(call.name) || known.has(call.name)) continue;
      const exporters = exportMap.get(call.name);
      if (!exporters?.length) continue;
      if (exporters.length === 1 && exporters[0] === file) continue;
      issues.push({
        file,
        line: lineNumberAt(raw, call.index),
        name: call.name,
        exportedFrom: exporters.map(rel),
      });
    }
  }

  if (!issues.length) {
    console.log(`auditCrossImports: OK (${files.length} fichiers)`);
    return;
  }

  console.error(`auditCrossImports: ${issues.length} import(s) manquant(s) probable(s)\n`);
  for (const issue of issues) {
    console.error(
      `  ${rel(issue.file)}:${issue.line}  ${issue.name}()  ← exporté depuis ${issue.exportedFrom.join(', ')}`
    );
  }
  process.exit(1);
}

main();
