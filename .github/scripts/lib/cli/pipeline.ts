#!/usr/bin/env tsx
/**
 * Unified pipeline CLI — replaces all lib.sh functions.
 *
 * Usage:
 *   npx tsx .github/scripts/lib/cli/pipeline.ts <command> [args...]
 *
 * Commands (GitHub API):
 *   comment <issue> <body> [repo]
 *   dispatch <workflow> [--input key=value]...
 *   approve-and-merge <pr> <body> [repo]
 *   get-pr-number <event_name>
 *   count-approvals <pr> [repo]
 *   count-unresolved-threads <pr> [repo]
 *   resolve-all-threads <pr> [repo]
 *   check-ci-status <sha> [repo]
 *   is-workflow-active <workflow> <issue> [repo]
 *   count-critical-comments <pr> [repo]
 *   get-next-pending-story <epic_label> [repo]
 *   trigger-story-agent <issue> [agent] [suffix]
 *
 * Commands (Git):
 *   setup-git-auth
 *   merge-master
 *   commit <message> [co-author]
 *   push <branch> [pre-push-head]
 *
 * Environment:
 *   GH_PAT / GH_TOKEN      — GitHub token
 *   GITHUB_REPOSITORY       — owner/repo
 */

import { GitHubClient } from '../github.js';
import { setupGitAuth, mergeMasterIntoBranch, checkChangesAndCommit, smartPush } from '../git.js';

function getToken(): string {
  const token = process.env['GH_PAT'] ?? process.env['GH_TOKEN'];
  if (!token) {
    console.error('Error: GH_PAT or GH_TOKEN is required');
    process.exit(1);
  }
  return token;
}

function getRepo(): string {
  const repo = process.env['GITHUB_REPOSITORY'];
  if (!repo) {
    console.error('Error: GITHUB_REPOSITORY is required');
    process.exit(1);
  }
  return repo;
}

