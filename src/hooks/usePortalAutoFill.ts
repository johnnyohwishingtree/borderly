import { useState, useCallback, useMemo } from 'react';
import { buildHeuristicFillScript, buildFillData } from '../services/submission/heuristicFiller';
import { submissionCoordinator } from '../services/submission/submissionCoordinator';
import { useFormStore } from '../stores/useFormStore';
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
 * Uses heuristic DOM matching (1Password-style) — scans form elements
 * at runtime and matches by attribute patterns, not stored CSS selectors.
 */
export function usePortalAutoFill({
  schema,
  leg,
  effectiveProfile,
  selectedProfileId,
  lastUsedProfileRef,
  webViewRef,
}: UsePortalAutoFillOptions) {
  const [bannerState, setBannerState] = useState<BannerState | null>(null);
  const [showLowFillWarning, setShowLowFillWarning] = useState(false);

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
    if (!effectiveProfile) return;

    lastUsedProfileRef.current = selectedProfileId;

    // Build flat profile data from profile + leg
    const profileData = buildFillData(effectiveProfile, leg);

    // Merge user-entered form data (occupation, home address, city, etc.)
    // SmartForm saves to formStore, not the profile — read it directly
    const formState = useFormStore.getState();
    if (formState.currentForm) {
      formState.currentForm.sections.flatMap(s => s.fields).forEach(field => {
        const val = field.currentValue != null ? String(field.currentValue) : '';
        if (val && !profileData[field.id]) {
          profileData[field.id] = val;
        }
      });
    }

    const script = buildHeuristicFillScript(profileData);
    webViewRef.current?.injectJavaScript(script);
  }, [effectiveProfile, leg, schema, selectedProfileId, lastUsedProfileRef, webViewRef]);

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
