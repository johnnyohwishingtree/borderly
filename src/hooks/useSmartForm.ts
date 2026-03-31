import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormStore } from '@/stores/useFormStore';
import { useTripStore } from '@/stores/useTripStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { schemaRegistry } from '@/services/schemas';
import type { FilledForm } from '@/services/forms/formEngine/formEngine';

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
}

export function useSmartForm({ countryCodes, travelerIds }: UseSmartFormOptions) {
  const tripStore = useTripStore();
  const profileStore = useProfileStore();
  const formStore = useFormStore();

  const [tripId, setTripId] = useState<string>('');
  const [countrySections, setCountrySections] = useState<CountrySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create a trip + legs behind the scenes on mount
  useEffect(() => {
    async function initTrip() {
      setIsLoading(true);
      try {
        const profile = profileStore.currentProfile;
        if (!profile) return;

        // Create trip (invisible to user — just a data container)
        const trip = await tripStore.createTrip({
          name: `Forms — ${countryCodes.join(', ')}`,
          status: 'upcoming',
          legs: [],
        });

        if (!trip) return;
        setTripId(trip.id);

        // Add legs for each country
        const today = new Date().toISOString().split('T')[0];
        for (let i = 0; i < countryCodes.length; i++) {
          await tripStore.addTripLeg(trip.id, {
            destinationCountry: countryCodes[i],
            arrivalDate: today,
            departureDate: today,
            accommodation: { name: '', address: { line1: '', city: '', postalCode: '', country: '' } },
            formStatus: 'not_started',
            submissionStatus: 'not_started',
            order: i,
          });
        }

        // Reload trip to get legs with IDs
        const fullTrip = tripStore.getTripById(trip.id);
        if (!fullTrip) return;

        // Assign travelers to all legs
        for (const leg of fullTrip.legs || []) {
          await tripStore.assignTravelersToLeg(leg.id, travelerIds);
        }

        // Generate form for each country (smart delta — only unfilled fields)
        const sections: CountrySection[] = [];

        for (const leg of fullTrip.legs || []) {
          const schema = await schemaRegistry.getSchema(leg.destinationCountry);
          if (!schema) continue;

          formStore.generateForm(profile, leg, schema, {});
          const currentForm = formStore.currentForm;

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

        setCountrySections(sections);
      } finally {
        setIsLoading(false);
      }
    }
    initTrip();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = useCallback((formData: Record<string, unknown>) => {
    // DynamicForm calls this with the full form data record
    for (const [fieldId, value] of Object.entries(formData)) {
      formStore.updateField(fieldId, value);
    }
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
  };
}