function getGitHub(repoOverride?: string): GitHubClient {
  return new GitHubClient({ token: getToken(), repo: repoOverride ?? getRepo() });
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    console.error('Usage: pipeline <command> [args...]');
    process.exit(1);
  }

  switch (command) {
    // ─── GitHub API Commands ──────────────────────────────────────────

    case 'comment': {
      const [issueStr, body, repo] = args;
      const issue = parseInt(issueStr, 10);
      if (isNaN(issue) || !body) {
        console.error('Usage: pipeline comment <issue> <body> [repo]');
        process.exit(1);
      }
      const github = getGitHub(repo);
      await github.commentOnIssue(issue, body);
      break;
    }

    case 'dispatch': {
      const workflowFile = args[0];
      if (!workflowFile) {
        console.error('Usage: pipeline dispatch <workflow> [--input key=value]...');
        process.exit(1);
      }
      const inputs: Record<string, string> = {};
      let ref = 'master';
      for (let i = 1; i < args.length; i++) {
        if ((args[i] === '--input' || args[i] === '-f') && args[i + 1]) {
          const [key, ...valParts] = args[i + 1].split('=');
          inputs[key] = valParts.join('=');
          i++;
        } else if (args[i] === '--ref' && args[i + 1]) {
          ref = args[i + 1];
          i++;
        } else {
          console.error(`Unknown or malformed argument: ${args[i]}`);
          process.exit(1);
        }
      }
      const github = getGitHub();
      await github.dispatchWorkflow(workflowFile, ref, Object.keys(inputs).length > 0 ? inputs : undefined);
      break;
    }

    case 'approve-and-merge': {
      const [prStr, body, repo] = args;
      const pr = parseInt(prStr, 10);
      if (isNaN(pr) || !body) {
        console.error('Usage: pipeline approve-and-merge <pr> <body> [repo]');
        process.exit(1);
      }
      const github = getGitHub(repo);
      try {
        await github.approvePR(pr, body);
      } catch (err) {
        if (err instanceof Error && /approve your own pull request/i.test(err.message)) {
          console.log(`Skipping self-approval for PR #${pr} (token owner is the PR author). Auto-merge will still be dispatched.`);
        } else {
          throw err;
        }
      }
      // Dispatch auto-merge since GITHUB_TOKEN approvals don't trigger events
      const pat = process.env['GH_PAT'];
      if (pat) {
        const patGithub = new GitHubClient({ token: pat, repo: repo ?? getRepo() });
        await patGithub.dispatchWorkflow('auto-merge.yml', 'master', { pr_number: String(pr) }).catch(() => {});
      }
      break;
    }

    case 'get-pr-number': {
      const [eventName] = args;
      if (!eventName) {
        console.error('Usage: pipeline get-pr-number <event_name>');
        process.exit(1);
      }
      let prNum = '';
      switch (eventName) {
        case 'workflow_dispatch':
          prNum = process.env['INPUT_PR_NUMBER'] ?? '';
          break;
        case 'workflow_run': {
          const branch = process.env['WORKFLOW_RUN_HEAD_BRANCH'] ?? '';
          if (branch) {
            try {
              const github = getGitHub();
              const prs = await github.listOpenPRs();
              const match = prs.find((p) => p.head.ref === branch);
              if (match) prNum = String(match.number);
            } catch { /* no PR found */ }
          }
          break;
        }
        case 'pull_request':
        case 'pull_request_review':
        case 'issue_comment':
          prNum = process.env['PR_NUMBER_FROM_EVENT'] ?? '';
          break;
      }
      console.log(prNum);
      break;
    }

    case 'count-approvals': {
      const [prStr, repo] = args;
      const pr = parseInt(prStr, 10);
      if (isNaN(pr)) { console.error('Usage: pipeline count-approvals <pr> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      console.log(await github.countApprovals(pr));
      break;
    }

    case 'count-unresolved-threads': {
      const [prStr, repo] = args;
      const pr = parseInt(prStr, 10);
      if (isNaN(pr)) { console.error('Usage: pipeline count-unresolved-threads <pr> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      console.log(await github.countUnresolvedThreads(pr));
      break;
    }

    case 'resolve-all-threads': {
      const [prStr, repo] = args;
      const pr = parseInt(prStr, 10);
      if (isNaN(pr)) { console.error('Usage: pipeline resolve-all-threads <pr> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      const resolved = await github.resolveAllThreads(pr);
      console.log(`Resolved ${resolved} threads`);
      break;
    }

    case 'check-ci-status': {
      const [sha, repo] = args;
      if (!sha) { console.error('Usage: pipeline check-ci-status <sha> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      const status = await github.checkCIStatus(sha);
      // Output in same format as lib.sh for compatibility
      console.log(`TESTS_PASS=${status.testsPass}`);
      console.log(`E2E_PASS=${status.e2ePass}`);
      break;
    }

    case 'is-workflow-active': {
      const [workflow, issueStr, repo] = args;
      const issue = parseInt(issueStr, 10);
      if (!workflow || isNaN(issue)) { console.error('Usage: pipeline is-workflow-active <workflow> <issue> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      const active = await github.isWorkflowActive(workflow, issue);
      process.exit(active ? 0 : 1);
    }

    case 'count-critical-comments': {
      const [prStr, repo] = args;
      const pr = parseInt(prStr, 10);
      if (isNaN(pr)) { console.error('Usage: pipeline count-critical-comments <pr> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      console.log(await github.countCriticalComments(pr));
      break;
    }

    case 'get-next-pending-story': {
      const [epicLabel, repo] = args;
      if (!epicLabel) { console.error('Usage: pipeline get-next-pending-story <epic_label> [repo]'); process.exit(1); }
      const github = getGitHub(repo);
      const next = await github.getNextPendingStory(epicLabel);
      console.log(next ?? '');
      break;
    }

    case 'trigger-story-agent': {
      const [issueStr, agent, suffix] = args;
      const issue = parseInt(issueStr, 10);
      if (isNaN(issue)) { console.error('Usage: pipeline trigger-story-agent <issue> [agent] [suffix]'); process.exit(1); }
      const github = getGitHub();
      await github.triggerStoryAgent(issue, (agent as 'claude' | 'gemini') ?? 'claude', suffix);
      break;
    }

    // ─── Git Commands ─────────────────────────────────────────────────

    case 'setup-git-auth': {
      setupGitAuth();
      break;
    }

    case 'merge-master': {
      const success = mergeMasterIntoBranch();
      process.exit(success ? 0 : 1);
    }

    case 'commit': {
      const [message, coAuthor] = args;
      if (!message) { console.error('Usage: pipeline commit <message> [co-author]'); process.exit(1); }
      const created = checkChangesAndCommit(message, coAuthor);
      process.exit(created ? 0 : 1);
    }

    case 'push': {
      const [branch, prePushHead] = args;
      if (!branch) { console.error('Usage: pipeline push <branch> [pre-push-head]'); process.exit(1); }
      smartPush(branch, prePushHead);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run without arguments to see available commands.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
