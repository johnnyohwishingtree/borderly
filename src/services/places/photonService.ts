/**
 * Photon (OpenStreetMap) geocoding — free fallback for Android/web.
 *
 * API: https://photon.komoot.io
 * No API key needed. No billing. Quality is lower than Apple/Google
 * for hotel search but adequate for address autocomplete.
 */

import type { PlaceSuggestion } from './placesService';
import type { Address } from '../../types/profile';

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonFeature {
  properties: {
    osm_id: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
}

function featureToSuggestion(f: PhotonFeature): PlaceSuggestion {
  const p = f.properties;
  const mainText = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || 'Unknown';
  const secondaryParts = [p.city, p.country].filter(Boolean);
  return {
    placeId: `photon-${p.osm_id}`,
    description: [mainText, ...secondaryParts].join(', '),
    mainText,
    secondaryText: secondaryParts.join(', '),
  };
}

function featureToAddress(f: PhotonFeature): Partial<Address> {
  const p = f.properties;
  const result: Partial<Address> = {};
  const line1 = [p.housenumber, p.street].filter(Boolean).join(' ');
  if (line1) result.line1 = line1;
  if (p.city) result.city = p.city;
  if (p.state) result.state = p.state;
  if (p.postcode) result.postalCode = p.postcode;
  if (p.countrycode) result.country = p.countrycode.toUpperCase();
  return result;
}

export async function photonSearch(
  query: string,
  type: 'lodging' | 'address',
): Promise<Array<PlaceSuggestion & { address: Partial<Address>; formattedAddress: string; name: string }>> {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    limit: '5',
  });

  // Photon doesn't have a "lodging" filter as reliable as Google/Apple,
  // but we can filter by OSM tags for hotels
  if (type === 'lodging') {
    params.set('osm_tag', 'tourism:hotel');
  }

  try {
    const response = await fetch(`${PHOTON_URL}?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json() as { features: PhotonFeature[] };
    return (data.features || []).map(f => {
      const suggestion = featureToSuggestion(f);
      const address = featureToAddress(f);
      const formattedParts = [
        address.line1,
        address.city,
        address.state,
        address.postalCode,
        address.country,
      ].filter(Boolean);
      return {
        ...suggestion,
        name: f.properties.name || suggestion.mainText,
        address,
        formattedAddress: formattedParts.join(', '),
      };
    });
  } catch {
    return [];
  }
}
