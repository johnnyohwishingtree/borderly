/**
 * PageDetection — detects which government portal page is currently loaded in the WebView
 * and provides helpers for captcha and auth page detection.
 *
 * Portal base URLs are derived from the portal registry (which reads JSON schemas) so
 * that no hardcoded country lists need to be maintained here.
 */

import { getPortalBaseUrl as registryGetPortalBaseUrl } from './portalRegistry';

export interface DetectedPage {
  stepIndex: number;
  stepTitle: string;
  countryCode: string;
  url: string;
}

/** Selectors and keyword patterns used for captcha and auth page detection. */
const CAPTCHA_PATTERNS = [
  'captcha',
  'recaptcha',
  'hcaptcha',
  'cf-challenge',
  'challenge-form',
  'i-am-not-a-robot',
];

const AUTH_PATTERNS = [
  'login',
  'signin',
  'sign-in',
  'log-in',
  'password',
  'authenticate',
  'session-expired',
  'session_expired',
];

/** Schema shape used by detectPage (only the required fields). */
interface SubmissionGuideStep {
  title: string;
  automation?: { url?: string };
  fieldsOnThisScreen?: string[];
}

interface SchemaWithGuide {
  submissionGuide?: SubmissionGuideStep[];
}

export class PageDetector {
  /**
   * Detect which submission guide step corresponds to the given URL.
   * Returns null if no step matches.
   */
  detectPage(url: string, countryCode: string, schema: SchemaWithGuide): DetectedPage | null {
    if (!schema.submissionGuide || schema.submissionGuide.length === 0) return null;

    const steps = schema.submissionGuide;

    // Find the step whose URL is the longest prefix match.
    // Without this, a root URL like "https://example.gov/" would match
    // before more specific URLs like "https://example.gov/registration/passport".
    let bestMatch: DetectedPage | null = null;
    let bestLen = -1;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepUrl = step.automation?.url;
      if (stepUrl && url.startsWith(stepUrl) && stepUrl.length > bestLen) {
        bestLen = stepUrl.length;
        bestMatch = {
          stepIndex: i,
          stepTitle: step.title,
          countryCode,
          url,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Returns true if the HTML content appears to be a CAPTCHA challenge page.
   */
  isCaptchaPage(html: string): boolean {
    const lower = html.toLowerCase();
    return CAPTCHA_PATTERNS.some((pattern) => lower.includes(pattern));
  }

  /**
   * Returns true if the HTML content appears to be an authentication / login page.
   */
  isAuthPage(html: string): boolean {
    const lower = html.toLowerCase();
    return AUTH_PATTERNS.some((pattern) => lower.includes(pattern));
  }

  /**
   * Returns the known base URL (origin) for a country's government portal,
   * or null if unknown.
   *
   * Derived from the portal registry — no hardcoded map required.
   */
  getPortalBaseUrl(countryCode: string): string | null {
    return registryGetPortalBaseUrl(countryCode);
  }
}

export const pageDetector = new PageDetector();
