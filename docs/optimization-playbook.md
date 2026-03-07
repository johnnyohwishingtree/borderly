# Performance Optimization Playbook

## Overview

This playbook provides actionable optimization strategies for Borderly based on real production data and performance monitoring insights. It covers common performance issues, systematic optimization approaches, and proven solutions.

## Quick Reference

### Performance Targets
| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| App Start Time | < 3s | < 5s | > 10s |
| Form Generation | < 1s | < 2s | > 3s |
| Passport Scanning | < 5s | < 8s | > 15s |
| Screen Transitions | < 300ms | < 500ms | > 1s |
| Memory Usage | < 70% | < 85% | > 95% |

### Optimization Priority Matrix
```
Critical (Fix Immediately):
- App crashes or freezes
- Memory leaks causing device slowdown
- Core feature failures (passport scan, form generation)

High (Fix This Sprint):
- Startup time > 5 seconds
- Form generation > 2 seconds
- Navigation lag > 500ms

Medium (Plan for Next Sprint):
- Memory usage > 80%
- Camera operations > 8 seconds
- Non-critical feature slowness

Low (Optimize When Possible):
- Minor animation stutters
- Background processing delays
- Edge case performance issues
```

## Systematic Optimization Approach

### Phase 1: Measurement and Baseline
1. **Enable Comprehensive Monitoring**
   ```typescript
   import { productionProfiler, userFlowAnalytics } from './services/performance';
   
   // Production environment
   productionProfiler.setEnabled(true);
   userFlowAnalytics.setEnabled(true);
   ```

2. **Establish Baselines**
   ```typescript
   // Run baseline measurements for 1 week
   const baselineReport = productionProfiler.generatePerformanceReport();
   console.log('Baseline metrics:', baselineReport.keyMetrics);
   ```

3. **Identify Top Issues**
   ```typescript
   const criticalIssues = userFlowAnalytics.identifyCriticalIssues();
   const regressions = regressionDetection.getActiveRegressions();
   ```

### Phase 2: Quick Wins
Focus on low-effort, high-impact optimizations first.

#### Image and Asset Optimization
```typescript
// Optimize image loading
const optimizedImages = {
  // Use WebP format for better compression
  passportGuide: require('./assets/guide/passport-guide.webp'),
  
  // Implement lazy loading for non-critical images
  countryFlags: () => import('./assets/flags'),
  
  // Preload critical images
  appIcon: require('./assets/app-icon.png'),
};
```

#### Bundle Size Reduction
```bash
# Analyze bundle composition
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js --assets-dest /tmp/assets
npx @react-native-community/cli bundle-analyzer

# Enable Hermes engine for better performance
# ios/Podfile
use_react_native!(
  :path => "../node_modules/react-native",
  :hermes_enabled => true
)
```

### Phase 3: Component-Level Optimizations

#### React Performance Patterns
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison logic
  return prevProps.data.id === nextProps.data.id;
});

// Optimize re-renders with useMemo and useCallback
const FormField = ({ field, onChange }) => {
  const validationRules = useMemo(() => 
    compileValidationRules(field.validation), [field.validation]
  );
  
  const handleChange = useCallback((value) => {
    onChange(field.id, value);
  }, [field.id, onChange]);
  
  return <Input rules={validationRules} onChange={handleChange} />;
};
```

#### Navigation Optimization
```typescript
// Lazy load screens for faster startup
const LazyTripScreen = React.lazy(() => import('./screens/trips/TripDetailScreen'));
const LazyWalletScreen = React.lazy(() => import('./screens/wallet/QRWalletScreen'));

// Use navigation focus events to defer heavy operations
const TripDetailScreen = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      // Defer heavy operations until screen is focused
      const timer = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(timer);
    }, [])
  );
  
  if (!isLoaded) return <LoadingSpinner />;
  return <TripDetails />;
};
```

### Phase 4: Service and Storage Optimization

#### Database Performance
```typescript
// Implement query caching
class OptimizedTripService {
  private queryCache = new Map();
  
  async getTrips(filters) {
    const cacheKey = JSON.stringify(filters);
    
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey);
    }
    
    const trips = await database.collections
      .get('trips')
      .query(Q.where('status', filters.status))
      .fetch();
    
    this.queryCache.set(cacheKey, trips);
    return trips;
  }
}

// Add database indexes for common queries
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});
```

#### Memory Management
```typescript
// Implement automatic cleanup
class MemoryOptimizedCache {
  private cache = new Map();
  private maxSize = 100;
  private accessOrder = [];
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, value);
    this.accessOrder.push(key);
  }
  
  get(key) {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const index = this.accessOrder.indexOf(key);
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
      return this.cache.get(key);
    }
    return undefined;
  }
}
```

### Phase 5: Platform-Specific Optimizations

#### iOS Optimizations
```swift
// Enable memory pressure handling
// ios/Borderly/AppDelegate.mm
- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application {
  // Clear caches
  [[NSNotificationCenter defaultCenter] 
   postNotificationName:@"MemoryWarning" object:nil];
}
```

```typescript
// React Native side
import { DeviceEventEmitter } from 'react-native';

