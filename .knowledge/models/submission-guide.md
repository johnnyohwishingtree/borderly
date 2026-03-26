# Model: Submission Guide

## Entities

### Portal
- Properties: `countryCode`, `portalName`, `url`, `requiresAccount`
- Examples: Visit Japan Web, SG Arrival Card, Malaysia MDAC

### SubmissionStep
- Properties: `stepNumber`, `title`, `description`, `copyableFields[]`
- Each step shows the user what to enter on the portal

### CopyableField
- Properties: `label`, `value`, `fieldId`
- User taps to copy value to clipboard for pasting into portal

### PortalCredential
- Properties: `portalCode`, `username`, `password`
- Storage: OS Keychain (credentials are sensitive)

## Relationships
```
Country 1──1 Portal
Portal 1──* SubmissionStep (ordered)
SubmissionStep 1──* CopyableField
Portal 1──1 PortalCredential (optional)
```

## Invariants
- Clipboard auto-clears after 60 seconds when passport data is copied
- Portal communication is direct device-to-government (no intermediary server)
- Credential storage in Keychain only

## Key Files
- `src/screens/trips/SubmissionGuideScreen/` — step-by-step walkthrough
- `src/screens/trips/PortalSubmissionScreen/` — WebView portal access
- `src/components/guide/CopyableField.tsx` — tap-to-copy field
- `src/components/guide/StepCard.tsx` — step display
- `src/services/submission/submissionCoordinator.ts` — facade
