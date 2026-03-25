import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Trip } from '@/types/trip';

export type TripStatusFilter = 'all' | 'upcoming' | 'active' | 'completed';

export interface UseTripFilterReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: TripStatusFilter;
  setStatusFilter: (filter: TripStatusFilter) => void;
  filteredTrips: Trip[];
  resultCount: number;
  hasActiveFilters: boolean;
  clearSearch: () => void;
}

const DEBOUNCE_MS = 300;

export function useTripFilter(trips: Trip[]): UseTripFilterReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatusFilter>('all');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset filters on screen focus
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setSearchQuery('');
      setDebouncedQuery('');
      setStatusFilter('all');
    });
    return unsubscribe;
  }, [navigation]);

  // Debounce search input
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [searchQuery]);

  const filteredTrips = useMemo(() => {
    let result = trips;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(trip => trip.status === statusFilter);
    }

    // Search filter (case-insensitive substring match on trip name)
    const query = debouncedQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(trip =>
        trip.name.toLowerCase().includes(query),
      );
    }

    return result;
  }, [trips, statusFilter, debouncedQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const hasActiveFilters = statusFilter !== 'all' || debouncedQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredTrips,
    resultCount: filteredTrips.length,
    hasActiveFilters,
    clearSearch,
  };
}