DeviceEventEmitter.addListener('MemoryWarning', () => {
  // Clear non-critical caches
  imageCache.clear();
  temporaryDataCache.clear();
});
```

#### Android Optimizations
```kotlin
// android/app/src/main/java/com/borderly/MainActivity.kt
override fun onTrimMemory(level: Int) {
  super.onTrimMemory(level)
  
  when (level) {
    TRIM_MEMORY_RUNNING_MODERATE,
    TRIM_MEMORY_RUNNING_LOW -> {
      // Clear non-essential caches
      sendEvent("MemoryTrimRequest", level)
    }
  }
}
```

## Specific Optimization Strategies

### 1. App Startup Optimization

#### Problem: Slow app launch
**Target**: < 3 seconds to interactive

```typescript
// Split initialization into phases
class AppInitializer {
  async initializeApp() {
    // Phase 1: Critical (blocking)
    await this.initializeNavigation();
    await this.initializeStorage();
    
    // Phase 2: Important (background)
    this.initializeAnalytics();
    this.initializeCrashReporting();
    
    // Phase 3: Nice-to-have (deferred)
    setTimeout(() => {
      this.initializeFeatureFlags();
      this.preloadAssets();
    }, 1000);
  }
}

// Lazy load heavy dependencies
const getMLKit = () => import('@react-native-ml-kit/text-recognition');
const getCameraModule = () => import('react-native-camera');
```

### 2. Form Generation Optimization

#### Problem: Slow form creation
**Target**: < 1 second generation time

```typescript
// Cache parsed schemas
class OptimizedFormEngine {
  private static schemaCache = new Map();
  
  static async getSchema(countryCode) {
    if (this.schemaCache.has(countryCode)) {
      return this.schemaCache.get(countryCode);
    }
    
    const schema = await import(`../schemas/${countryCode}.json`);
    const parsed = this.parseSchema(schema);
    
    this.schemaCache.set(countryCode, parsed);
    return parsed;
  }
  
  // Pre-compile field mappers
  static precompileMappers(schema) {
    return schema.fields.map(field => ({
      ...field,
      mapper: new Function('profile', `return ${field.autoFillSource}`)
    }));
  }
}
```

### 3. Camera Performance Optimization

#### Problem: Slow passport scanning
**Target**: < 5 seconds average scan time

```typescript
// Optimize ML Kit configuration
const cameraConfig = {
  // Reduce frame processing rate
  frameProcessingRate: 5, // Process every 5th frame
  
  // Optimize text recognition
  textRecognition: {
    languageHints: ['en'], // Limit to English for passports
    regionOfInterest: { 
      x: 0.1, y: 0.7, width: 0.8, height: 0.2 // Focus on MRZ area
    }
  },
  
  // Enable GPU acceleration
  useGPU: true,
  
  // Optimize camera settings
  camera: {
    flashMode: 'auto',
    focusMode: 'auto',
    whiteBalance: 'auto',
    
    // Optimize for text recognition
    scene: 'document'
  }
};

// Implement smart retry logic
class SmartScanner {
  private consecutiveFailures = 0;
  
  async processFrame(frame) {
    try {
      const result = await this.recognizeText(frame);
      
      if (this.isValidMRZ(result)) {
        this.consecutiveFailures = 0;
        return result;
      }
      
      this.consecutiveFailures++;
      
      // Adjust settings based on failure count
      if (this.consecutiveFailures > 5) {
        this.suggestUserGuidance();
      }
      
    } catch (error) {
      this.consecutiveFailures++;
      throw error;
    }
  }
}
```

### 4. Memory Optimization

#### Problem: High memory usage
**Target**: < 70% memory utilization

```typescript
// Implement memory monitoring
class MemoryManager {
  private cleanupTasks = [];
  
  registerCleanupTask(task) {
    this.cleanupTasks.push(task);
  }
  
  async performCleanup() {
    // Clear image caches
    await ImageCache.clear();
    
    // Clean up unused components
    ComponentRegistry.cleanupUnused();
    
    // Run custom cleanup tasks
    for (const task of this.cleanupTasks) {
      await task();
    }
  }
  
  // Automatic cleanup on memory pressure
  startMemoryMonitoring() {
    DeviceEventEmitter.addListener('MemoryWarning', () => {
      this.performCleanup();
    });
  }
}
```

### 5. Network Optimization

#### Problem: Slow government portal interactions
**Target**: < 2 seconds for portal navigation

```typescript
// Implement smart prefetching
class PortalOptimizer {
  async optimizePortalInteraction(country) {
    // Prefetch portal assets
    await this.prefetchPortalAssets(country);
    
    // Prepare user data
    const userData = await this.prepareUserData();
    
    // Pre-validate internet connection
    await this.validateConnection();
    
    return {
      portalUrl: this.getOptimizedPortalUrl(country),
      prefillData: userData,
      connectionQuality: this.getConnectionQuality()
    };
  }
  
