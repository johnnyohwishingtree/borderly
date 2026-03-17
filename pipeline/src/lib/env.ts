/**
 * Pipeline environment configuration.
 *
 * Validates required environment variables at startup and provides
 * typed access throughout the pipeline.
 */

export interface PipelineEnv {
  /** GitHub Personal Access Token for API calls */
  ghToken: string;
  /** GitHub repository in "owner/repo" format */
  repo: string;
  /** Preferred AI agent for story implementation */
  preferredAgent: 'claude' | 'gemini';
  /** Inngest signing key for request verification (production only) */
  inngestSigningKey: string | undefined;
  /** Inngest event key for sending events */
  inngestEventKey: string | undefined;
  /** Port to listen on */
  port: number;
  /** Node environment */
  nodeEnv: 'production' | 'development' | 'test';
  /** Shadow mode — Inngest functions observe but don't act */
  shadowMode: boolean;
  /** GitHub issue number for parity tracking (shadow mode logging) */
  parityTrackingIssue: number;
}

/** Required env vars — server will not start without these */
const REQUIRED_VARS = ['GH_PAT', 'GITHUB_REPOSITORY'] as const;

/** Optional env vars with defaults */
const DEFAULTS: Record<string, string> = {
  PREFERRED_AGENT: 'claude',
  PORT: '3000',
  NODE_ENV: 'development',
};

export function loadEnv(): PipelineEnv {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'See pipeline/DEPLOY.md for setup instructions.'
    );
  }

  const agent = process.env['PREFERRED_AGENT'] ?? DEFAULTS['PREFERRED_AGENT'];
  if (agent !== 'claude' && agent !== 'gemini') {
    throw new Error(`PREFERRED_AGENT must be 'claude' or 'gemini', got '${agent}'`);
  }

  const nodeEnv = process.env['NODE_ENV'] ?? DEFAULTS['NODE_ENV'];
  if (nodeEnv !== 'production' && nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(`NODE_ENV must be 'production', 'development', or 'test', got '${nodeEnv}'`);
  }

  return {
    ghToken: process.env['GH_PAT']!,
    repo: process.env['GITHUB_REPOSITORY']!,
    preferredAgent: agent,
    inngestSigningKey: process.env['INNGEST_SIGNING_KEY'],
    inngestEventKey: process.env['INNGEST_EVENT_KEY'],
    port: parseInt(process.env['PORT'] ?? DEFAULTS['PORT'], 10),
    nodeEnv,
    shadowMode: process.env['INNGEST_SHADOW_MODE'] === 'true',
    parityTrackingIssue: parseInt(
      process.env['PARITY_TRACKING_ISSUE'] ?? '0',
      10
    ),
  };
}

/**
 * Redacted summary for health/debug endpoints.
 * Never exposes actual secret values.
 */
export function envSummary(env: PipelineEnv): Record<string, string> {
  return {
    repo: env.repo,
    preferredAgent: env.preferredAgent,
    nodeEnv: env.nodeEnv,
    port: String(env.port),
    ghToken: env.ghToken ? '***set***' : 'MISSING',
    inngestSigningKey: env.inngestSigningKey ? '***set***' : 'not set',
    inngestEventKey: env.inngestEventKey ? '***set***' : 'not set',
    shadowMode: String(env.shadowMode),
    parityTrackingIssue: String(env.parityTrackingIssue || 'not set'),
  };
}
