# Support Workflows & User Feedback Collection

This document outlines the support system and user feedback collection workflows implemented in Borderly.

## Overview

Borderly implements a comprehensive user feedback and support system that maintains the app's core privacy-first principles. All feedback and bug reports are stored locally on the device, with optional export functionality for privacy compliance.

## Architecture

```
User Feedback Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Action   │ -> │  Feedback/Bug    │ -> │  Local Storage  │
│ (Rate/Report)   │    │  Collection      │    │     (MMKV)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                v
                       ┌──────────────────┐
                       │   Analytics &    │
                       │   Statistics     │
                       └──────────────────┘
```

## Components

### 1. Support Screens

#### FeedbackScreen (`src/screens/support/FeedbackScreen.tsx`)
- **Purpose**: Collect user feedback with ratings and categorization
- **Features**:
  - 5-star rating system
  - Feedback categorization (general, feature request, UX, etc.)
  - Optional subject line
  - 1000-character message limit
  - Privacy notice display
- **Navigation**: Settings → Send Feedback

#### BugReportScreen (`src/screens/support/BugReportScreen.tsx`)
- **Purpose**: Collect detailed bug reports with diagnostic information
- **Features**:
  - Severity classification (low, medium, high, critical)
  - Bug categorization (passport scan, form generation, etc.)
  - Title and description fields
  - Optional steps to reproduce
  - Automatic diagnostic info collection (opt-in)
  - Privacy-compliant diagnostic data
- **Navigation**: Settings → Report Bug

#### HelpScreen (`src/screens/support/HelpScreen.tsx`)
- **Purpose**: Provide self-service support and FAQ
- **Features**:
  - Comprehensive FAQ with search and filtering
  - Category-based organization
  - Contact options (feedback, bug report, email)
  - App information display
  - Emergency travel support guidance
- **Navigation**: Settings → Help & FAQ

### 2. Support Components

#### RatingPrompt (`src/components/support/RatingPrompt.tsx`)
- **Purpose**: Proactive feedback collection at key moments
- **Features**:
  - Modal-based rating prompt
  - Context-aware messaging
  - Automatic follow-up for low ratings
  - Privacy notice
- **Triggers**:
  - `app-usage`: General app experience
  - `form-completion`: After completing travel forms
  - `trip-completion`: After trip planning
  - `manual`: User-initiated rating

### 3. Support Services

#### FeedbackCollector (`src/services/support/feedbackCollector.ts`)
- **Purpose**: Handle feedback submission and storage
- **Features**:
  - Local MMKV storage
  - Feedback validation
  - Statistics generation
  - Privacy compliance (data export/cleanup)
  - Future-ready for server integration
- **Data Structure**:
  ```typescript
  interface FeedbackData {
    id: string;
    type: 'general' | 'feature' | 'ux' | 'country-forms' | 'performance' | 'other';
    rating: number; // 1-5
    subject?: string;
    message: string;
    timestamp: string;
    metadata: {
      appVersion: string;
      platform: string;
      language: string;
      analyticsEnabled: boolean;
    };
  }
  ```

#### BugReporter (`src/services/support/bugReporter.ts`)
- **Purpose**: Handle bug report submission and diagnostic collection
- **Features**:
  - Bug report validation and storage
  - Automatic diagnostic info collection
  - Error logging system
  - Statistics and analytics
  - Privacy-compliant data export
- **Diagnostic Information**:
  - Platform details (OS, version)
  - App configuration (language, theme, features)
  - Device state (profile setup, trips count)
  - Memory and performance estimates
  - Recent error logs (anonymized)
  - Feature availability (camera, biometrics, keychain)

## Privacy & Security

### Local-First Architecture
- **No Server Storage**: All feedback and bug reports stored locally using MMKV
- **No PII Collection**: Diagnostic info excludes personal or passport data
- **User Control**: Users can export or clear their feedback data
- **Opt-in Diagnostics**: Diagnostic info collection is optional and clearly disclosed

### Data Storage
- **Location**: MMKV secure storage (not synced to cloud)
- **Retention**: Automatic cleanup after 90 days
- **Limits**: Max 50 feedback items, 25 bug reports, 100 error logs
- **Export**: JSON export for user data portability

### Privacy Notices
All feedback collection includes clear privacy notices explaining:
- What data is collected
- How it's used (product improvement only)
- Where it's stored (local device only)
- User control options

## User Workflows

### Feedback Collection Workflow
1. **Trigger**: User rates experience or provides feedback
2. **Collection**: FeedbackScreen captures rating, type, and message
3. **Validation**: Input validation (1-5 rating, message required, length limits)
4. **Storage**: Local storage via FeedbackCollector service
5. **Follow-up**: Low ratings (≤3) prompt for detailed feedback
6. **Analytics**: Anonymous statistics for product insights

### Bug Reporting Workflow
1. **Discovery**: User encounters issue or uses Report Bug feature
2. **Classification**: User selects severity and category
3. **Description**: User provides title, description, and reproduction steps
4. **Diagnostics**: Optional diagnostic info collection
5. **Submission**: Local storage via BugReporter service
6. **Tracking**: Bug report stored with unique ID for reference

### Help & Support Workflow
1. **Self-Service**: Users browse FAQ and help content
2. **Search/Filter**: Users find relevant information by category
3. **Contact Options**: Multiple support channels available
4. **Emergency Support**: Clear guidance for urgent travel issues
5. **Escalation**: Options to submit feedback or bug reports

## Integration Points

### Navigation Integration
- Support screens integrated into SettingsStack
- Navigation types updated for TypeScript support
- Lazy loading for performance optimization

### Settings Integration
- Help & Support section in SettingsScreen
- Direct navigation to support screens
- Consistent UI patterns and accessibility

### Future Enhancements

#### Phase 2: Server Integration
```typescript
// Future server integration structure
interface RemoteSubmission {
  endpoint: string;
  authentication: 'anonymous' | 'api-key';
  encryption: boolean;
  retryPolicy: RetryPolicy;
}
```

#### Phase 2: Advanced Features
- Email support integration
- In-app live chat
- Remote feedback analytics
- Automated bug triage
- User feedback surveys
- A/B testing integration

#### Phase 2: App Store Integration
- App Store review monitoring
- Automated review response
- Rating prompt optimization
- Release feedback tracking

## Implementation Notes

### Error Handling
- Graceful degradation when storage fails
- User-friendly error messages
- Fallback to basic functionality
- Comprehensive error logging

### Performance
- Lazy loading of support screens
- Efficient local storage operations
- Memory-conscious diagnostic collection
- Background cleanup operations

### Accessibility
- Screen reader support
- Adequate touch targets (44px minimum)
- Clear focus indicators
- Semantic markup and labels

### Testing
- Unit tests for services
- E2E tests for user workflows
- Mock implementations for native features
- Privacy compliance validation

## Monitoring & Analytics

### Local Analytics
- Feedback submission rates
- Rating distribution
- Bug report categories
- User help-seeking behavior

### Privacy-Compliant Metrics
- Aggregated usage patterns
- Anonymous performance metrics
- Feature adoption rates
- Support effectiveness measures

All analytics respect user privacy preferences and exclude personally identifiable information.

## Conclusion

The support system provides comprehensive feedback collection and user assistance while maintaining Borderly's privacy-first principles. The local-first architecture ensures user data stays on device while providing valuable insights for product improvement.

Future phases will introduce optional server integration for enhanced features while preserving user choice and privacy control.