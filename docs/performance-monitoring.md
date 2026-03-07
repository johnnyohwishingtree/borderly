# Performance Monitoring Guide

## Overview

Borderly implements comprehensive performance monitoring to ensure optimal user experience while maintaining strict privacy compliance. The monitoring system tracks key metrics, detects regressions, and provides optimization recommendations.

## Architecture

The performance monitoring system consists of four main components:

1. **Production Profiler** (`src/services/performance/productionProfiler.ts`)
   - Real-time performance metrics collection
   - Automated regression detection
   - Health scoring and alerting

2. **User Flow Analytics** (`src/services/performance/userFlowAnalytics.ts`)
   - User journey tracking and analysis
   - Friction point identification
   - Conversion optimization

3. **Regression Detection** (`src/services/performance/regressionDetection.ts`)
   - Statistical analysis of performance trends
   - Automated alerting for degradations
   - Root cause analysis assistance

4. **Performance Optimization** (`src/utils/performanceOptimization.ts`)
   - Automated optimization recommendations
   - Performance enhancement utilities
   - Impact measurement and reporting

## Key Features

### Privacy-First Monitoring
- All data is sanitized using `piiSanitizer` utilities
- No personally identifiable information is collected
- Local-first approach with no external data transmission
- Compliance with privacy regulations and app store requirements

### Real-Time Dashboard Metrics
```typescript
const dashboardData = productionProfiler.getDashboardMetrics();
// Returns:
// - current: Live performance metrics
// - trends: Performance direction indicators
// - health: Overall system health score (0-100)
```

### User Flow Analysis
```typescript
// Start tracking a user flow
const flowId = userFlowAnalytics.startFlow('onboarding', sessionId);

// Add steps to the flow
const stepId = userFlowAnalytics.addStep(
  flowId, 
  'passport_scan', 
  'PassportScanScreen', 
  'scan_started'
);

// Complete the flow
userFlowAnalytics.completeFlow(flowId, true);

// Get analytics
const analytics = userFlowAnalytics.getFlowAnalytics('onboarding');
```

### Regression Detection
```typescript
// Configure performance thresholds
regressionDetection.setThreshold({
  metricName: 'form_generation',
  category: 'form',
  baseline: 1000, // ms
  tolerance: 25,  // 25% degradation threshold
  sensitivity: 'high',
  sampleSize: 20,
  confidenceLevel: 0.95
});

// Get active regressions
const regressions = regressionDetection.getActiveRegressions();
```

## Monitored Metrics

### Core Performance Metrics
- **App Startup Time**: Time from launch to interactive
- **Form Generation**: Time to generate country-specific forms
- **Camera Operations**: Passport scanning and QR code capture
- **Navigation**: Screen transition times
- **Memory Usage**: Memory consumption and leak detection

### User Experience Metrics
- **Flow Completion Rates**: Percentage of users completing key flows
- **Error Rates**: Frequency of errors by category
- **Drop-off Points**: Where users abandon flows
- **Retry Patterns**: User behavior on failures

### System Health Metrics
- **CPU Usage**: Processing load monitoring
- **Memory Pressure**: Available memory tracking
- **Network Performance**: Request latency and failures
- **Storage Operations**: Database query performance

## Performance Baselines

### Expected Performance Targets
```typescript
const performanceBaselines = {
  startup: {
    app_start_time: 3000, // 3 seconds
    time_to_interactive: 5000 // 5 seconds
  },
  forms: {
    generation_time: 1000, // 1 second
    auto_fill_rate: 0.85 // 85% fields auto-filled
  },
  camera: {
    mrz_scan_time: 5000, // 5 seconds
    success_rate: 0.90 // 90% success rate
  },
  navigation: {
    screen_transition: 300, // 300ms
    deep_link_resolution: 500 // 500ms
  }
};
```

### Critical Thresholds
- **Memory Usage**: Alert above 85% usage
- **App Start Time**: Critical if > 10 seconds
- **Form Generation**: Alert if > 3 seconds
- **Camera Scan**: Critical if success rate < 70%

## Optimization Strategies

### Available Optimizations
1. **Memory Caching**: Intelligent caching for schemas and forms
2. **Lazy Loading**: Component-level code splitting
3. **Camera Optimization**: ML Kit pipeline improvements
4. **Database Optimization**: Query caching and indexing

