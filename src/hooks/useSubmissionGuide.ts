/**
 * useSubmissionGuide
 *
 * Encapsulates all traveler-switching and step-completion logic for
 * SubmissionGuideScreen so it can be unit-tested independently of the React
 * Native component tree.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { TravelerProfile } from '../types/profile';
import type { TravelerTab } from '../components/trips/TravelerTabs';
import { useTripStore } from '../stores/useTripStore';
import { useProfileStore } from '../stores/useProfileStore';
import { generateFilledFormForTraveler } from '../services/forms/formEngine';
import { getSchemaByCountryCode } from '../services/schemas/schemaRegistry';
import type { FilledFormSection, FilledFormField } from '../services/forms/formEngine';
import { formatFieldValue } from '../utils/fieldFormatters';
import {
  buildSubmissionGuideTabs,
  markStepComplete,
  getCompletedStepsForTraveler,
  resolveInitialTravelerId,
} from '../utils/submissionGuideHelpers';

interface UseSubmissionGuideOptions {
  tripId: string;
  legId: string;
  countryCode: string;
  travelerId?: string | undefined;
}

export interface UseSubmissionGuideResult {
  /** True while the initial profile/schema load is in progress */
  isLoading: boolean;
  /** Resolved country schema (or null if not yet loaded) */
  schema: any;
  /** Filled form for the active traveler (or null if not yet generated) */
  filledForm: any;
  /** Profile of the currently-active traveler */
  currentTraveler: TravelerProfile | null;
  /** Steps completed by the currently-active traveler */
  completedSteps: number[];
  /** Which step the UI cursor is on */
  currentStep: number;
  /** Traveler tabs to display (empty when only 1 traveler assigned) */
  travelerTabs: TravelerTab[];
  /** Whether there are multiple assigned travelers */
  hasMultipleTravelers: boolean;
  /** ID of the currently-active traveler */
  activeTravelerId: string | null;
  /** Flat map of field data ready for StepCard consumption */
  fieldsData: Record<string, { label: string; value: string; portalFieldName?: string }>;
  /** Mark a step order as complete and advance the cursor */
  handleStepComplete: (stepOrder: number) => void;
  /** Switch the guide to a different traveler */
  handleSwitchTraveler: (newTravelerId: string) => void;
}

export function useSubmissionGuide({
  tripId,
  legId,
  countryCode,
  travelerId,
}: UseSubmissionGuideOptions): UseSubmissionGuideResult {
  const [activeTravelerId, setActiveTravelerId] = useState<string | null>(
    travelerId ?? null,
  );
  const [currentStep, setCurrentStep] = useState(1);

  // Per-traveler step completion map
  const [completedStepsMap, setCompletedStepsMap] = useState<
    Record<string, number[]>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [currentTraveler, setCurrentTraveler] = useState<TravelerProfile | null>(null);
  const [allTravelerProfiles, setAllTravelerProfiles] = useState<TravelerProfile[]>([]);
  const [schema, setSchema] = useState<any>(null);
  const [filledForm, setFilledForm] = useState<any>(null);

  const { trips } = useTripStore();
  const { profile, getAllProfiles } = useProfileStore();

  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);

  // Profiles map cached across traveler switches
  const profilesMapRef = useRef<Map<string, TravelerProfile>>(new Map());

  // ── Initial load: resolve schema + all traveler profiles ──────────────────
  useEffect(() => {
    const loadInitial = async () => {
      if (!leg) {
        setIsLoading(false);
        return;
      }

      const resolvedCountryCode = countryCode || leg.destinationCountry;
      const countrySchema = getSchemaByCountryCode(resolvedCountryCode);
      if (!countrySchema) {
        setIsLoading(false);
        return;
      }
      setSchema(countrySchema);

      try {
        const profilesMap = await getAllProfiles();
        profilesMapRef.current = profilesMap;

        const assignedTravelers = leg.assignedTravelers ?? [];
        const profiles: TravelerProfile[] = assignedTravelers
          .map(id => profilesMap.get(id))
          .filter((p): p is TravelerProfile => p !== undefined);

        setAllTravelerProfiles(profiles);

        // Determine initial active traveler using pure helper
        const initialTravelerId = resolveInitialTravelerId(
          travelerId,
          profile?.id,
          assignedTravelers,
        );

        if (!initialTravelerId) {
          setIsLoading(false);
          return;
        }

        setActiveTravelerId(initialTravelerId);
      } catch (error) {
        console.error('Failed to load profile data:', error);
        setIsLoading(false);
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg, profile, countryCode, travelerId, getAllProfiles]);

  // ── Regenerate form whenever activeTravelerId changes ─────────────────────
  useEffect(() => {
    if (!activeTravelerId || !leg || !schema) {
      return;
    }

    const targetProfile = profilesMapRef.current.get(activeTravelerId);
    if (!targetProfile) {
      setIsLoading(false);
      return;
    }

    setCurrentTraveler(targetProfile);

    const existingFormData = leg.travelerFormsData?.find(
      t => t.travelerId === activeTravelerId,
    )?.formData;

    const form = generateFilledFormForTraveler(
      activeTravelerId,
      Array.from(profilesMapRef.current.values()),
      leg,
      schema,
      existingFormData,
    );

    setFilledForm(form);
    setIsLoading(false);
  }, [activeTravelerId, leg, schema]);

  // ── Derived (using pure helpers) ──────────────────────────────────────────
  const completedSteps = useMemo(
    () =>
      activeTravelerId
        ? getCompletedStepsForTraveler(completedStepsMap, activeTravelerId)
        : [],
    [completedStepsMap, activeTravelerId],
  );

  const travelerTabs: TravelerTab[] = useMemo(
    () => (leg ? buildSubmissionGuideTabs(allTravelerProfiles, leg) : []),
    [allTravelerProfiles, leg],
  );

  const hasMultipleTravelers = travelerTabs.length > 1;

  const fieldsData = useMemo(() => {
    if (!filledForm) return {};

    const data: Record<string, { label: string; value: string; portalFieldName?: string }> = {};

    filledForm.sections.forEach((section: FilledFormSection) => {
      section.fields.forEach((field: FilledFormField) => {
        data[field.id] = {
          label: field.label,
          value: formatFieldValue(field.currentValue, field.type),
          ...(field.portalFieldName !== undefined && {
            portalFieldName: field.portalFieldName,
          }),
        };
      });
    });

    return data;
  }, [filledForm]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStepComplete = useCallback(
    (stepOrder: number) => {
      if (!activeTravelerId) return;

      setCompletedStepsMap(prev =>
        markStepComplete(prev, activeTravelerId, stepOrder),
      );

      if (stepOrder < (schema?.submissionGuide?.length ?? 0)) {
        setCurrentStep(stepOrder + 1);
      }
    },
    [activeTravelerId, schema],
  );

  const handleSwitchTraveler = useCallback(
    (newTravelerId: string) => {
      if (newTravelerId === activeTravelerId) return;
      setActiveTravelerId(newTravelerId);
      setCurrentStep(1);
      setIsLoading(true);
    },
    [activeTravelerId],
  );

  return {
    isLoading,
    schema,
    filledForm,
    currentTraveler,
    completedSteps,
    currentStep,
    travelerTabs,
    hasMultipleTravelers,
    activeTravelerId,
    fieldsData,
    handleStepComplete,
    handleSwitchTraveler,
  };
}
