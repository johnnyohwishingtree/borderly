/**
 * Structural test: skill files follow the standard format.
 *
 * Every skill SKILL.md must have:
 * - YAML frontmatter (name, description)
 * - ## Policies section (with machine-readable comment)
 * - ## Skills section
 *
 * See: .knowledge/policies/architecture/testable-architecture.md
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const SKILLS_DIR = resolve(ROOT, '.claude/skills');

function getSkillFiles(): { name: string; content: string }[] {
  const results: { name: string; content: string }[] = [];
  for (const entry of readdirSync(SKILLS_DIR)) {
    const dir = join(SKILLS_DIR, entry);
    const file = join(dir, 'SKILL.md');
    if (statSync(dir).isDirectory() && require('fs').existsSync(file)) {
      results.push({ name: entry, content: readFileSync(file, 'utf-8') });
    }
  }
  return results;
}

describe('Skill structure', () => {
  const skills = getSkillFiles();

  it('all skills have YAML frontmatter with name and description', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (!skill.content.startsWith('---')) {
        missing.push(`${skill.name}: no frontmatter`);
      } else if (!skill.content.match(/^---\n[\s\S]*?name:/m)) {
        missing.push(`${skill.name}: frontmatter missing 'name'`);
      } else if (!skill.content.match(/^---\n[\s\S]*?description:/m)) {
        missing.push(`${skill.name}: frontmatter missing 'description'`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('all skills have a ## Policies section', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (!skill.content.includes('## Policies')) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills missing ## Policies section:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('all skills have a ## Skills section', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (!skill.content.includes('## Skills')) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills missing ## Skills section:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('## Policies section is machine-readable (has comment marker)', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (skill.content.includes('## Policies') && !skill.content.includes('<!-- Machine-readable.')) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills with ## Policies but no machine-readable comment:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('## Policies lists only existing policy files', () => {
    const broken: string[] = [];
    for (const skill of skills) {
      const policiesMatch = skill.content.match(/## Policies\n(?:<!--[^>]*-->\n)?([\s\S]*?)(?=\n## )/);
      if (!policiesMatch || policiesMatch[1].trim() === 'None') continue;

      const refs = policiesMatch[1].matchAll(/`?policies\/([a-zA-Z0-9/_.-]+\.md)`?/g);
      for (const ref of refs) {
        const target = resolve(ROOT, '.knowledge/policies', ref[1]);
        if (!require('fs').existsSync(target)) {
          broken.push(`${skill.name}: policies/${ref[1]}`);
        }
      }
    }
    if (broken.length > 0) {
      throw new Error(`Skills reference non-existent policies:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });

  it('## Skills lists only existing skills', () => {
    const broken: string[] = [];
    const validSkills = new Set(readdirSync(SKILLS_DIR).filter(d =>
      statSync(join(SKILLS_DIR, d)).isDirectory()
    ));

    for (const skill of skills) {
      const skillsMatch = skill.content.match(/## Skills\n([\s\S]*?)(?=\n## )/);
      if (!skillsMatch || skillsMatch[1].trim() === 'None') continue;

      const refs = skillsMatch[1].matchAll(/^- `?\/([a-z][-a-z]+)`?/gm);
      for (const ref of refs) {
        if (!validSkills.has(ref[1])) {
          broken.push(`${skill.name}: /${ref[1]}`);
        }
      }
    }
    if (broken.length > 0) {
      throw new Error(`Skills reference non-existent skills:\n${broken.map(b => `  - ${b}`).join('\n')}`);
    }
  });
});
