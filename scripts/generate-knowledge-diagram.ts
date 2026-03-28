#!/usr/bin/env npx tsx
/**
 * Auto-generates architecture-diagram.md from actual file references.
 * Like a database VIEW — always reflects the real state.
 *
 * Usage: npx tsx scripts/generate-knowledge-diagram.ts
 * Or:    pnpm knowledge:diagram
 */

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'fs';
import { resolve, join, relative } from 'path';

const ROOT = resolve(__dirname, '..');
const KNOWLEDGE_DIR = resolve(ROOT, '.knowledge');
const OUTPUT = resolve(KNOWLEDGE_DIR, 'architecture-diagram.md');

// ── Collect all folder CLAUDE.md references ──

interface FolderRef {
  folder: string;
  targets: string[];
}

function collectFolderRefs(): FolderRef[] {
  const refs: FolderRef[] = [];

  function walk(dir: string) {
    const claudeMd = join(dir, 'CLAUDE.md');
    if (existsSync(claudeMd)) {
      const content = readFileSync(claudeMd, 'utf-8');
      const targets = content
        .split('\n')
        .filter(l => l.startsWith('See:'))
        .map(l => l.replace('See: .knowledge/', '').trim());
      if (targets.length > 0) {
        refs.push({
          folder: relative(ROOT, dir),
          targets,
        });
      }
    }

    for (const entry of readdirSync(dir)) {
      if (['node_modules', '.git', '__screenshots__', 'build', 'dist', 'ios', 'android'].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
    }
  }

  walk(resolve(ROOT, 'src'));
  walk(resolve(ROOT, 'e2e'));
  walk(resolve(ROOT, '__tests__'));
  walk(resolve(ROOT, 'maestro'));
  return refs;
}

// ── Collect all knowledge files ──

function collectKnowledgeFiles(): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.md') && !['README.md', 'gaps.md', 'EXPLORATION.md', 'ENGINE-TYPES.md', 'architecture-diagram.md', 'index.md'].includes(entry)) {
        files.push(relative(KNOWLEDGE_DIR, full));
      }
    }
  }
  walk(KNOWLEDGE_DIR);
  return files.sort();
}

// ── Collect cross-references between knowledge files ──

interface CrossRef {
  source: string;
  target: string;
}

function collectCrossRefs(): CrossRef[] {
  const refs: CrossRef[] = [];
  const allFiles = collectKnowledgeFiles();

  for (const file of allFiles) {
    const content = readFileSync(join(KNOWLEDGE_DIR, file), 'utf-8');
    const matches = content.matchAll(/\.knowledge\/([a-zA-Z0-9/_.-]+\.md)/g);
    for (const match of matches) {
      const target = match[1];
      if (target !== file) {
        refs.push({ source: file, target });
      }
    }
  }
  return refs;
}

// ── Collect structural test references ──

function collectTestRefs(): { test: string; policies: string[] }[] {
  const testDir = resolve(ROOT, '__tests__/structure');
  if (!existsSync(testDir)) return [];

  const results: { test: string; policies: string[] }[] = [];
  for (const entry of readdirSync(testDir)) {
    if (!entry.endsWith('.test.ts')) continue;
    const content = readFileSync(join(testDir, entry), 'utf-8');
    const policies: string[] = [];

    // Look for policy references in comments or strings
    const matches = content.matchAll(/policies\/[a-z]+\/[a-z-]+\.md|models\/[a-z-]+\.md/g);
    for (const match of matches) {
      if (!policies.includes(match[0])) policies.push(match[0]);
    }

    if (policies.length > 0) {
      results.push({ test: entry, policies });
    }
  }
  return results;
}

// ── Compute connectivity ──

function computeConnectivity(folderRefs: FolderRef[], crossRefs: CrossRef[], testRefs: { test: string; policies: string[] }[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const ref of folderRefs) {
    for (const target of ref.targets) {
      counts.set(target, (counts.get(target) || 0) + 1);
    }
  }

  for (const ref of crossRefs) {
    counts.set(ref.target, (counts.get(ref.target) || 0) + 1);
  }

  for (const ref of testRefs) {
    for (const policy of ref.policies) {
      counts.set(policy, (counts.get(policy) || 0) + 1);
    }
  }

  return counts;
}

// ── Find orphaned knowledge files ──

