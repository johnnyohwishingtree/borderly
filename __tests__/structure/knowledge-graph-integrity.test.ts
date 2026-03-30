/**
 * Constraint: Knowledge Graph Integrity
 *
 * Validates that the knowledge graph is internally consistent: all Context
 * references resolve, all policies have a Context section, and all "See:"
 * and "Related:" pointers in CLAUDE.md and knowledge files resolve to
 * existing files.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const CONTEXT = resolve(ROOT, '.context');

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
  const knowledgeFiles = findMdFiles(CONTEXT);

  it('all Context references resolve to existing files', () => {
    const broken: string[] = [];

    for (const file of knowledgeFiles) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(ROOT + '/', '');

      // Check .context/ references
      const contextRefs = [...content.matchAll(/`\.context\/([a-zA-Z0-9/_.-]+\.md)`/g)];
      for (const ref of contextRefs) {
        const target = resolve(ROOT, '.context', ref[1]);
        if (!existsSync(target)) {
          broken.push(`${relativePath}: Context → .context/${ref[1]} (not found)`);
        }
      }

      // Check .context/ references without backticks (in - list items)
      const dashRefs = [...content.matchAll(/- `?\.context\/([a-zA-Z0-9/_.-]+\.md)`?/g)];
      for (const ref of dashRefs) {
        const target = resolve(ROOT, '.context', ref[1]);
        if (!existsSync(target)) {
          // Skip if already caught above
          const msg = `${relativePath}: Context → .context/${ref[1]} (not found)`;
          if (!broken.includes(msg)) broken.push(msg);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken Context references:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all policies have a Context section', () => {
    const policiesDir = resolve(CONTEXT, 'policies');
    const policyFiles = findMdFiles(policiesDir);
    const missing: string[] = [];

    for (const file of policyFiles) {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(ROOT + '/', '');
      // Accept either old "Derives From" or new "Context" section
      if (!content.includes('## Context') && !content.includes('## Derives From')) {
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Policies without context justification:\n${missing.map(m => `  - ${m}`).join('\n')}`
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
        // Try common locations — .knowledge/, .context/, src/, and project root
        const candidates = [
          resolve(CONTEXT, ref),
          resolve(CONTEXT, 'policies', ref),
          resolve(ROOT, ref),
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