### Applying Optimizations
```typescript
// Get recommendations
const recommendations = performanceOptimizer.getRecommendations('memory', 'high');

// Apply an optimization
const result = await performanceOptimizer.applyOptimization('memory_caching');

if (result.success) {
  console.log(`Improvement: ${result.improvement.percentage}%`);
} else {
  console.log('Optimization failed:', result.issues);
}
```

## Integration Guide

### Basic Setup
```typescript
import { 
  productionProfiler,
  userFlowAnalytics,
  regressionDetection,
  performanceOptimizer
} from './services/performance';

// Enable monitoring in production
if (process.env.NODE_ENV === 'production') {
  productionProfiler.setEnabled(true);
  userFlowAnalytics.setEnabled(true);
  regressionDetection.setEnabled(true);
  performanceOptimizer.setEnabled(true);
}
```

### Measuring Operations
```typescript
import { measureAsync, measureSync } from '../utils/performanceOptimization';

// Measure async operations
const result = await measureAsync(
  () => generateForm(profile, country),
  'form_generation',
  'form'
);

// Measure sync operations
const data = measureSync(
  () => parsePassportData(mrzText),
  'mrz_parsing',
  'passport'
);
```

### Custom Metrics
```typescript
// Record custom performance metrics
productionProfiler.recordOperation(
  'passport_validation',
  'security',
  validationTime
);

// Track user interactions
userFlowAnalytics.addStep(
  flowId,
  'form_field_filled',
  'LegFormScreen',
  'field_completed',
  { fieldType: 'passport_number' }
);
```

## Monitoring Dashboard

### Health Score Components
- **Performance Score** (0-40 points): Based on key metric performance
- **Reliability Score** (0-30 points): Error rates and stability
- **User Experience Score** (0-30 points): Flow completion and satisfaction

### Alert Levels
- **Green** (90-100): Excellent performance
- **Yellow** (75-89): Good performance, minor optimizations available
- **Orange** (60-74): Fair performance, optimizations recommended
- **Red** (40-59): Poor performance, immediate action required
- **Critical** (0-39): System issues, urgent intervention needed

## Production Deployment

### Environment Configuration
```typescript
// Enable production monitoring
const config = {
  profiler: {
    enabled: true,
    interval: 60000, // 1 minute
    retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  analytics: {
    enabled: true,
    batchSize: 50,
    flushInterval: 300000 // 5 minutes
  },
  regressionDetection: {
    enabled: true,
    sensitivity: 'medium',
    alertThreshold: 25 // 25% degradation
  }
};
```

### Data Retention
- **Performance Metrics**: 7 days rolling window
- **User Flows**: 7 days for analysis
- **Regressions**: 30 days for trend analysis
- **Optimization Results**: 90 days for effectiveness tracking

## Troubleshooting

### Common Issues

#### High Memory Usage
1. Check for memory leaks in component lifecycles
2. Review caching strategies and limits
3. Monitor image and asset loading
4. Analyze object retention patterns

#### Slow Form Generation
1. Profile schema parsing performance
2. Check auto-fill logic efficiency
3. Analyze field validation overhead
4. Review template caching effectiveness

#### Camera Performance Issues
1. Check ML Kit configuration and versions
2. Profile camera initialization sequence
3. Analyze frame processing pipeline
4. Review permission handling timing

#### Navigation Slowness
1. Check for heavy component rendering
2. Analyze state management performance
3. Review navigation stack depth
4. Monitor animation performance

### Debug Mode
```typescript
// Enable debug logging
if (__DEV__) {
  productionProfiler.setDebugMode(true);
  userFlowAnalytics.setVerboseLogging(true);
}
```

## Best Practices

### Performance Monitoring
1. **Measure Early**: Implement monitoring from development phase
2. **Monitor Continuously**: Keep tracking enabled in production
3. **Act on Data**: Regularly review metrics and apply optimizations
4. **Privacy First**: Always sanitize data before collection

### Optimization Approach
1. **Baseline First**: Establish performance baselines before optimizing
2. **Measure Impact**: Always measure before and after optimizations
3. **Gradual Changes**: Apply optimizations incrementally
4. **User Impact**: Prioritize optimizations by user impact

### Alert Management
1. **Set Appropriate Thresholds**: Avoid alert fatigue with reasonable limits
2. **Categorize Severity**: Use appropriate severity levels
3. **Provide Context**: Include relevant context in alerts
4. **Track Resolution**: Monitor resolution times and effectiveness

## Related Documentation
- [Testing Strategy](./testing-strategy.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Privacy Audit](./privacy-audit-production.md)
- [Security Audit](./security-audit.md)