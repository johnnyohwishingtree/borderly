/**
 * Constraint: System Integrity (Drift Detection)
 *
 * Scope: src/, e2e/, .context/, .claude/
 *
 * Verifies all cross-references resolve:
 * - Folder CLAUDE.md See: links → .context/, __tests__/constraints/, src/ types
 * - Skills → structural tests, rules, .context/ files
 * - .context/ files → other .context/ files
 * - Test file comments → .context/ files
 *
 * REQUIRE: after renaming/moving files → grep for old paths in all .md
 * DENY:    references to files that don't exist
 *
 * Anti-patterns:
 * - Renaming a file without grepping for references
 * - Trusting CI will catch drift (most drift is in docs/config, not code)
 *
 * Why: Broken references mean the LLM gets wrong guidance when editing code.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const ROOT = resolve(__dirname, '../..');
const CONTEXT_DIR = resolve(ROOT, '.context');
const SKILLS_DIR = resolve(ROOT, '.claude/skills');
const RULES_DIR = resolve(ROOT, '.claude/rules');

function walk(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full, ext));
    } else if (entry.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function extractReferences(content: string, pattern: RegExp): string[] {
  const refs: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

describe('System integrity', () => {
  it('all folder CLAUDE.md See: links point to existing files', () => {
    const claudeMds = walk(resolve(ROOT, 'src'), '.md')
      .concat(walk(resolve(ROOT, '__tests__'), '.md'))
      .filter(f => f.endsWith('CLAUDE.md'));

    const broken: string[] = [];

    for (const file of claudeMds) {
      const content = readFileSync(file, 'utf-8');
      // Check .context/ references
      const contextRefs = extractReferences(content, /See:\s*\.context\/([^\s]+)/g);
      for (const ref of contextRefs) {
        const target = resolve(ROOT, '.context', ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .context/${ref}`);
        }
      }
      // Check src/ references
      const srcRefs = extractReferences(content, /See:\s*(src\/[^\s]+)/g);
      for (const ref of srcRefs) {
        const target = resolve(ROOT, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → ${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken See: links in CLAUDE.md files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all skill references point to existing files', () => {
    const skillFiles = walk(SKILLS_DIR, '.md');
    const broken: string[] = [];

    for (const file of skillFiles) {
      const content = readFileSync(file, 'utf-8');
      // Check .context/ references
      const contextRefs = extractReferences(content, /\.context\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of contextRefs) {
        const target = resolve(CONTEXT_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .context/${ref}`);
        }
      }
      // Check .claude/rules/ references
      const ruleRefs = extractReferences(content, /\.claude\/rules\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of ruleRefs) {
        const target = resolve(ROOT, '.claude/rules', ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .claude/rules/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken references in skill files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all .context/ cross-references point to existing files', () => {
    const contextFiles = walk(CONTEXT_DIR, '.md')
      .filter(f => !f.endsWith('README.md'));
    const broken: string[] = [];

    for (const file of contextFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractReferences(content, /\.context\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of refs) {
        const target = resolve(CONTEXT_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .context/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken cross-references in .context/ files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all .context/ references in test files point to existing files', () => {
    const testFiles = walk(resolve(ROOT, '__tests__/constraints'), '.ts');
    const broken: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, 'utf-8');
      const contextRefs = extractReferences(content, /\.context\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of contextRefs) {
        const target = resolve(ROOT, '.context', ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .context/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken .context/ references in test files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });
});
