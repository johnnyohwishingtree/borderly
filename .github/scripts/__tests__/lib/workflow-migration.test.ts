import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load as loadYaml } from 'js-yaml';

const WORKFLOWS_DIR = join(__dirname, '../../../workflows');

function getWorkflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .filter((f) => f !== 'CLAUDE.md');
}

function readWorkflow(filename: string): string {
  return readFileSync(join(WORKFLOWS_DIR, filename), 'utf-8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWorkflow(filename: string): any {
  return loadYaml(readWorkflow(filename));
}

describe('lib.sh migration completeness', () => {
  it('no workflow references BASH_ENV: lib.sh', () => {
    const failures: string[] = [];
    for (const file of getWorkflowFiles()) {
      const content = readWorkflow(file);
      if (content.includes('BASH_ENV') && content.includes('lib.sh')) {
        failures.push(file);
      }
    }
    expect(failures, `Workflows still referencing BASH_ENV lib.sh: ${failures.join(', ')}`).toEqual(
      [],
    );
  });

  it('no workflow calls old bash lib.sh functions directly', () => {
    const libFunctions = [
      'setup_git_auth',
      'merge_master_into_branch',
      'check_changes_and_commit',
      'smart_push',
      'comment_on_issue',
      'dispatch_workflow',
      'approve_and_merge',
      'count_approvals',
      'count_unresolved_threads',
      'resolve_all_threads',
      'check_ci_status',
      'is_workflow_active',
      'count_critical_comments',
      'get_next_pending_story',
      'trigger_story_agent',
      'get_pr_number',
      'count_fix_attempts',
      'parse_repo',
    ];

    const failures: string[] = [];
    for (const file of getWorkflowFiles()) {
      const content = readWorkflow(file);
      for (const fn of libFunctions) {
        // Match function calls (word boundary) but not inside comments or strings mentioning them
        // Look for the function name followed by a space and argument, or at end of line
        const pattern = new RegExp(`(?:^|\\s|\\$\\()${fn}(?:\\s|$|\\()`, 'm');
        if (pattern.test(content)) {
          failures.push(`${file}: calls ${fn}()`);
        }
      }
    }
    expect(failures, `Workflows still calling lib.sh functions:\n${failures.join('\n')}`).toEqual(
      [],
    );
  });

  it('every job using pipeline CLI has setup-pipeline-ts action', () => {
    const CLI_PATTERN = /npx tsx .github\/scripts\/lib\/cli\/pipeline\.ts/;

    const failures: string[] = [];
    for (const file of getWorkflowFiles()) {
      const workflow = parseWorkflow(file);
      if (!workflow?.jobs) continue;

      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const steps = (job as any).steps;
        if (!steps) continue;

        const usesCLI = steps.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.run && CLI_PATTERN.test(s.run),
        );
        const hasSetup = steps.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.uses && s.uses.includes('setup-pipeline-ts'),
        );

        if (usesCLI && !hasSetup) {
          failures.push(`${file} → job "${jobName}" uses pipeline CLI but missing setup-pipeline-ts`);
        }
      }
    }
    expect(failures, `Jobs missing setup-pipeline-ts:\n${failures.join('\n')}`).toEqual([]);
  });

  it('every job using pipeline CLI has a checkout step before setup-pipeline-ts', () => {
    const failures: string[] = [];
    for (const file of getWorkflowFiles()) {
      const workflow = parseWorkflow(file);
      if (!workflow?.jobs) continue;

      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const steps = (job as any).steps;
        if (!steps) continue;

        const setupIdx = steps.findIndex(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.uses && s.uses.includes('setup-pipeline-ts'),
        );
        if (setupIdx === -1) continue;

        const hasCheckoutBefore = steps.slice(0, setupIdx).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.uses && s.uses.includes('actions/checkout'),
        );
        if (!hasCheckoutBefore) {
          failures.push(`${file} → job "${jobName}" has setup-pipeline-ts without checkout before it`);
        }
      }
    }
    expect(failures, `Missing checkout before setup-pipeline-ts:\n${failures.join('\n')}`).toEqual(
      [],
    );
  });
});

describe('no empty env blocks in workflow YAML', () => {
  it('no job or step has env: with null value (empty env block)', () => {
    // When BASH_ENV was removed, some `env:` keys were left with no value.
    // YAML parses `env:` (no value) as `env: null`. This causes GitHub to
    // return 422 "failed to parse workflow" when dispatching via API.
    // `env: undefined` means the key is absent entirely — that's fine.
    const failures: string[] = [];
    for (const file of getWorkflowFiles()) {
      const workflow = parseWorkflow(file) as any;
      if (!workflow?.jobs) continue;

      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        if ('env' in (job as any) && (job as any).env === null) {
          failures.push(`${file} → job "${jobName}" has empty env: (parsed as null)`);
        }
        const steps = (job as any).steps;
        if (!steps) continue;
        for (const step of steps) {
          if ('env' in step && step.env === null) {
            failures.push(
              `${file} → job "${jobName}" → step "${step.name ?? 'unnamed'}" has empty env:`
            );
          }
        }
      }
    }
    expect(failures, `Empty env blocks (causes 422 on dispatch):\n${failures.join('\n')}`).toEqual([]);
  });
});

describe('auto-merge uses --admin for owner PRs', () => {
  it('gh pr merge command includes --admin flag', () => {
    const content = readWorkflow('auto-merge.yml');
    // The merge command must use --admin so owner-authored PRs can merge
    // without a formal GitHub approval (which is impossible in personal repos).
    expect(content, 'auto-merge.yml must use --admin flag on gh pr merge').toContain(
      '--admin',
    );
  });
});

describe('auto-merge dispatches CI after update_branch', () => {
  it('update_branch path uses pipeline CLI update-branch command', () => {
    const content = readWorkflow('auto-merge.yml');
    const updateSection = content.match(/update_branch"\s*\][\s\S]*?(?=\n\s+elif|\n\s+else\b)/);
    expect(updateSection, 'update_branch section not found').toBeTruthy();
    expect(updateSection![0], 'must use pipeline update-branch command').toContain('update-branch');
  });

  it('pipeline update-branch command dispatches both test.yml and e2e-smoke.yml', () => {
    const pipelineSrc = readFileSync(
      join(__dirname, '../../lib/cli/pipeline.ts'), 'utf-8',
    );
    const caseMatch = pipelineSrc.match(/case\s+'update-branch':\s*\{([\s\S]*?)\n {4}\}/);
    expect(caseMatch, 'update-branch case not found in pipeline.ts').toBeTruthy();
    const body = caseMatch![1];
    expect(body, 'must dispatch test.yml').toContain('test.yml');
    expect(body, 'must dispatch e2e-smoke.yml').toContain('e2e-smoke.yml');
  });
});

describe('approve-and-merge self-approval safety', () => {
  it('pipeline.ts approve-and-merge wraps approvePR in try-catch', () => {
    const pipelineSrc = readFileSync(
      join(__dirname, '../../lib/cli/pipeline.ts'),
      'utf-8',
    );
    // Find the approve-and-merge case block
    const caseMatch = pipelineSrc.match(/case\s+'approve-and-merge':\s*\{([\s\S]*?)\n {4}\}/);
    expect(caseMatch, 'approve-and-merge case not found in pipeline.ts').toBeTruthy();

    const caseBody = caseMatch![1];
    expect(
      caseBody,
      'approve-and-merge must catch self-approval errors',
    ).toContain('approve your own pull request');
    expect(caseBody, 'approve-and-merge must use try-catch').toContain('try {');
  });
});