function findOrphans(allFiles: string[], folderRefs: FolderRef[]): string[] {
  const referenced = new Set<string>();
  for (const ref of folderRefs) {
    for (const target of ref.targets) referenced.add(target);
  }

  return allFiles.filter(f => {
    // Skip types loaded on-demand or via DERIVES_FROM (not folder CLAUDE.md See: links)
    if (f.startsWith('domain/countries/')) return false;
    if (f.startsWith('templates/')) return false;
    if (f.startsWith('patterns/')) return false;
    if (f.startsWith('rubrics/')) return false;
    if (f.startsWith('facts/')) return false;
    if (f.startsWith('principles/')) return false;
    if (f.startsWith('beliefs/')) return false;
    if (f.startsWith('decisions/')) return false;
    return !referenced.has(f);
  });
}

// ── Generate markdown ──

function generate(): string {
  const folderRefs = collectFolderRefs();
  const allFiles = collectKnowledgeFiles();
  const crossRefs = collectCrossRefs();
  const testRefs = collectTestRefs();
  const connectivity = computeConnectivity(folderRefs, crossRefs, testRefs);
  const orphans = findOrphans(allFiles, folderRefs);

  const lines: string[] = [];

  lines.push('# Knowledge Graph — Entity Relationship Diagram');
  lines.push('');
  lines.push('> Auto-generated by `scripts/generate-knowledge-diagram.ts`. Do not edit manually.');
  lines.push('> Regenerate with: `npx tsx scripts/generate-knowledge-diagram.ts`');
  lines.push('');

  // Directory layout
  lines.push('## Directory Layout');
  lines.push('');
  lines.push('```');
  lines.push('.knowledge/');

  const dirs = new Map<string, string[]>();
  for (const f of allFiles) {
    const parts = f.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!dirs.has(dir)) dirs.set(dir, []);
    dirs.get(dir)!.push(parts[parts.length - 1].replace('.md', ''));
  }

  for (const [dir, files] of [...dirs.entries()].sort()) {
    if (dir === '(root)') continue;
    lines.push(`├── ${dir}/    ${files.join(', ')}`);
  }
  lines.push('```');
  lines.push('');

  // Folder CLAUDE.md → Knowledge
  lines.push('## Folder CLAUDE.md → Knowledge (Foreign Keys)');
  lines.push('');
  lines.push('```');
  for (const ref of folderRefs.sort((a, b) => a.folder.localeCompare(b.folder))) {
    const shortTargets = ref.targets.map(t => t.replace('.md', '')).join(', ');
    lines.push(`${ref.folder.padEnd(28)} → ${shortTargets}`);
  }
  lines.push('```');
  lines.push('');

  // Cross-references
  if (crossRefs.length > 0) {
    lines.push('## Knowledge Cross-References');
    lines.push('');
    lines.push('```');
    for (const ref of crossRefs) {
      lines.push(`${ref.source.replace('.md', '').padEnd(40)} → ${ref.target.replace('.md', '')}`);
    }
    lines.push('```');
    lines.push('');
  }

  // Structural tests
  if (testRefs.length > 0) {
    lines.push('## Structural Tests → Policies');
    lines.push('');
    lines.push('```');
    for (const ref of testRefs) {
      lines.push(`${ref.test.replace('.test.ts', '').padEnd(30)} → ${ref.policies.map(p => p.replace('.md', '')).join(', ')}`);
    }
    lines.push('```');
    lines.push('');
  }

  // High-connectivity nodes
  lines.push('## High-Connectivity Nodes');
  lines.push('');
  lines.push('| File | References |');
  lines.push('|---|---|');
  const sorted = [...connectivity.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sorted.slice(0, 10)) {
    lines.push(`| \`${file.replace('.md', '')}\` | ${count} |`);
  }
  lines.push('');

  // Orphans
  lines.push('## Orphaned Nodes');
  lines.push('');
  if (orphans.length === 0) {
    lines.push('None — all policy and model files are referenced by at least one folder CLAUDE.md.');
  } else {
    lines.push('| File | Issue |');
    lines.push('|---|---|');
    for (const orphan of orphans) {
      lines.push(`| \`${orphan}\` | Not referenced by any folder CLAUDE.md |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ── Main ──

const diagram = generate();
writeFileSync(OUTPUT, diagram);
console.log(`Generated: ${relative(ROOT, OUTPUT)}`);
console.log(`  ${collectFolderRefs().length} folder CLAUDE.md files`);
console.log(`  ${collectKnowledgeFiles().length} knowledge files`);
console.log(`  ${collectCrossRefs().length} cross-references`);
