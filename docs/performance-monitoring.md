# Performance Monitoring Guide

This guide covers the comprehensive performance monitoring system implemented in Borderly for production environments.

## Overview

Borderly's performance monitoring system provides real-time insights into app performance, user behavior, and system health. It consists of three main components:

1. **Production Profiler** - Real-time performance metrics and health scoring
2. **User Flow Analytics** - Journey optimization and friction analysis  
3. **Regression Detection** - Statistical analysis and automated alerting

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Performance Monitoring                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Production  │  │  User Flow   │  │ Regression │  │
│  │  Profiler    │  │  Analytics   │  │ Detection │  │
│  │              │  │              │  │           │  │
│  │ • Metrics    │  │ • Sessions   │  │ • Models  │  │
│  │ • Health     │  │ • Patterns   │  │ • Alerts  │  │
│  │ • Alerts     │  │ • Insights   │  │ • Trends  │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                           │                          │
│                           ▼                          │
│  ┌────────────────────────────────────────────────┐  │
│  │          Performance Dashboard                  │  │
│  │  • Real-time metrics • Optimization recommendations │  │
│  │  • Alert management  • Historical trends        │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Getting Started

### 1. Import Services

```typescript
import { productionProfiler } from '../services/performance/productionProfiler';
import { userFlowAnalytics } from '../services/performance/userFlowAnalytics';
import { regressionDetection } from '../services/performance/regressionDetection';
```

### 2. Basic Usage

#### Recording Performance Metrics

```typescript
// Record a specific metric
productionProfiler.recordMetric('formGenerationTime', 250);

// Measure async operations
const result = await productionProfiler.measureAsync('form-generation', async () => {
  return await generateForm(profile, schema);
});

// Measure sync operations  
const processedData = productionProfiler.measureSync('data-processing', () => {
  return processData(rawData);
});
```

#### Tracking User Actions

```typescript
// Track screen visits
userFlowAnalytics.trackScreenVisit('TripList', 1500);

// Track user actions
userFlowAnalytics.trackAction('CreateTrip', 'save_trip', 500, {
  destinationCount: 3,
  tripType: 'business'
});

// Track screen transitions
userFlowAnalytics.trackScreenTransition('TripList', 'CreateTrip', 300);
```

#### Monitoring Regressions

```typescript
// Analyze current metrics for regressions
const currentMetrics = productionProfiler.getCurrentMetrics();
const alerts = regressionDetection.analyzeMetrics(currentMetrics);

// Register alert listeners
const unsubscribe = regressionDetection.onAlert((alert) => {
  console.log('Performance regression detected:', alert);
  // Handle alert (notify user, log to external service, etc.)
});
```

## Monitored Metrics

### Core Performance Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|---------|----------------|
| `appStartTime` | Time from app launch to first screen | < 3s | > 4.5s |
| `firstScreenRenderTime` | Time to render initial screen | < 1s | > 1.6s |
| `formGenerationTime` | Country form generation time | < 500ms | > 750ms |
| `mrzScanTime` | Passport MRZ scanning duration | < 2s | > 3s |
| `databaseQueryTime` | Average database query time | < 200ms | > 320ms |
| `memoryUsage` | Current memory consumption | < 150MB | > 225MB |
| `screenTransitionTime` | Navigation between screens | < 300ms | > 480ms |

### Success Rate Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|---------|----------------|
| `autoFillSuccessRate` | Auto-fill form completion rate | > 90% | < 81% |
| `mrzAccuracy` | MRZ scanning accuracy | > 95% | < 90.5% |
| `userFlowCompletionRate` | User flow completion rate | > 80% | < 72% |
| `portalSuccessRate` | Government portal success rate | > 95% | < 90.5% |

### Error Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|---------|----------------|
| `errorRate` | Overall application error rate | < 1% | > 1.5% |
| `crashRate` | Application crash rate | < 0.1% | > 0.15% |

## Performance Dashboard

### Getting Dashboard Data

```typescript
const dashboardData = productionProfiler.getDashboardData();

// Dashboard data structure:
{
  healthScore: 85,           // 0-100 overall health score
  metrics: { ... },          // Current performance metrics
  benchmarks: [ ... ],       // Performance vs targets
  recommendations: [ ... ],  // Optimization suggestions
  alerts: [ ... ],          // Recent performance alerts
  trends: [ ... ]           // Historical performance trends
}
```

### Health Score Calculation

The health score (0-100) is calculated based on:
- **Excellent (100 points)**: Metric within target
- **Good (80 points)**: Metric slightly over target (< 30% deviation)
- **Warning (60 points)**: Metric moderately over target (30-80% deviation)
- **Critical (20 points)**: Metric significantly over target (> 80% deviation)

## User Flow Analytics

### Predefined User Flows

1. **Onboarding Flow**: Welcome → PassportScan → ConfirmProfile → BiometricSetup
2. **Trip Creation**: TripList → CreateTrip → TripDetail
3. **Form Completion**: TripDetail → LegForm → SubmissionGuide → QRWallet
4. **Passport Scanning**: PassportScan → Camera → MRZ Detection → Confirmation

