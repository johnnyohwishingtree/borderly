/**
 * Constraint: Skill Structure
 *
 * Every skill SKILL.md must have:
 * - YAML frontmatter (name, description)
 * - ## Prerequisites section
 * - Numbered steps (## Step N: or ### Step N:)
 * - ## Guardrails section
 *
 * See: __tests__/constraints/knowledge-test-coverage.test.ts (testable architecture constraint)
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const SKILLS_DIR = resolve(ROOT, '.claude/skills');

function getSkillFiles(): { name: string; content: string }[] {
  const results: { name: string; content: string }[] = [];
  for (const entry of readdirSync(SKILLS_DIR)) {
    const dir = join(SKILLS_DIR, entry);
    const file = join(dir, 'SKILL.md');
    if (statSync(dir).isDirectory() && existsSync(file)) {
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

  it('all skills have a ## Prerequisites section', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (!skill.content.includes('## Prerequisites')) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills missing ## Prerequisites:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('all skills have sequential steps', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      const hasHeadingSteps = /^#{2,3} Step \d+/m.test(skill.content);
      const hasNumberedList = /^## Steps[\s\S]*?\n\d+\.\s/m.test(skill.content);
      const hasNamedSections = /^## (Prerequisites|Usage|Output|Epic Structure|What It Does)/m.test(skill.content);
      // Skills are either step-based workflows OR reference docs with named sections
      if (!hasHeadingSteps && !hasNumberedList && !hasNamedSections) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills missing sequential steps or named sections:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });

  it('all skills have a ## Guardrails section', () => {
    const missing: string[] = [];
    for (const skill of skills) {
      if (!skill.content.includes('## Guardrails')) {
        missing.push(skill.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Skills missing ## Guardrails:\n${missing.map(s => `  - ${s}`).join('\n')}`);
    }
  });
});
