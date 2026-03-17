/**
 * Story Lifecycle — Inngest port of orchestrate.yml
 *
 * Triggered when a PR is merged to master. Closes the completed story,
 * finds the next pending story in the same epic, and triggers the agent.
 *
 * Flow:
 *   PR merged → extract linked story → close story → find next → safety check → trigger agent
 */

import { inngest } from '../inngest.js';
import { GitHubClient } from '../lib/github.js';
import { PipelineStateMachine } from '../lib/state-machine.js';

const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export const storyLifecycle = inngest.createFunction(
  {
    id: 'story-lifecycle',
    name: 'Story Lifecycle Orchestrator',
    retries: 2,
    concurrency: [{ limit: 1, key: 'event.data.repo' }],
  },
  { event: 'pipeline/pr.merged' },
  async ({ event, step }) => {
    const { prNumber, repo } = event.data;
    const token = process.env['GH_PAT'] ?? process.env['GITHUB_TOKEN'] ?? '';
    const github = new GitHubClient({ token, repo });
    const stateMachine = new PipelineStateMachine(github);
    const preferredAgent = (process.env['PREFERRED_AGENT'] ?? 'claude') as
      | 'claude'
      | 'gemini';

    // Step 1: Extract linked story from PR
    const storyNumber = await step.run('extract-linked-story', async () => {
      const linked = await github.getLinkedIssueFromPR(prNumber);
      if (!linked) return null;

      // Verify it's a story
      const labels = await github.getIssueLabels(linked);
      if (!labels.includes('story')) return null;

      return linked;
    });

    if (!storyNumber) {
      return { status: 'skipped', reason: 'No linked story found' };
    }

    // Step 2: Close the completed story
    await step.run('close-completed-story', async () => {
      await github.removeLabel(storyNumber, 'pending');
      await github.removeLabel(storyNumber, 'in-progress');
      await github.addLabels(storyNumber, ['completed']);
      await github.closeIssue(storyNumber);
    });

    // Step 3: Transition state to merged
    await step.run('transition-merged', async () => {
      try {
        await stateMachine.transition(storyNumber, 'merged');
      } catch {
        // State might not exist or be in wrong state — non-fatal
      }
    });

    // Step 4: Find epic label and next pending story
    const epicInfo = await step.run('find-next-story', async () => {
      const labels = await github.getIssueLabels(storyNumber);
      const epicLabel = labels.find((l) => l.startsWith('epic:'));

      if (!epicLabel) {
        return { epicLabel: null, nextStory: null };
      }

      const nextStory = await github.getNextPendingStory(epicLabel);
      return { epicLabel, nextStory };
    });

    if (!epicInfo.epicLabel) {
      return { status: 'done', reason: 'No epic label found' };
    }

    if (!epicInfo.nextStory) {
      // No more stories — close the epic
      await step.run('close-epic', async () => {
        await github.commentOnIssue(
          storyNumber,
          `All stories in ${epicInfo.epicLabel} are complete. Closing epic.`
        );
      });
      return { status: 'epic-complete', epicLabel: epicInfo.epicLabel };
    }

    // Step 5: Safety check — pause if too many consecutive failures
    const shouldPause = await step.run('safety-check', async () => {
      const openPRs = await github.listOpenPRs('claude/');
      // Count recent unmerged PRs as a proxy for consecutive failures
      return openPRs.length >= CONSECUTIVE_FAILURE_THRESHOLD;
    });

    if (shouldPause) {
      await step.run('pause-pipeline', async () => {
        await github.commentOnIssue(
          epicInfo.nextStory!,
          `Pipeline paused: ${CONSECUTIVE_FAILURE_THRESHOLD}+ unmerged PRs detected. Manual review needed before continuing.`
        );
      });
      return {
        status: 'paused',
        reason: 'Too many consecutive unmerged PRs',
      };
    }

    // Step 6: Initialize state for next story and trigger agent
    await step.run('init-next-story', async () => {
      await stateMachine.transition(epicInfo.nextStory!, 'planned');
      await github.removeLabel(epicInfo.nextStory!, 'pending');
      await github.addLabels(epicInfo.nextStory!, ['in-progress']);
    });

    await step.run('trigger-agent', async () => {
      await github.triggerStoryAgent(epicInfo.nextStory!, preferredAgent);
    });

    // Also emit the story.trigger event for downstream tracking
    await step.sendEvent('emit-story-trigger', {
      name: 'pipeline/story.trigger',
      data: {
        issueNumber: epicInfo.nextStory!,
        agent: preferredAgent,
        epicLabel: epicInfo.epicLabel!,
        repo,
      },
    });

    return {
      status: 'triggered',
      completedStory: storyNumber,
      nextStory: epicInfo.nextStory,
      agent: preferredAgent,
    };
  }
);
