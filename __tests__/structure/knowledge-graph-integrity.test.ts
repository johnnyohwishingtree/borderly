/**
 * Structural test: knowledge graph integrity.
 *
 * Validates that the knowledge graph is internally consistent:
 * - All "Derives From" references resolve to existing files
 * - All "See:" pointers in CLAUDE.md files resolve
 * - All policies have at least one "Derives From" fact
 * - All "Related:" references resolve
 *
 * This catches: missing facts, broken references, policies without justification.
 * State-based — checks the graph is valid NOW, not how it got that way.
 *
 * See: .knowledge/policies/architecture/testable-architecture.md
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const KNOWLEDGE = resolve(ROOT, '.knowledge');

/** Recursively find all .md files in a directory. */
function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findMdFiles(full));
    } else if (entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/** Extract "Derives From" references from a knowledge file. */
function extractDerivesFrom(content: string): string[] {
  const refs: string[] = [];
  const section = content.match(/## Derives From\n([\s\S]*?)(?=\n##|$)/);
  if (!section) return refs;
  const lines = section[1].split('\n');
  for (const line of lines) {
    const match = line.match(/^- `(.+?)`/);
    if (match) refs.push(match[1]);
  }
  return refs;
}

/** Extract "See:" references from a file. */
function extractSeeRefs(content: string): string[] {
  const refs: string[] = [];
  const matches = content.matchAll(/See:\s+\.knowledge\/(.+\.md)/g);
  for (const m of matches) refs.push(m[1]);
  // Also match See: without .knowledge/ prefix
  const matches2 = content.matchAll(/See:\s+([a-z][\w/-]+\.md)/g);
  for (const m of matches2) {
    if (!refs.includes(m[1])) refs.push(m[1]);
  }
  return refs;
}

/** Extract "Related:" references from a file. */
function extractRelatedRefs(content: string): string[] {
  const refs: string[] = [];
  const matches = content.matchAll(/Related:\s+(?:\.knowledge\/)?(?:policies\/|models\/|patterns\/)?(.+\.md)/g);
  for (const m of matches) refs.push(m[1]);
  return refs;
}

describe('Knowledge graph integrity', () => {
  const knowledgeFiles = findMdFiles(KNOWLEDGE);

  it('all "Derives From" references resolve to existing files', () => {
    const broken: string[] = [];

    for (const file of knowledgeFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractDerivesFrom(content);
      const relativePath = file.replace(ROOT + '/', '');

      for (const ref of refs) {
        // Try resolving relative to .knowledge/
        const resolved = resolve(KNOWLEDGE, ref + (ref.endsWith('.md') ? '' : '.md'));
        if (!existsSync(resolved)) {
          broken.push(`${relativePath}: "Derives From" → ${ref} (not found)`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken "Derives From" references:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all policies have at least one "Derives From" entry', () => {
    const policiesDir = resolve(KNOWLEDGE, 'policies');
    const policyFiles = findMdFiles(policiesDir);
    const missing: string[] = [];

    for (const file of policyFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractDerivesFrom(content);
      const relativePath = file.replace(ROOT + '/', '');

      if (refs.length === 0) {
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Policies without "Derives From" (every policy must trace to facts):\n${missing.map(m => `  - ${m}`).join('\n')}`
      );
    }
  });

  it('all "See:" pointers in CLAUDE.md files resolve', () => {
    const claudeMdFiles: string[] = [];

    // Find all CLAUDE.md files in project
    function findClaudeMd(dir: string) {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git') continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          findClaudeMd(full);
        } else if (entry === 'CLAUDE.md') {
          claudeMdFiles.push(full);
        }
      }
    }
    findClaudeMd(resolve(ROOT, 'src'));
    findClaudeMd(resolve(ROOT, '__tests__'));
    findClaudeMd(resolve(ROOT, 'e2e'));

    const broken: string[] = [];
    for (const file of claudeMdFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractSeeRefs(content);
      const relativePath = file.replace(ROOT + '/', '');

      for (const ref of refs) {
        const resolved = resolve(ROOT, '.knowledge', ref);
        if (!existsSync(resolved)) {
          broken.push(`${relativePath}: See → .knowledge/${ref} (not found)`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken "See:" references:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all "Related:" references in knowledge files resolve', () => {
    const broken: string[] = [];

    for (const file of knowledgeFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractRelatedRefs(content);
      const relativePath = file.replace(ROOT + '/', '');

      for (const ref of refs) {
        // Try common locations
        const candidates = [
          resolve(KNOWLEDGE, ref),
          resolve(KNOWLEDGE, 'policies', ref),
          resolve(KNOWLEDGE, 'models', ref),
          resolve(KNOWLEDGE, 'patterns', ref),
        ];
        const found = candidates.some(c => existsSync(c));
        if (!found) {
          broken.push(`${relativePath}: Related → ${ref} (not found)`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken "Related:" references:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });
});
