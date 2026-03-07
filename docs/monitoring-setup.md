# Production Monitoring & Analytics Setup Guide

## Overview

Borderly's production monitoring infrastructure provides comprehensive observability while maintaining strict privacy compliance. The system consists of four main components:

1. **Production Monitoring Service** - Core event tracking and performance monitoring
2. **Privacy-Compliant Analytics Service** - Usage patterns and user journey analytics
3. **Crash Reporting Service** - Error tracking with automatic PII sanitization
4. **Alerting Service** - Real-time monitoring with configurable alert rules

## Core Principles

- **Zero-Server PII Policy**: No personally identifiable information ever leaves the device
- **Privacy-First Design**: All data is sanitized before collection or logging
- **Local-First Storage**: Monitoring data is stored locally with configurable retention
- **Minimal Data Collection**: Only collect data necessary for app improvement

## Installation & Setup

### 1. Basic Setup

```typescript
// App.tsx - Initialize monitoring services
import { productionMonitoring } from './src/services/monitoring/productionMonitoring';
import { privacyCompliantAnalytics } from './src/services/analytics/privacyCompliantAnalytics';
import { crashReporting } from './src/utils/crashReporting';
import { alerting } from './src/services/monitoring/alerting';

// Initialize crash reporting (auto-setup in production)
crashReporting.setup();

// Track app initialization
const initTimer = productionMonitoring.startTiming('app_initialization');
// ... app initialization code
initTimer();

// Track screen navigation
privacyCompliantAnalytics.trackScreenView('WelcomeScreen');
```

### 2. Screen-Level Integration

```typescript
// screens/onboarding/WelcomeScreen.tsx
import { privacyCompliantAnalytics } from '../../services/analytics/privacyCompliantAnalytics';
import { crashReporting } from '../../utils/crashReporting';

export function WelcomeScreen() {
  useEffect(() => {
    // Track screen view
    privacyCompliantAnalytics.trackScreenView('WelcomeScreen');
    
    // Add breadcrumb for crash context
    crashReporting.trackNavigation('previous_screen', 'WelcomeScreen');
    
    // Start user journey tracking
    privacyCompliantAnalytics.startJourney('onboarding', 'WelcomeScreen');
  }, []);

  const handleContinue = () => {
    // Track user action
    privacyCompliantAnalytics.trackUserAction('continue_button_pressed', 'WelcomeScreen');
    
    // Navigate...
  };

  return (
    // Your component JSX
  );
}
```

### 3. Error Handling Integration

```typescript
// services/forms/formEngine.ts
import { productionMonitoring } from '../monitoring/productionMonitoring';
import { crashReporting } from '../../utils/crashReporting';

export function generateForm(profile: Profile, schema: CountrySchema) {
  const timer = productionMonitoring.startTiming('form_generation');
  
  try {
    // Form generation logic...
    
    const result = processFormData(profile, schema);
    
    // Track successful completion
    productionMonitoring.recordEvent('user_action', 'form_generation', {
      success: true,
      countryCode: schema.countryCode,
      fieldCount: result.fields.length
    });
    
    return result;
    
  } catch (error) {
    // Report error with context
    crashReporting.reportError(error as Error, 'form_generation', {
      countryCode: schema.countryCode,
      profileComplete: !!profile.passport
    });
    
    throw error;
  } finally {
    timer();
  }
}
```

## Configuration

### Production Monitoring

```typescript
// Configure production monitoring
productionMonitoring.setEnabled(true); // Enable/disable monitoring

// Check monitoring status
const status = productionMonitoring.getStatus();
console.log('Monitoring enabled:', status.isEnabled);
console.log('Events recorded:', status.eventCount);
```

### Privacy-Compliant Analytics

```typescript
// Update privacy settings
privacyCompliantAnalytics.updatePrivacySettings({
  enabled: true,
  allowPerformanceTracking: true,
  allowUsageAnalytics: true,
  allowErrorTracking: true,
  dataRetentionDays: 30
});

// Generate usage metrics
const metrics = privacyCompliantAnalytics.generateUsageMetrics();
console.log('Screen views:', metrics.screenViews);
console.log('Feature usage:', metrics.featureUsage);
```

### Crash Reporting

```typescript
// Configure crash reporting
crashReporting.updateConfig({
  enabled: true,
  maxBreadcrumbs: 50,
  enableConsoleCapture: true,
  enablePromiseRejectionCapture: true,
  beforeSend: (report) => {
    // Custom filtering logic
    if (report.severity === 'low') {
      return null; // Don't send low severity reports
    }
    return report;
  },
  onCrash: (report) => {
    // Custom crash handling
    console.log('Crash reported:', report.id);
  }
});
```

### Alerting System

```typescript
// Add custom alert rule
alerting.addRule({
  name: 'High Memory Usage',
  description: 'Alerts when memory usage exceeds threshold',
  category: 'performance',
  condition: {
    type: 'performance_threshold',
    eventType: 'performance',
    field: 'data.memoryUsage',
    operator: 'gt',
    value: 500 * 1024 * 1024 // 500MB
  },
  threshold: 3,
  timeWindow: 5,
  severity: 'medium',
  enabled: true,
  cooldown: 10,
  actions: [
    { type: 'console', config: {}, enabled: true }
  ],
  tags: { category: 'memory', custom: 'true' }
});
```