### Analytics Insights

```typescript
// Get flow analytics
const onboardingAnalytics = userFlowAnalytics.getFlowAnalytics('onboarding');

// Analytics data structure:
{
  flowId: 'onboarding',
  totalSessions: 1250,
  completionRate: 0.78,
  averageDuration: 145000,
  dropoffPoints: [
    { step: 'PassportScan:scan_passport', dropoffRate: 0.15, userCount: 188 }
  ],
  frictionPoints: [
    { step: 'PassportScan:scan_passport', averageTime: 45000, retryRate: 0.25 }
  ],
  conversionFunnel: [
    { step: 'Welcome:continue', userCount: 1250, conversionRate: 1.0 },
    { step: 'PassportScan:scan_passport', userCount: 1062, conversionRate: 0.85 }
  ]
}
```

### Behavior Pattern Detection

```typescript
// Detect user behavior patterns
const patterns = userFlowAnalytics.detectBehaviorPatterns();

// Pattern examples:
{
  id: 'abandonment-PassportScan',
  pattern: 'High abandonment rate at PassportScan',
  frequency: 0.15,
  impact: 'negative',
  recommendations: [
    'Investigate UX issues on PassportScan screen',
    'Add help text or onboarding tooltips',
    'Consider alternative input methods'
  ]
}
```

## Regression Detection

### Statistical Models

The regression detection system uses statistical models for each performance metric:

- **Baseline Statistics**: Mean, median, standard deviation, percentiles
- **Trend Analysis**: Linear regression to detect improving/declining trends  
- **Outlier Detection**: IQR method to identify anomalous values
- **Confidence Intervals**: Statistical confidence in regression alerts

### Alert Configuration

```typescript
// Update regression thresholds
regressionDetection.updateThresholds('formGenerationTime', {
  warningDeviation: 20,      // 20% deviation triggers warning
  criticalDeviation: 40,     // 40% deviation triggers critical alert
  minimumDataPoints: 100,    // Need 100+ data points for analysis
  confidence: 0.95           // 95% statistical confidence required
});
```

### Regression Reports

```typescript
// Generate comprehensive regression report
const report = regressionDetection.generateReport();

// Report structure:
{
  timestamp: 1640995200000,
  summary: {
    totalAlerts: 3,
    criticalAlerts: 1,
    warningAlerts: 2,
    affectedMetrics: ['formGenerationTime', 'memoryUsage'],
    overallHealth: 'warning'
  },
  alerts: [ ... ],           // Detailed regression alerts
  models: [ ... ],           // Current statistical models
  recommendations: [ ... ]    // High-level recommendations
}
```

## Performance Optimization

### Automated Optimizations

The system can automatically execute performance optimizations:

```typescript
import { performanceOptimization } from '../utils/performanceOptimization';

// Get optimization recommendations
const recommendations = performanceOptimization.getRecommendations(
  currentMetrics,
  regressionAlerts
);

// Execute automated optimizations
const results = await performanceOptimization.executeAutomatedOptimizations(
  currentMetrics,
  regressionAlerts
);
```

### Available Optimization Strategies

1. **Memory Cleanup**: Automatic memory cleanup and garbage collection
2. **Lazy Loading**: Load components and data only when needed
3. **Form Caching**: Cache frequently used form data and schemas
4. **Database Optimization**: Add indexes and optimize queries
5. **Image Optimization**: Optimize images based on device capabilities
6. **Network Optimization**: Optimize requests for government portals
7. **Error Reduction**: Automated error handling and recovery

## Integration Examples

### React Native Screen Integration

```typescript
import React, { useEffect } from 'react';
import { userFlowAnalytics } from '../services/performance/userFlowAnalytics';

const TripListScreen = () => {
  useEffect(() => {
    const startTime = Date.now();
    
    // Track screen visit
    userFlowAnalytics.trackScreenVisit('TripList');
    
    return () => {
      // Track screen duration
      const duration = Date.now() - startTime;
      userFlowAnalytics.trackAction('TripList', 'visit', duration);
    };
  }, []);

  const handleCreateTrip = async () => {
    // Track user action
    userFlowAnalytics.trackAction('TripList', 'create_trip');
    
    // Navigate and track transition
    const startTime = Date.now();
    navigation.navigate('CreateTrip');
    
    const transitionTime = Date.now() - startTime;
    userFlowAnalytics.trackScreenTransition('TripList', 'CreateTrip', transitionTime);
  };

  // Component JSX...
};
```

### Performance Measurement

```typescript
import { performanceOptimization } from '../utils/performanceOptimization';

// Measure form generation performance
const generateOptimizedForm = async (profile, schema) => {
  return await performanceOptimization.measureAsync(
    'form-generation',
    async () => {
      const form = await formEngine.generate(profile, schema);
      const autoFilledForm = await autoFillLogic.process(form, profile);
      return autoFilledForm;
    },
    'form-processing'
  );
};

// Measure synchronous operations
const processData = (data) => {
  return performanceOptimization.measureSync(
    'data-processing',
    () => {
      return sanitizePII(data);
    },
    'data-sanitization'
  );
};
```

