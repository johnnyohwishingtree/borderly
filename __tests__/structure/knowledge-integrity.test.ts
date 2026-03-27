/**
 * Structural test: knowledge graph integrity.
 *
 * Verifies that all cross-references in the knowledge system resolve:
 * - Folder CLAUDE.md `See:` links point to existing .knowledge/ files
 * - Skill files that reference .knowledge/ policies point to existing files
 * - .knowledge/ files that reference other .knowledge/ files point to existing files
 * - .knowledge/index.md lists all skills and policy scopes that exist on disk
 *
 * See: .knowledge/policies/architecture/testable-architecture.md
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const ROOT = resolve(__dirname, '../..');
const KNOWLEDGE_DIR = resolve(ROOT, '.knowledge');
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

describe('Knowledge integrity', () => {
  it('all folder CLAUDE.md See: links point to existing files', () => {
    const claudeMds = walk(resolve(ROOT, 'src'), '.md')
      .concat(walk(resolve(ROOT, '__tests__'), '.md'))
      .filter(f => f.endsWith('CLAUDE.md'));

    const broken: string[] = [];

    for (const file of claudeMds) {
      const content = readFileSync(file, 'utf-8');
      const seeRefs = extractReferences(content, /See:\s*\.knowledge\/([^\s]+)/g);
      for (const ref of seeRefs) {
        const target = resolve(KNOWLEDGE_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .knowledge/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken See: links in CLAUDE.md files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all skill policy references point to existing files', () => {
    const skillFiles = walk(SKILLS_DIR, '.md');
    const broken: string[] = [];

    for (const file of skillFiles) {
      const content = readFileSync(file, 'utf-8');
      const knowledgeRefs = extractReferences(content, /\.knowledge\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of knowledgeRefs) {
        const target = resolve(KNOWLEDGE_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .knowledge/${ref}`);
        }
      }

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

  it('all knowledge cross-references point to existing files', () => {
    const knowledgeFiles = walk(KNOWLEDGE_DIR, '.md')
      .filter(f => !f.endsWith('README.md'));
    const broken: string[] = [];

    for (const file of knowledgeFiles) {
      const content = readFileSync(file, 'utf-8');
      const refs = extractReferences(content, /\.knowledge\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of refs) {
        const target = resolve(KNOWLEDGE_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .knowledge/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken cross-references in .knowledge/ files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('all test file knowledge references point to existing files', () => {
    const testFiles = walk(resolve(ROOT, '__tests__/structure'), '.ts');
    const broken: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, 'utf-8');
      const knowledgeRefs = extractReferences(content, /\.knowledge\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of knowledgeRefs) {
        const target = resolve(KNOWLEDGE_DIR, ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .knowledge/${ref}`);
        }
      }

      const ruleRefs = extractReferences(content, /\.claude\/rules\/([a-zA-Z0-9/_.-]+\.md)/g);
      for (const ref of ruleRefs) {
        const target = resolve(ROOT, '.claude/rules', ref);
        if (!existsSync(target)) {
          broken.push(`${relative(ROOT, file)} → .claude/rules/${ref}`);
        }
      }
    }

    if (broken.length > 0) {
      throw new Error(`Broken references in test files:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('index.md lists all skills that exist on disk', () => {
    const indexContent = readFileSync(resolve(KNOWLEDGE_DIR, 'index.md'), 'utf-8');
    const skillDirs = readdirSync(SKILLS_DIR).filter(d =>
      statSync(join(SKILLS_DIR, d)).isDirectory()
    );

    const unlisted: string[] = [];
    for (const skill of skillDirs) {
      if (!indexContent.includes(`skills/${skill}/`)) {
        unlisted.push(skill);
      }
    }

    if (unlisted.length > 0) {
      throw new Error(`Skills on disk but not in index.md:\n${unlisted.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('index.md lists all policy scopes that exist on disk', () => {
    const indexContent = readFileSync(resolve(KNOWLEDGE_DIR, 'index.md'), 'utf-8');
    const policiesDir = resolve(KNOWLEDGE_DIR, 'policies');
    const scopes = readdirSync(policiesDir).filter(d =>
      statSync(join(policiesDir, d)).isDirectory()
    );

    const unlisted: string[] = [];
    for (const scope of scopes) {
      if (!indexContent.includes(`\`${scope}/\``)) {
        unlisted.push(scope);
      }
    }

    if (unlisted.length > 0) {
      throw new Error(`Policy scopes on disk but not in index.md:\n${unlisted.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('all rules referenced in index.md exist on disk', () => {
    const indexContent = readFileSync(resolve(KNOWLEDGE_DIR, 'index.md'), 'utf-8');
    const ruleRefs = extractReferences(indexContent, /rules\/([a-zA-Z0-9_-]+\.md)/g);
    const missing: string[] = [];

    for (const ref of ruleRefs) {
      if (!existsSync(resolve(RULES_DIR, ref))) {
        missing.push(ref);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Rules in index.md that don't exist:\n${missing.map(r => `  - ${r}`).join('\n')}`);
    }
  });
});
