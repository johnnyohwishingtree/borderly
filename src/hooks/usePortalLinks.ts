import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTripStore } from '@/stores/useTripStore';
import { schemaRegistry, initializeSchemaRegistry } from '@/services/schemas';
import type { FormsStackParamList } from '@/app/navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface PortalCard {
  countryCode: string;
  portalName: string;
  portalUrl: string;
  legId: string;
  isSubmitted: boolean;
}

interface UsePortalLinksOptions {
  tripId: string;
  countryCodes: string[];
}

type Nav = NativeStackNavigationProp<FormsStackParamList, 'PortalLinks'>;

export function usePortalLinks({ tripId, countryCodes }: UsePortalLinksOptions) {
  const navigation = useNavigation<Nav>();
  const [portalCards, setPortalCards] = useState<PortalCard[]>([]);

  useEffect(() => {
    async function loadPortals() {
      if (!tripId) return;

      // Read latest store state (not stale React snapshot)
      const trip = useTripStore.getState().getTripById(tripId);
      if (!trip) return;

      await initializeSchemaRegistry();

      const cards: PortalCard[] = [];
      for (const code of countryCodes) {
        const schema = schemaRegistry.getSchema(code);
        const leg = (trip.legs || []).find(l => l.destinationCountry === code);
        if (!schema || !leg) continue;

        cards.push({
          countryCode: code,
          portalName: schema.portalName,
          portalUrl: schema.portalUrl,
          legId: leg.id,
          isSubmitted: leg.submissionStatus === 'submitted',
        });
      }
      setPortalCards(cards);
    }
    loadPortals();
  }, [tripId, countryCodes]);

  const launchPortal = useCallback((countryCode: string) => {
    const card = portalCards.find(c => c.countryCode === countryCode);
    if (!card) return;
    navigation.navigate('PortalSubmission', {
      url: card.portalUrl,
      countryCode: card.countryCode,
      tripId,
      legId: card.legId,
    });
  }, [navigation, portalCards, tripId]);

  return { portalCards, launchPortal };
}