## Privacy and Security

### Data Sanitization

All performance data is automatically sanitized to remove PII:

```typescript
// Data is sanitized using existing PII sanitization utilities
const sanitizedMetrics = sanitizePII(performanceData);
```

### Local Storage Only

- **No external transmission**: All performance data stays on-device
- **MMKV storage**: Encrypted local storage for sensitive metrics
- **Automatic cleanup**: Old data is automatically purged (30-90 days)
- **Privacy compliant**: Follows app store requirements for analytics

### Data Retention

| Data Type | Retention Period | Storage Location |
|-----------|-----------------|------------------|
| Performance metrics | 30 days | MMKV (encrypted) |
| User flow sessions | 90 days | MMKV |
| Regression models | 90 days | MMKV |
| Optimization results | 30 days | MMKV |

## Troubleshooting

### Common Issues

**High Memory Usage Alerts**
```typescript
// Check for memory leaks
const memoryTrends = productionProfiler.getBenchmarks()
  .find(b => b.metric === 'memoryUsage');

if (memoryTrends?.trend === 'declining') {
  // Investigate memory leaks
  await performanceOptimization.executeStrategy('memory-cleanup');
}
```

**Poor Form Generation Performance**
```typescript
// Enable form caching optimization
const result = await performanceOptimization.executeStrategy('form-caching');
if (result.success) {
  console.log('Form caching enabled, improvement:', result.metricsImpact.improvement);
}
```

**High User Flow Abandonment**
```typescript
// Analyze abandonment patterns
const patterns = userFlowAnalytics.detectBehaviorPatterns();
const abandonmentPatterns = patterns.filter(p => p.impact === 'negative');

abandonmentPatterns.forEach(pattern => {
  console.log('Abandonment issue:', pattern.pattern);
  console.log('Recommendations:', pattern.recommendations);
});
```

### Debug Mode

Enable detailed logging in development:

```typescript
if (__DEV__) {
  // Log all performance measurements
  productionProfiler.onAlert((alert) => {
    console.log('Performance Alert:', alert);
  });
  
  regressionDetection.onAlert((alert) => {
    console.log('Regression Alert:', alert);
  });
}
```

## API Reference

### ProductionProfiler

- `recordMetric(metric, value)` - Record a performance metric
- `measureAsync(operation, fn)` - Measure async operation performance
- `measureSync(operation, fn)` - Measure sync operation performance
- `getCurrentMetrics()` - Get current performance snapshot
- `getBenchmarks()` - Get performance vs targets
- `getHealthScore()` - Get overall health score (0-100)
- `getDashboardData()` - Get complete dashboard data
- `onAlert(callback)` - Register alert listener

### UserFlowAnalytics

- `startNewSession()` - Start new user session
- `trackAction(screen, action, duration, metadata)` - Track user action
- `trackScreenVisit(screen, duration)` - Track screen visit
- `trackScreenTransition(from, to, duration)` - Track navigation
- `trackAbandonment(screen, reason)` - Track user abandonment
- `getFlowAnalytics(flowId)` - Get analytics for specific flow
- `detectBehaviorPatterns()` - Detect user behavior patterns
- `generateOptimizationInsights()` - Generate optimization recommendations

### RegressionDetection

- `analyzeMetrics(metrics)` - Analyze metrics for regressions
- `analyzeMetric(metric, value)` - Analyze single metric
- `getModels()` - Get current statistical models
- `getRecentAlerts(hours)` - Get recent regression alerts
- `generateReport()` - Generate comprehensive regression report
- `updateThresholds(metric, thresholds)` - Update regression thresholds
- `predictPerformance(metric, hoursAhead)` - Predict future performance
- `onAlert(callback)` - Register regression alert listener

### PerformanceOptimization

- `getRecommendations(metrics, alerts)` - Get optimization recommendations
- `executeStrategy(strategyId)` - Execute optimization strategy
- `executeAutomatedOptimizations(metrics, alerts)` - Run automated optimizations
- `measureAsync(operation, fn, category)` - Measure async performance
- `measureSync(operation, fn, category)` - Measure sync performance
- `getPerformanceBudgets()` - Get performance budget status
- `updatePerformanceBudgets(metrics)` - Update budget compliance
- `getOptimizationReport()` - Get optimization effectiveness report

## Best Practices

1. **Regular Monitoring**: Check performance dashboard daily
2. **Alert Response**: Respond to critical alerts within 1 hour
3. **Trend Analysis**: Review weekly performance trends
4. **User Experience**: Focus on user-facing metrics first
5. **Automated Optimization**: Enable automated optimizations for production
6. **Testing**: Validate optimizations in staging before production
7. **Documentation**: Document any manual optimizations performed
8. **Privacy**: Ensure all monitoring respects user privacy

For more detailed examples and advanced usage, see the [Optimization Playbook](./optimization-playbook.md).