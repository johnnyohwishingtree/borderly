/**
 * Centralized logging utility for Borderly.
 *
 * Provides a structured wrapper around console output so that in the future
 * logs can be routed to a crash-reporting / observability service (e.g. Sentry,
 * Datadog) without changing call-sites.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.warn('[PlacesService]', 'API error:', status);
 *   logger.error('[Storage]', 'Failed to read keychain', err);
 */

export const logger = {
  debug(...args: unknown[]): void {
    if (__DEV__) {
      console.log(...args);
    }
  },

  info(...args: unknown[]): void {
    console.log(...args);
  },

  warn(...args: unknown[]): void {
    console.warn(...args);
  },

  error(...args: unknown[]): void {
    console.error(...args);
  },
};
