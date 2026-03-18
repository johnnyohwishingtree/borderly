/**
 * Structural regression tests for GitHub Actions workflows.
 *
 * These validate that workflow YAML files follow required patterns
 * to prevent CI failures. Each test documents the bug it prevents.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const WORKFLOWS_DIR = join(__dirname, '../../../workflows');
const SCRIPTS_DIR = join(__dirname, '../..');

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, string>;
  if?: string;
}

interface WorkflowJob {
  'runs-on'?: string;
  steps?: WorkflowStep[];
  env?: Record<string, string>;
}

interface Workflow {
  name?: string;
  jobs?: Record<string, WorkflowJob>;
}

function loadWorkflows(): Array<{ name: string; workflow: Workflow }> {
  const files = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml'));
  return files.map((f) => ({
    name: f,
    workflow: yaml.load(readFileSync(join(WORKFLOWS_DIR, f), 'utf-8')) as Workflow,
  }));
}

function getJobsUsingPipelineTS(
  workflow: Workflow
): Array<{ jobName: string; job: WorkflowJob }> {
  const result: Array<{ jobName: string; job: WorkflowJob }> = [];
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    const steps = job.steps ?? [];
    const usesTSCLI = steps.some(
      (s) =>
        typeof s.run === 'string' &&
        s.run.includes('.github/scripts/lib/cli/')
    );
    if (usesTSCLI) result.push({ jobName, job });
  }
  return result;
}

describe('workflow structure regressions', () => {
  const workflows = loadWorkflows();

  // Bug: setup-pipeline-ts action not found because sparse-checkout
  // only included .github/scripts but the action is at .github/actions/.
  // Fixed in PR #426.
  describe('sparse-checkout must include .github/actions when using local actions', () => {
    it('every sparse-checkout that includes .github/scripts also includes .github/actions', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
          const steps = job.steps ?? [];

          for (const step of steps) {
            if (!step.with || typeof step.with['sparse-checkout'] !== 'string') continue;

            const sparseCheckout = step.with['sparse-checkout'];
            const includesScripts = sparseCheckout.includes('.github/scripts');
            const includesActions = sparseCheckout.includes('.github/actions');

            // If checking out scripts, must also check out actions
            // (setup-pipeline-ts lives there)
            if (includesScripts && !includesActions) {
              failures.push(
                `${name} → job "${jobName}": sparse-checkout includes .github/scripts but NOT .github/actions`
              );
            }
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });

  // Bug: Jobs using npx tsx pipeline CLI without setup-pipeline-ts
  // would fail with "tsx: command not found" or missing dependencies.
  describe('every job using pipeline TS CLI has setup-pipeline-ts', () => {
    it('all jobs calling npx tsx .github/scripts/lib/cli/ have setup-pipeline-ts step', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        const jobs = getJobsUsingPipelineTS(workflow);

        for (const { jobName, job } of jobs) {
          const steps = job.steps ?? [];
          const hasSetup = steps.some(
            (s) =>
              typeof s.uses === 'string' &&
              s.uses.includes('setup-pipeline-ts')
          );

          if (!hasSetup) {
            failures.push(
              `${name} → job "${jobName}": uses TS CLI but missing setup-pipeline-ts`
            );
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });

  // Bug: Jobs using setup-pipeline-ts without checkout would fail with
  // "Can't find action.yml" because the composite action wasn't available.
  describe('every job using setup-pipeline-ts has a checkout step', () => {
    it('all jobs with setup-pipeline-ts have actions/checkout before it', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
          const steps = job.steps ?? [];

          const setupIdx = steps.findIndex(
            (s) =>
              typeof s.uses === 'string' &&
              s.uses.includes('setup-pipeline-ts')
          );

          if (setupIdx < 0) continue;

          const hasCheckoutBefore = steps.slice(0, setupIdx).some(
            (s) =>
              typeof s.uses === 'string' &&
              s.uses.includes('actions/checkout')
          );

          if (!hasCheckoutBefore) {
            failures.push(
              `${name} → job "${jobName}": setup-pipeline-ts at step ${setupIdx} but no checkout before it`
            );
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });

  // Bug: Workflows must not reference BASH_ENV or lib.sh functions directly.
  // The migration to TypeScript CLI replaced all bash functions.
  describe('no workflow references BASH_ENV or old bash functions', () => {
    it('no job sets BASH_ENV in env', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
          const jobEnv = job.env ?? {};
          if ('BASH_ENV' in jobEnv) {
            failures.push(`${name} → job "${jobName}": still sets BASH_ENV`);
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });

    it('no step calls old bash function names directly', () => {
      const oldFunctions = [
        'setup_git_auth',
        'check_changes_and_commit',
        'smart_push',
        'comment_on_issue',
        'dispatch_workflow',
        'merge_master_into_branch',
        'count_approvals',
        'count_unresolved_threads',
        'resolve_all_threads',
        'approve_and_merge',
        'get_pr_number',
        'is_workflow_active',
        'count_critical_comments',
        'get_next_pending_story',
        'trigger_story_agent',
        'check_ci_status',
      ];

      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
          for (const step of job.steps ?? []) {
            if (typeof step.run !== 'string') continue;
            for (const fn of oldFunctions) {
              // Match function call (word boundary) but not in comments
              const lines = step.run.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('#')) continue;
                // Match as a standalone command (not inside a string or comment)
                const pattern = new RegExp(`(?:^|\\s|;|&&|\\|\\|)${fn}(?:\\s|$|\\()`);
                if (pattern.test(trimmed)) {
                  failures.push(
                    `${name} → job "${jobName}" → step "${step.name}": calls old bash function ${fn}()`
                  );
                }
              }
            }
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });

  // Bug: Give-up or error comments containing @claude or @gemini
  // trigger new workflow runs, creating infinite loops.
  describe('no automated comments contain agent triggers', () => {
    it('no pipeline.ts comment call body contains @claude or @gemini literally', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
          for (const step of job.steps ?? []) {
            if (typeof step.run !== 'string') continue;
            if (!step.run.includes('pipeline.ts comment')) continue;

            // Extract comment body — look for the string after comment <num>
            // Skip lines that are intentionally triggering agents
            // (trigger-story-agent, fallback review requests)
            if (step.run.includes('trigger-story-agent')) continue;
            if (step.run.includes('perform a comprehensive code review')) continue;
            if (step.run.includes('Fix the issues from the code review')) continue;

            // Check for accidental @claude/@gemini in status/error comments
            const lines = step.run.split('\n');
            for (const line of lines) {
              if (line.includes('pipeline.ts comment') && /@(claude|gemini)(?!\[)/i.test(line)) {
                // Ignore lines that are intentionally mentioning agents
                if (line.includes('trigger-story-agent')) continue;
                if (line.includes('code review')) continue;
                failures.push(
                  `${name} → job "${jobName}" → step "${step.name}": comment call contains @claude/@gemini trigger`
                );
              }
            }
          }
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });

  // Ensure the pipeline TS package.json has required dependencies
  describe('pipeline TypeScript dependencies', () => {
    it('package.json exists with octokit dependencies', () => {
      const pkgPath = join(SCRIPTS_DIR, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.dependencies).toBeDefined();
      expect(pkg.dependencies['@octokit/rest']).toBeDefined();
      expect(pkg.dependencies['@octokit/graphql']).toBeDefined();
    });

    it('pipeline CLI entry point exists', () => {
      const cliPath = join(SCRIPTS_DIR, 'lib/cli/pipeline.ts');
      const content = readFileSync(cliPath, 'utf-8');
      expect(content).toContain('main()');
    });

    it('verify-checks CLI entry point exists', () => {
      const cliPath = join(SCRIPTS_DIR, 'lib/cli/verify-checks.ts');
      const content = readFileSync(cliPath, 'utf-8');
      expect(content).toContain('runVerifyChecks');
    });
  });

  // Bug: review-fix prompt must NOT tell Claude to push — the workflow
  // handles pushing after Claude finishes. If Claude pushes during its
  // run, the post-run push step conflicts.
  describe('review-fix safety', () => {
    it('review-fix claude-code-action prompt does not instruct pushing', () => {
      const wf = workflows.find((w) => w.name === 'review-fix.yml');
      expect(wf).toBeDefined();

      const content = readFileSync(join(WORKFLOWS_DIR, 'review-fix.yml'), 'utf-8');
      // Find the claude-code-action step's prompt/system-prompt
      const promptMatches = content.match(/prompt:.*(?:\n.*)*?(?=\n\s+\w+:|$)/g) ?? [];
      for (const prompt of promptMatches) {
        expect(prompt.toLowerCase()).not.toContain('git push');
      }
    });
  });

  // Ensure concurrency groups for comment-triggered workflows include
  // the comment author, preventing bot status comments from cancelling runs.
  describe('concurrency groups include author for comment-triggered workflows', () => {
    it('issue_comment workflows include comment.user.login in concurrency group', () => {
      const failures: string[] = [];

      for (const { name, workflow } of workflows) {
        const raw = readFileSync(join(WORKFLOWS_DIR, name), 'utf-8');

        // Check if triggered by issue_comment
        if (!raw.includes('issue_comment')) continue;

        // Check concurrency group
        const concurrencyMatch = raw.match(/concurrency:\s*\n\s+group:\s*(.+)/);
        if (!concurrencyMatch) continue;

        const group = concurrencyMatch[1];
        if (!group.includes('comment.user.login')) {
          failures.push(
            `${name}: concurrency group "${group}" missing comment.user.login`
          );
        }
      }

      expect(failures, failures.join('\n')).toHaveLength(0);
    });
  });
});