  private async prefetchPortalAssets(country) {
    const portalConfig = await import(`../portal-configs/${country}.json`);
    
    // Prefetch CSS and JS
    const promises = portalConfig.assets.map(asset => 
      fetch(asset.url).then(r => r.text())
    );
    
    await Promise.allSettled(promises);
  }
}
```

## Monitoring and Verification

### Automated Performance Testing
```typescript
// Add to test suite
describe('Performance Regression Tests', () => {
  it('should start app within 3 seconds', async () => {
    const startTime = Date.now();
    await launchApp();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(3000);
  });
  
  it('should generate forms within 1 second', async () => {
    const profile = await createTestProfile();
    
    const startTime = Date.now();
    const form = await generateForm(profile, 'JPN');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000);
    expect(form.fields).toBeDefined();
  });
});
```

### Production Monitoring
```typescript
// Set up continuous monitoring
const setupProductionMonitoring = () => {
  // Monitor key user flows
  userFlowAnalytics.startFlow('app_launch', generateSessionId());
  
  // Track performance regressions
  regressionDetection.setThreshold({
    metricName: 'app_start_time',
    category: 'startup',
    baseline: 3000,
    tolerance: 25,
    sensitivity: 'high'
  });
  
  // Generate weekly reports
  setInterval(() => {
    const report = productionProfiler.generatePerformanceReport();
    logPerformanceReport(report);
  }, 7 * 24 * 60 * 60 * 1000); // Weekly
};
```

## Troubleshooting Guide

### Common Performance Issues

#### Issue: App Startup Slow
**Symptoms**: Launch time > 5 seconds
**Root Causes**:
- Heavy synchronous operations in App.tsx
- Large bundle size
- Unnecessary imports
- Storage initialization blocking

**Solutions**:
1. Profile app initialization with Flipper
2. Move heavy operations to background
3. Implement code splitting
4. Defer non-critical initializations

#### Issue: Form Generation Slow
**Symptoms**: Form creation > 2 seconds
**Root Causes**:
- Schema parsing overhead
- Complex field mapping logic
- Inefficient auto-fill algorithms
- Synchronous validation

**Solutions**:
1. Cache parsed schemas
2. Pre-compile field mappers
3. Optimize auto-fill logic
4. Use asynchronous validation

#### Issue: Camera Performance Poor
**Symptoms**: Scan time > 8 seconds, low success rate
**Root Causes**:
- Inefficient ML Kit configuration
- High frame processing rate
- Poor lighting compensation
- Lack of user guidance

**Solutions**:
1. Optimize ML Kit settings
2. Implement frame throttling
3. Add lighting detection
4. Provide user guidance

#### Issue: Memory Usage High
**Symptoms**: Memory usage > 85%
**Root Causes**:
- Memory leaks in components
- Large image caches
- Retained references
- Inefficient state management

**Solutions**:
1. Audit component lifecycles
2. Implement cache size limits
3. Use WeakMap/WeakSet for references
4. Optimize state structure

## Implementation Checklist

### Pre-Optimization
- [ ] Enable performance monitoring
- [ ] Establish baseline measurements
- [ ] Identify top performance issues
- [ ] Prioritize optimizations by impact

### During Optimization
- [ ] Measure before and after each change
- [ ] Test on multiple devices
- [ ] Verify no regressions introduced
- [ ] Document optimization decisions

### Post-Optimization
- [ ] Deploy with monitoring enabled
- [ ] Track performance improvements
- [ ] Monitor for unexpected issues
- [ ] Plan next optimization cycle

### Quality Gates
- [ ] All performance tests pass
- [ ] No critical regressions detected
- [ ] Memory usage within acceptable limits
- [ ] User experience improvements verified

## Advanced Optimization Techniques

### Code Splitting and Dynamic Imports
```typescript
// Split by feature
const TripFeature = React.lazy(() => 
  import('./features/trips').then(module => ({
    default: module.TripFeature
  }))
);

// Split by route
const routes = [
  {
    path: '/trips',
    component: React.lazy(() => import('./screens/trips'))
  },
  {
    path: '/wallet',
    component: React.lazy(() => import('./screens/wallet'))
  }
];
```

### Service Workers for Caching (React Native Web)
```typescript
// Cache API responses
const cacheStrategy = {
  schemas: 'cache-first',
  assets: 'cache-first',
  api: 'network-first'
};

// Implement background sync
const backgroundSync = new BackgroundSync('performance-queue');
```

### Memory Pooling for Heavy Operations
```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  
  constructor(factory: () => T, initialSize = 5) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire(): T {
    return this.pool.pop() || this.factory();
  }
  
  release(obj: T): void {
    if (this.pool.length < 10) { // Max pool size
      this.pool.push(obj);
    }
  }
}
```

## Related Documentation
- [Performance Monitoring Guide](./performance-monitoring.md)
- [Testing Strategy](./testing-strategy.md)
- [Monitoring Setup](./monitoring-setup.md)
- [Security Audit](./security-audit.md)