# Model: Stores

Single source of truth for the Zustand store inventory. Other policies reference this file instead of duplicating the list.

## Entities

### useProfileStore
- Manages: multi-profile/family management, onboarding
- Key actions: createProfile, updateProfile, deleteProfile, switchProfile

### useTripStore
- Manages: trips, legs, QR codes, multi-traveler assignment
- Key actions: createTrip, updateTripLeg, deleteTripLeg

### useFormStore
- Manages: form generation, validation, auto-fill state
- Key actions: generateForm, updateField, validateForm

### useAppStore
- Manages: preferences, feature flags, app lock, network status
- Key actions: updatePreference, toggleFeatureFlag

## Relationships
```
useProfileStore 1──* TravelerProfile
useTripStore 1──* Trip 1──* TripLeg
useFormStore 1──1 GeneratedForm (per active leg)
useAppStore 1──1 AppPreferences
```

## Invariants
- Stores never import other stores (coordinate in hooks)
- Stores never import hooks
- Stores only import services and own internal files

## Key Files
- `src/stores/useProfileStore.ts`
- `src/stores/useTripStore.ts`
- `src/stores/useFormStore.ts`
- `src/stores/useAppStore.ts`
