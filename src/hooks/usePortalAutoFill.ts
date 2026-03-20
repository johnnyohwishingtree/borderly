import { useState, useCallback, useMemo } from 'react';
import { submissionCoordinator } from '../services/submission/submissionCoordinator';
import type { PortalWebViewHandle } from '../components/submission/PortalWebView';
import type { AutoFillFieldResult } from '../components/submission/AutoFillBanner';
import type { TravelerProfile } from '../types/profile';
import type { CountryFormSchema } from '../types/schema';
import type { TripLeg } from '../types/trip';

interface BannerState {
  filled: number;
  total: number;
  results?: AutoFillFieldResult[];
}

interface UsePortalAutoFillOptions {
  countryCode: string;
  schema: CountryFormSchema | null;
  leg: TripLeg | undefined;
  effectiveProfile: TravelerProfile | null;
  selectedProfileId: string;
  currentStep: number;
  lastUsedProfileRef: React.MutableRefObject<string>;
  webViewRef: React.RefObject<PortalWebViewHandle | null>;
}

/**
 * Manages auto-fill execution and result banners for portal submission.
 * Delegates field spec building and script generation to submissionCoordinator.
 */
export function usePortalAutoFill({
  countryCode,
  schema,
  leg,
  effectiveProfile,
  selectedProfileId,
  currentStep,
  lastUsedProfileRef,
  webViewRef,
}: UsePortalAutoFillOptions) {
  const [bannerState, setBannerState] = useState<BannerState | null>(null);
  const [showLowFillWarning, setShowLowFillWarning] = useState(false);

  // ─── Form completion status ─────────────────────────────────────────────────

  /**
   * Derived state: true when all required fields in the schema have values
   * (auto-filled from profile or manually filled by the user). Used to gate
   * the "Submit in App" button so users cannot attempt portal submission with
   * incomplete data.
   */
  const { isFormComplete, missingRequiredFields } = useMemo(() => {
    if (!schema || !leg || !effectiveProfile) {
      return { isFormComplete: false, missingRequiredFields: [] as string[] };
    }

    const filledForm = submissionCoordinator.generateFilledForm(effectiveProfile, leg, schema);
    if (!filledForm) {
      return { isFormComplete: false, missingRequiredFields: [] as string[] };
    }

    const missingRequired = filledForm.sections
      .flatMap(s => s.fields)
      .filter(f => f.required && f.source === 'empty');

    return {
      isFormComplete: missingRequired.length === 0,
      missingRequiredFields: missingRequired.map(f => f.label),
    };
  }, [schema, leg, effectiveProfile]);

  const handleAutoFill = useCallback(() => {
    if (!schema?.submissionGuide || !leg || !effectiveProfile) return;

    lastUsedProfileRef.current = selectedProfileId;

    const fieldSpecs = submissionCoordinator.buildAutoFillSpecs(
      effectiveProfile,
      leg,
      schema,
      countryCode,
      currentStep - 1,
    );

    if (fieldSpecs.length > 0) {
      webViewRef.current?.injectJavaScript(
        submissionCoordinator.buildAutoFillScript(fieldSpecs),
      );
    }
  }, [schema, currentStep, leg, effectiveProfile, selectedProfileId, countryCode, lastUsedProfileRef, webViewRef]);

  const handleAutoFillResult = useCallback((msg: Record<string, unknown>) => {
    const total = typeof msg.total === 'number' ? msg.total : 0;
    const filled = typeof msg.filled === 'number' ? msg.filled : 0;
    if (total > 0) {
      const rawResults = Array.isArray(msg.results) ? msg.results : [];
      const fieldResults: AutoFillFieldResult[] = rawResults
        .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
        .map(r => {
          const result: AutoFillFieldResult = {
            id: typeof r.id === 'string' ? r.id : String(r.id ?? ''),
            status: (r.status as AutoFillFieldResult['status']) ?? 'failed',
          };
          if (typeof r.error === 'string') {
            result.error = r.error;
          }
          return result;
        });
      setBannerState(fieldResults.length > 0 ? { filled, total, results: fieldResults } : { filled, total });
      const fillRate = filled / total;
      if (!submissionCoordinator.isAutoFillSufficient(fillRate)) {
        setShowLowFillWarning(true);
        if (__DEV__) {
          console.warn(
            `[usePortalAutoFill] Auto-fill rate ${Math.round(fillRate * 100)}% is below 50%. ` +
            'Possible CSS selector mismatch on this portal page.',
          );
        }
      } else {
        setShowLowFillWarning(false);
      }
    }
  }, []);

  const dismissBanner = useCallback(() => setBannerState(null), []);

  return {
    bannerState,
    showLowFillWarning,
    isFormComplete,
    missingRequiredFields,
    handleAutoFill,
    handleAutoFillResult,
    dismissBanner,
  };
}
