import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormStore } from '@/stores/useFormStore';
import { useTripStore } from '@/stores/useTripStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { schemaRegistry, initializeSchemaRegistry } from '@/services/schemas';
import type { FilledForm } from '@/services/forms/formEngine/formEngine';
import type { BoardingPassData } from '@/app/navigation/types';

interface CountrySection {
  countryCode: string;
  legId: string;
  form: FilledForm | null;
  remainingFields: number;
  totalFields: number;
}

interface UseSmartFormOptions {
  countryCodes: string[];
  travelerIds: string[];
  boardingPassData?: BoardingPassData[] | undefined;
}

export function useSmartForm({ countryCodes, travelerIds, boardingPassData }: UseSmartFormOptions) {
  const tripStore = useTripStore();
  const profileStore = useProfileStore();
  const formStore = useFormStore();

  const [tripId, setTripId] = useState<string>('');
  const [countrySections, setCountrySections] = useState<CountrySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a trip + legs behind the scenes on mount
  useEffect(() => {
    async function initTrip() {
      setIsLoading(true);
      setError(null);
      try {
        const profile = profileStore.currentProfile;
        if (!profile) {
          setError('No profile found');
          return;
        }

        // Create trip (invisible to user — just a data container)
        const trip = await tripStore.createTrip({
          name: `Forms — ${countryCodes.join(', ')}`,
          status: 'upcoming',
          legs: [],
        });

        if (!trip) {
          setError('Failed to create trip');
          return;
        }
        setTripId(trip.id);

        // Add legs for each country, enriching with boarding pass data if available
        const today = new Date().toISOString().split('T')[0];
        for (let i = 0; i < countryCodes.length; i++) {
          const bpData = boardingPassData?.find(d => d.countryCode === countryCodes[i]);
          await tripStore.addTripLeg(trip.id, {
            destinationCountry: countryCodes[i],
            arrivalDate: bpData?.flightDate || today,
            departureDate: today,
            ...(bpData?.flightNumber && { flightNumber: bpData.flightNumber }),
            ...(bpData?.airlineCode && { airlineCode: bpData.airlineCode }),
            ...(bpData?.arrivalAirport && { arrivalAirport: bpData.arrivalAirport }),
            ...(bpData?.departureAirport && { departureAirport: bpData.departureAirport }),
            accommodation: { name: '', address: { line1: '', city: '', postalCode: '', country: '' } },
            formStatus: 'not_started',
            submissionStatus: 'not_started',
            order: i,
          });
        }

        // Reload trip to get legs with IDs (use getState for fresh read)
        const fullTrip = useTripStore.getState().getTripById(trip.id);
        if (!fullTrip || !fullTrip.legs?.length) {
          setError(`Trip has no legs (trip: ${trip.id}, legs: ${fullTrip?.legs?.length ?? 0})`);
          return;
        }

        // Assign travelers to all legs
        for (const leg of fullTrip.legs) {
          await tripStore.assignTravelersToLeg(leg.id, travelerIds);
        }

        // Ensure schemas are loaded (idempotent — no-op if already initialized)
        await initializeSchemaRegistry();

        // Generate form for each country (smart delta — only unfilled fields)
        const sections: CountrySection[] = [];

        for (const leg of fullTrip.legs) {
          const schema = schemaRegistry.getSchema(leg.destinationCountry);
          if (!schema) {
            setError(`No schema for ${leg.destinationCountry}`);
            continue;
          }

          formStore.generateForm(profile, leg, schema, {});
          // Read latest state after generateForm mutated it
          const currentForm = useFormStore.getState().currentForm;

          if (currentForm) {
            const allFields = currentForm.sections.flatMap(s => s.fields);
            const unfilled = allFields.filter(f => f.needsUserInput);

            sections.push({
              countryCode: leg.destinationCountry,
              legId: leg.id,
              form: unfilled.length > 0 ? currentForm : null,
              remainingFields: unfilled.length,
              totalFields: allFields.length,
            });
          }
        }

        if (sections.length === 0) {
          setError('No form sections generated');
        }
        setCountrySections(sections);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    initTrip();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = useCallback((formData: Record<string, unknown>) => {
    for (const [fieldId, value] of Object.entries(formData)) {
      formStore.updateField(fieldId, value);
    }

    // Recalculate remaining fields so progress updates in real time
    setCountrySections(prev =>
      prev.map(section => {
        const currentForm = section.form;
        if (!currentForm) return section;

        const allFields = currentForm.sections.flatMap(s => s.fields);
        const unfilled = allFields.filter(f => {
          // A field is filled if the user just provided a value for it
          if (formData[f.id] !== undefined && formData[f.id] !== '' && formData[f.id] !== null) {
            return false;
          }
          return f.needsUserInput;
        });

        return {
          ...section,
          remainingFields: unfilled.length,
        };
      }),
    );
  }, [formStore]);

  const overallProgress = useMemo(() => {
    const totalFields = countrySections.reduce((sum, s) => sum + s.totalFields, 0);
    const remaining = countrySections.reduce((sum, s) => sum + s.remainingFields, 0);
    if (totalFields === 0) return 0;
    return (totalFields - remaining) / totalFields;
  }, [countrySections]);

  const isAllComplete = useMemo(
    () => countrySections.every(s => s.remainingFields === 0),
    [countrySections],
  );

  return {
    countrySections,
    handleFieldChange,
    overallProgress,
    isAllComplete,
    tripId,
    isLoading,
    error,
  };
}