## Monitoring Best Practices

### 1. Screen Tracking

- Track all major screen views for user journey analysis
- Include relevant context (previous screen, user state)
- Start/end journey tracking for important flows

### 2. Performance Monitoring

```typescript
// Time critical operations
const timer = productionMonitoring.startTiming('passport_ocr');
try {
  const result = await performOCR(image);
  // Success tracking
  privacyCompliantAnalytics.trackFeatureUsage('passport_ocr', {
    success: true,
    processingTime: timer()
  });
  return result;
} catch (error) {
  timer();
  crashReporting.reportError(error, 'ocr_processing');
  throw error;
}
```

### 3. Error Context

```typescript
// Add meaningful breadcrumbs before risky operations
crashReporting.addBreadcrumb('user_action', 'Starting form submission', 'info', {
  formType: 'immigration',
  countryCode: 'JPN',
  fieldCount: 15
});

try {
  await submitForm(formData);
} catch (error) {
  crashReporting.reportError(error, 'form_submission', {
    formType: 'immigration',
    countryCode: 'JPN'
  }, 'high');
}
```

### 4. Feature Usage Tracking

```typescript
// Track important feature usage
privacyCompliantAnalytics.trackFeatureUsage('qr_code_scan', {
  source: 'camera',
  successful: true
});

privacyCompliantAnalytics.trackFeatureUsage('form_auto_fill', {
  countryCode: 'SGP',
  fieldsPreFilled: 12,
  totalFields: 15
});
```

## Data Export & Analysis

### Export Monitoring Data

```typescript
// Export production monitoring data
const monitoringData = productionMonitoring.exportData({
  start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
  end: Date.now()
});

// Export analytics data
const analyticsMetrics = privacyCompliantAnalytics.generateUsageMetrics();
const journeyAnalytics = privacyCompliantAnalytics.exportJourneyAnalytics();
```

### Alerting Statistics

```typescript
// Get alerting overview
const alertStats = alerting.getStatistics();
console.log('Active alerts:', alertStats.activeAlerts);
console.log('Alerts by category:', alertStats.alertsByCategory);

// Get recent alerts
const recentAlerts = alerting.getAlerts({
  start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
  end: Date.now()
});
```

## Privacy Compliance

### Automatic PII Sanitization

All services automatically sanitize data using the `piiSanitizer` utility:

- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Passport numbers → `[PASSPORT]`
- Names → `[NAME]`
- Addresses → `[ADDRESS]`
- Dates of birth → `[DOB]`

### Data Retention

- **Production Monitoring**: Maintains last 1000 events in memory
- **Analytics**: Configurable retention (default: 30 days)
- **Crash Reports**: Breadcrumbs limited to 50 entries
- **Alerts**: Configurable retention (default: 7 days)

### Privacy Controls

Users can disable monitoring through privacy settings:

```typescript
// Disable all monitoring
privacyCompliantAnalytics.updatePrivacySettings({ enabled: false });
productionMonitoring.setEnabled(false);
crashReporting.updateConfig({ enabled: false });
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Monitor event buffer sizes and retention policies
2. **Alert Spam**: Adjust cooldown periods and thresholds
3. **Missing Events**: Verify monitoring is enabled and services are initialized
4. **Performance Impact**: Monitor the monitoring overhead with performance metrics

### Debug Information

```typescript
// Check service status
console.log('Production Monitoring:', productionMonitoring.getStatus());
console.log('Crash Reporting:', crashReporting.getStatus());
console.log('Analytics Data:', privacyCompliantAnalytics.getDataStatus());
console.log('Alerting Stats:', alerting.getStatistics());
```

## Integration with External Services

While Borderly maintains a local-first approach, the monitoring system is designed to integrate with external services when needed:

### Firebase Crashlytics Integration

```typescript
// Example custom crash handler
crashReporting.updateConfig({
  onCrash: (report) => {
    // Send to external service (sanitized data only)
    if (report.severity === 'critical') {
      externalLogger.logCrash({
        id: report.id,
        message: report.error.message,
        platform: report.device.platform,
        version: report.device.appVersion
      });
    }
  }
});
```

### Custom Analytics Backend

```typescript
// Example analytics export
const exportAnalytics = () => {
  const metrics = privacyCompliantAnalytics.generateUsageMetrics();
  
  // Only send aggregated, non-PII data
  analyticsAPI.send({
    sessionCount: 1,
    screenViews: Object.keys(metrics.screenViews).length,
    averageSessionDuration: metrics.sessionDuration,
    popularCountries: Object.keys(metrics.countryPopularity).slice(0, 5)
  });
};
```

## Security Considerations

1. **Never log sensitive data** - All services sanitize data automatically
2. **Local storage only** - No data transmitted without explicit user consent
3. **Regular audits** - Review monitoring data for any PII leakage
4. **Minimal collection** - Only collect data necessary for app improvement
5. **User control** - Provide clear privacy controls to disable monitoring

## Support

For questions about the monitoring setup:
1. Review the privacy audit documentation
2. Check the implementation in the referenced service files
3. Test monitoring behavior in development before production deployment