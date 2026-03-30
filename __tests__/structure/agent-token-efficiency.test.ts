/**
 * Constraint: Agent Token Efficiency
 *
 * Decision: All agent-facing processes produce artifacts on disk, not inline in
 *   conversation. Shell scripts for deterministic tasks. Hooks produce zero stdout.
 *   Data collection in shell, LLM analysis batched into scheduled runs.
 * Rejected: Per-conversation LLM agents for knowledge sync (21k tokens per conversation).
 *   Inline memory injection (auto-memory style, adds tokens every session). Runtime
 *   element dumps when static source code has the same info. Spawning LLM agents for
 *   work that grep can accomplish.
 *
 * REQUIRE: hooks in .claude/hooks/ produce zero stdout (any output = token cost)
 * REQUIRE: shell scripts for deterministic tasks (grep, git diff, file append)
 * DENY:    echo/printf to stdout in hook scripts (must redirect to file or /dev/null)
 *
 * Why: Hook stdout is token cost (.context/external/tools/hook-stdout-is-token-cost.md)
 *      Shell beats LLM for deterministic work (.context/external/tools/shell-beats-llm-for-deterministic-work.md)
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const HOOKS_DIR = resolve(ROOT, '.claude/hooks');

describe('Agent token efficiency', () => {
  it('all hook scripts in .claude/hooks/ produce zero stdout', () => {
    let hookFiles: string[];
    try {
      hookFiles = readdirSync(HOOKS_DIR).filter(f => f.endsWith('.sh'));
    } catch {
      // No hooks directory — nothing to test
      return;
    }

    const violations: string[] = [];

    for (const file of hookFiles) {
      const content = readFileSync(join(HOOKS_DIR, file), 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') continue;

        // Skip lines where echo/printf appear only inside $(...) command substitution
        // These capture output into variables, not stdout
        if (/\$\(.*\b(echo|printf)\b/.test(line) && !/^\s*(echo|printf)\b/.test(line)) continue;

        // Skip lines where echo/printf appear only inside quotes (string literals)
        if (/["'].*\b(echo|printf)\b.*["']/.test(line) && !/^\s*(echo|printf)\b/.test(line)) continue;

        // Check for echo/printf as actual commands (at start of line or after ; or |)
        const isActualCommand = /(?:^|[;&|])\s*(echo|printf)\b/.test(line);
        if (!isActualCommand) continue;

        // Allow if redirected to a file or /dev/null
        const hasRedirect = />>?\s*["$\/]/.test(line) || />&2/.test(line) || />\s*\/dev\/null/.test(line);

        if (!hasRedirect) {
          violations.push(`${file}:${i + 1}: ${line}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('all hook scripts end with exit 0', () => {
    let hookFiles: string[];
    try {
      hookFiles = readdirSync(HOOKS_DIR).filter(f => f.endsWith('.sh'));
    } catch {
      return;
    }

    const violations: string[] = [];

    for (const file of hookFiles) {
      const content = readFileSync(join(HOOKS_DIR, file), 'utf-8');
      const trimmed = content.trimEnd();
      const lastLine = trimmed.split('\n').pop()?.trim() || '';

      if (lastLine !== 'exit 0') {
        violations.push(`${file}: last line is "${lastLine}" (expected "exit 0")`);
      }
    }

    expect(violations).toEqual([]);
  });
});
