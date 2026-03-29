/**
 * SubmissionCoordinator — single entry point for portal submission logic.
 *
 * Coordinates page detection, auto-fill, auto-login, credential management,
 * and QR detection. Hooks and screens import this facade instead of reaching
 * into 6+ individual services.
 */

import { automationScriptRegistry, AutomationScriptUtils } from './automationScripts';
import { formFiller } from './formFiller';
import type { FieldSpec } from './formFiller';
import { pageDetector } from './pageDetection';
import { resolvePortalCredential } from './credentialResolver';
import type { ResolvedCredential } from './credentialResolver';
import { buildLoginScript } from './autoLogin';
import { getQRDetectionScript } from '../automation/qrDetection';
import { keychainService } from '../storage/keychain';
import { generateFilledFormForTraveler } from '../forms/formEngine';
import type { FilledForm, FilledFormSection, FilledFormField } from '../forms/formEngine';
import { formatFieldValue } from '../../utils/fieldFormatters';
import type { TravelerProfile } from '../../types/profile';
import type { TripLeg } from '../../types/trip';
import type { CountryFormSchema } from '../../types/schema';
import type { FamilyPolicyType } from '../../types/submission';

/** Page type detected from HTML analysis. */
export type PageType = 'unknown' | 'auth' | 'captcha' | 'form';

/** Script injected to detect the page type (auth/captcha/form). */
export const PAGE_TYPE_CHECK_SCRIPT =
  '(function(){' +
  'var html=document.documentElement.innerHTML.substring(0,50000);' +
  'var formFields=document.querySelectorAll(\'input:not([type="hidden"]),select,textarea\');' +
  'window.ReactNativeWebView.postMessage(JSON.stringify({' +
    'type:"PAGE_TYPE_CHECK",' +
    'html:html,' +
    'formFieldCount:formFields.length' +
  '}));' +
  'true;' +
  '})();';

class SubmissionCoordinator {
  // ─── Page Detection ────────────────────────────────────────────────────────

  /**
   * Classify the current page based on its HTML content and form field count.
   */
  detectPageType(html: string, formFieldCount: number): PageType {
    if (pageDetector.isCaptchaPage(html)) return 'captcha';
    // Form fields take priority over auth patterns — many government portals
    // show login/auth text on pages that are primarily forms (e.g., Malaysia MDAC)
    if (formFieldCount > 0) return 'form';
    if (pageDetector.isAuthPage(html)) return 'auth';
    return 'unknown';
  }

  /**
   * Detect which submission guide step corresponds to the current URL.
   * Returns the 0-based step index, or -1 if no match.
   */
  detectStep(url: string, schema: CountryFormSchema): number {
    if (!schema.submissionGuide) return -1;
    const idx = schema.submissionGuide.findIndex((step) => {
      if (!step.automation?.url) return false;
      return url.startsWith(step.automation.url);
    });
    return idx;
  }

  /**
   * Get the JavaScript snippet to inject for page type detection.
   */
  getPageTypeCheckScript(): string {
    return PAGE_TYPE_CHECK_SCRIPT;
  }

  /**
   * Get the country-specific QR detection script, or null if not available.
   */
  getQRDetectionScript(countryCode: string): string | null {
    return getQRDetectionScript(countryCode);
  }

  // ─── Auto-Fill ─────────────────────────────────────────────────────────────

  /**
   * Build the auto-fill field specs for the current step.
   * Returns field specs ready for script generation, or an empty array.
   */
  buildAutoFillSpecs(
    profile: TravelerProfile,
    leg: TripLeg,
    schema: CountryFormSchema,
    countryCode: string,
    stepIndex: number,
  ): FieldSpec[] {
    const automationScript = automationScriptRegistry.getScriptSync(countryCode);
    if (!automationScript) return [];

    const step = schema.submissionGuide?.[stepIndex];
    const fieldsOnScreen = step?.fieldsOnThisScreen ?? [];

    let filledForm: FilledForm | null;
    try {
      filledForm = generateFilledFormForTraveler(
        profile.id,
        [profile],
        leg,
        schema,
        leg.formData ?? {},
      );
    } catch {
      return [];
    }
    if (!filledForm) return [];

    const fieldSpecs: FieldSpec[] = [];
    filledForm.sections.forEach((section: FilledFormSection) => {
      section.fields.forEach((field: FilledFormField) => {
        if (fieldsOnScreen.length > 0 && !fieldsOnScreen.includes(field.id)) return;

        const mapping = automationScript.fieldMappings[field.id];
        if (!mapping) return;

        let value = formatFieldValue(field.currentValue, field.type);
        if (!value) return;

        if (mapping.transform) {
          const transformed = AutomationScriptUtils.applyTransform(value, mapping.transform);
          if (transformed !== null && transformed !== undefined) {
            value = String(transformed);
          }
        }

        if (mapping.inputType === 'file') return;

        const selector = mapping.selector.split(',')[0].trim();
        fieldSpecs.push({ id: field.id, selector, value, inputType: mapping.inputType });
      });
    });

    return fieldSpecs;
  }

  /**
   * Generate the JavaScript auto-fill script from field specs.
   */
  buildAutoFillScript(fieldSpecs: FieldSpec[]): string {
    return formFiller.buildAutoFillScript(fieldSpecs);
  }

  /**
   * Check if the auto-fill rate is sufficient (>= 50%).
   */
  isAutoFillSufficient(fillRate: number): boolean {
    return formFiller.isAutoFillSufficient(fillRate);
  }

  /**
   * Generate a filled form for the copy-paste panel.
   */
  generateFilledForm(
    profile: TravelerProfile,
    leg: TripLeg,
    schema: CountryFormSchema,
  ): FilledForm | null {
    try {
      return generateFilledFormForTraveler(
        profile.id,
        [profile],
        leg,
        schema,
        leg.formData ?? {},
      );
    } catch {
      return null;
    }
  }

  // ─── Auto-Login & Credentials ──────────────────────────────────────────────

  /**
   * Resolve the credential for auto-login, respecting family policy.
   */
  async resolveCredential(
    profileId: string,
    primaryProfileId: string,
    countryCode: string,
    familyPolicyType: FamilyPolicyType,
  ): Promise<ResolvedCredential | null> {
    return resolvePortalCredential(profileId, primaryProfileId, countryCode, familyPolicyType);
  }

  /**
   * Build the JavaScript login script.
   */
  buildLoginScript(username: string, password: string): string {
    return buildLoginScript(username, password);
  }

  /**
   * Store a portal credential in the OS Keychain.
   */
  async storeCredential(
    profileId: string,
    countryCode: string,
    username: string,
    password: string,
  ): Promise<void> {
    await keychainService.storePortalCredential(profileId, countryCode, username, password);
  }

  /**
   * Build a script that extracts the username from a login form's DOM.
   */
  buildUsernameExtractionScript(): string {
    return (
      '(function(){' +
      'var selectors=["input[type=\\"email\\"]","input[name=\\"email\\"]","input[name=\\"username\\"]","input[id*=\\"email\\"]","input[id*=\\"user\\"]"];' +
      'var username="";' +
      'for(var i=0;i<selectors.length;i++){' +
        'var el=document.querySelector(selectors[i]);' +
        'if(el&&el.value){username=el.value;break;}' +
      '}' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"EXTRACT_LOGIN_USERNAME",' +
        'username:username' +
      '}));' +
      'true;' +
      '})();'
    );
  }
}

export const submissionCoordinator = new SubmissionCoordinator();
