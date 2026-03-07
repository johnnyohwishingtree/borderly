import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

const bundleMetrics = new MMKV({
  id: 'bundle-metrics',
  encryptionKey: 'bundle-size-monitoring',
});

export interface BundleMetrics {
  bundleSizeBytes: number;
  schemasSizeBytes: number;
  assetsSizeBytes: number;
  timestamp: number;
  platform: string;
  version: string;
}

export interface LoadingMetrics {
  screenName: string;
  loadTimeMs: number;
  timestamp: number;
  wasLazyLoaded: boolean;
}

export interface SchemaLoadingMetrics {
  countryCode: string;
  loadTimeMs: number;
  sizeBytes: number;
  timestamp: number;
  wasFromCache: boolean;
}

/**
 * Records bundle size metrics for monitoring
 */
export function recordBundleMetrics(metrics: Omit<BundleMetrics, 'timestamp' | 'platform'>): void {
  const bundleMetric: BundleMetrics = {
    ...metrics,
    timestamp: Date.now(),
    platform: Platform.OS,
  };
  
  bundleMetrics.set('current', JSON.stringify(bundleMetric));
  
  // Keep history for trend analysis (last 50 measurements)
  const historyKey = 'history';
  const existingHistory = bundleMetrics.getString(historyKey);
  const history: BundleMetrics[] = existingHistory ? JSON.parse(existingHistory) : [];
  
  history.push(bundleMetric);
  
  // Keep only last 50 entries
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }
  
  bundleMetrics.set(historyKey, JSON.stringify(history));
}

/**
 * Records screen loading performance metrics
 */
export function recordScreenLoadMetrics(metrics: LoadingMetrics): void {
  const key = `screen-${metrics.screenName}`;
  const existing = bundleMetrics.getString(key);
  const history: LoadingMetrics[] = existing ? JSON.parse(existing) : [];
  
  history.push(metrics);
  
  // Keep only last 20 entries per screen
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
  
  bundleMetrics.set(key, JSON.stringify(history));
}

/**
 * Records schema loading performance metrics
 */
export function recordSchemaLoadMetrics(metrics: SchemaLoadingMetrics): void {
  const key = `schema-${metrics.countryCode}`;
  const existing = bundleMetrics.getString(key);
  const history: SchemaLoadingMetrics[] = existing ? JSON.parse(existing) : [];
  
  history.push(metrics);
  
  // Keep only last 10 entries per schema
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
  
  bundleMetrics.set(key, JSON.stringify(history));
}

/**
 * Gets current bundle metrics
 */
export function getCurrentBundleMetrics(): BundleMetrics | null {
  const current = bundleMetrics.getString('current');
  return current ? JSON.parse(current) : null;
}

/**
 * Gets bundle size history for trend analysis
 */
export function getBundleSizeHistory(): BundleMetrics[] {
  const history = bundleMetrics.getString('history');
  return history ? JSON.parse(history) : [];
}

/**
 * Gets average loading time for a specific screen
 */
export function getScreenLoadingStats(screenName: string): {
  averageLoadTimeMs: number;
  lazyLoadedCount: number;
  totalLoads: number;
} {
  const key = `screen-${screenName}`;
  const history = bundleMetrics.getString(key);
  const loads: LoadingMetrics[] = history ? JSON.parse(history) : [];
  
  if (loads.length === 0) {
    return { averageLoadTimeMs: 0, lazyLoadedCount: 0, totalLoads: 0 };
  }
  
  const totalTime = loads.reduce((sum, load) => sum + load.loadTimeMs, 0);
  const lazyLoadedCount = loads.filter(load => load.wasLazyLoaded).length;
  
  return {
    averageLoadTimeMs: totalTime / loads.length,
    lazyLoadedCount,
    totalLoads: loads.length,
  };
}

/**
 * Gets schema loading performance statistics
 */
export function getSchemaLoadingStats(countryCode: string): {
  averageLoadTimeMs: number;
  cacheHitRate: number;
  totalLoads: number;
  averageSizeBytes: number;
} {
  const key = `schema-${countryCode}`;
  const history = bundleMetrics.getString(key);
  const loads: SchemaLoadingMetrics[] = history ? JSON.parse(history) : [];
  
  if (loads.length === 0) {
    return { averageLoadTimeMs: 0, cacheHitRate: 0, totalLoads: 0, averageSizeBytes: 0 };
  }
  
  const totalTime = loads.reduce((sum, load) => sum + load.loadTimeMs, 0);
  const totalSize = loads.reduce((sum, load) => sum + load.sizeBytes, 0);
  const cacheHits = loads.filter(load => load.wasFromCache).length;
  
  return {
    averageLoadTimeMs: totalTime / loads.length,
    cacheHitRate: cacheHits / loads.length,
    totalLoads: loads.length,
    averageSizeBytes: totalSize / loads.length,
  };
}

/**
 * Checks if bundle size is above threshold and should trigger alerts
 */
export function checkBundleSizeThresholds(): {
  isOverThreshold: boolean;
  currentSizeMB: number;
  thresholdMB: number;
  recommendations: string[];
} {
  const current = getCurrentBundleMetrics();
  const thresholdMB = 50; // 50MB threshold for mobile apps
  
  if (!current) {
    return {
      isOverThreshold: false,
      currentSizeMB: 0,
      thresholdMB,
      recommendations: ['No bundle metrics available'],
    };
  }
  
  const currentSizeMB = current.bundleSizeBytes / (1024 * 1024);
  const isOverThreshold = currentSizeMB > thresholdMB;
  
  const recommendations: string[] = [];
  
  if (isOverThreshold) {
    recommendations.push('Bundle size exceeds recommended threshold');
    
    // Analyze what's contributing to the size
    const schemaSizeMB = current.schemasSizeBytes / (1024 * 1024);
    const assetsSizeMB = current.assetsSizeBytes / (1024 * 1024);
    
    if (schemaSizeMB > 5) {
      recommendations.push('Consider implementing more aggressive schema lazy loading');
    }
    
    if (assetsSizeMB > 10) {
      recommendations.push('Optimize asset sizes and consider using WebP format');
    }
    
    recommendations.push('Enable Hermes engine for better performance');
    recommendations.push('Consider using bundle splitting for large features');
  }
  
  return {
    isOverThreshold,
    currentSizeMB,
    thresholdMB,
    recommendations,
  };
}

/**
 * Gets all performance metrics for debugging
 */
export function getAllPerformanceMetrics(): {
  bundle: BundleMetrics | null;
  bundleHistory: BundleMetrics[];
  thresholdCheck: ReturnType<typeof checkBundleSizeThresholds>;
} {
  return {
    bundle: getCurrentBundleMetrics(),
    bundleHistory: getBundleSizeHistory(),
    thresholdCheck: checkBundleSizeThresholds(),
  };
}

/**
 * Clears all bundle metrics (useful for testing)
 */
export function clearBundleMetrics(): void {
  bundleMetrics.clearAll();
}