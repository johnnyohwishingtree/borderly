import { Image } from 'react-native';

/**
 * Asset loading with lazy initialization and caching
 */
class AssetLoader {
  private static instance: AssetLoader;
  private imageCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Lazy load and cache country flag images
   */
  async loadCountryFlag(countryCode: string): Promise<any> {
    const cacheKey = `flag-${countryCode.toLowerCase()}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.loadFlagImage(countryCode);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const image = await loadingPromise;
      this.imageCache.set(cacheKey, image);
      this.loadingPromises.delete(cacheKey);
      return image;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      console.warn(`Failed to load flag for ${countryCode}:`, error);
      return this.getDefaultFlag();
    }
  }

  private async loadFlagImage(countryCode: string): Promise<any> {
    // Lazy load flag images based on country code
    switch (countryCode.toUpperCase()) {
      case 'JPN':
        return import('../assets/flags/japan.png');
      case 'MYS':
        return import('../assets/flags/malaysia.png');
      case 'SGP':
        return import('../assets/flags/singapore.png');
      case 'THA':
        return import('../assets/flags/thailand.png');
      case 'VNM':
        return import('../assets/flags/vietnam.png');
      case 'GBR':
        return import('../assets/flags/uk.png');
      case 'USA':
        return import('../assets/flags/usa.png');
      case 'CAN':
        return import('../assets/flags/canada.png');
      default:
        return this.getDefaultFlag();
    }
  }

  private getDefaultFlag(): any {
    // Return a small placeholder flag
    return { uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAyNCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjE4IiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjEiIHk9IjEiIHdpZHRoPSIyMiIgaGVpZ2h0PSIxNiIgc3Ryb2tlPSIjRDFENUQ5IiBzdHJva2Utd2lkdGg9IjAuNSIvPgo8L3N2Zz4K' };
  }

  /**
   * Lazy load icon images with caching
   */
  async loadIcon(iconName: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<any> {
    const cacheKey = `icon-${iconName}-${size}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    try {
      // Lazy load icons based on size and name
      let iconModule;
      switch (size) {
        case 'small':
          iconModule = await import(`../assets/icons/small/${iconName}.png`);
          break;
        case 'large':
          iconModule = await import(`../assets/icons/large/${iconName}.png`);
          break;
        default:
          iconModule = await import(`../assets/icons/medium/${iconName}.png`);
      }
      
      this.imageCache.set(cacheKey, iconModule.default);
      return iconModule.default;
    } catch (error) {
      console.warn(`Failed to load icon ${iconName}:`, error);
      return null;
    }
  }

  /**
   * Preload critical assets for better perceived performance
   */
  async preloadCriticalAssets(): Promise<void> {
    const criticalFlags = ['JPN', 'MYS', 'SGP']; // MVP countries
    const criticalIcons = ['camera', 'qr-code', 'user', 'settings'];

    const flagPromises = criticalFlags.map(code => this.loadCountryFlag(code));
    const iconPromises = criticalIcons.map(icon => this.loadIcon(icon, 'medium'));

    await Promise.allSettled([...flagPromises, ...iconPromises]);
  }

  /**
   * Clear cache to free up memory
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): { entries: number; estimatedSizeBytes: number } {
    // Rough estimation - each cached image is approximately 1-5KB
    const entries = this.imageCache.size;
    const estimatedSizeBytes = entries * 3 * 1024; // 3KB average per image
    
    return { entries, estimatedSizeBytes };
  }
}

/**
 * Optimized image component that handles lazy loading and caching
 */
export function OptimizedImage({ 
  source, 
  style, 
  resizeMode = 'cover',
  placeholder,
  onLoad,
  onError,
  ...props 
}: any) {
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={onError}
      {...props}
      // Optimize for memory usage
      fadeDuration={150}
      progressiveRenderingEnabled={true}
      shouldRasterizeIOS={true}
      renderToHardwareTextureAndroid={true}
    />
  );
}

/**
 * Utility functions for asset optimization
 */
export const AssetUtils = {
  /**
   * Get optimized image dimensions based on screen density
   */
  getOptimizedDimensions(baseWidth: number, baseHeight: number): { width: number; height: number } {
    // Use lower resolution images on lower density screens
    const { PixelRatio } = require('react-native');
    const scale = Math.min(PixelRatio.get(), 2); // Cap at 2x for performance
    
    return {
      width: baseWidth * scale,
      height: baseHeight * scale,
    };
  },

  /**
   * Generate responsive image sizes for different screen densities
   */
  getResponsiveImageUri(baseUri: string, width: number, height: number): string {
    const { Dimensions, PixelRatio } = require('react-native');
    const screenWidth = Dimensions.get('window').width;
    const scale = PixelRatio.get();
    
    // Adjust image size based on screen width and pixel density
    let targetWidth = width;
    let targetHeight = height;
    
    if (screenWidth < 400) { // Small screens
      targetWidth = Math.floor(width * 0.8);
      targetHeight = Math.floor(height * 0.8);
    } else if (scale > 2) { // High density screens
      targetWidth = Math.floor(width * 1.2);
      targetHeight = Math.floor(height * 1.2);
    }
    
    // If using a CDN or image service, append size parameters
    if (baseUri.includes('cloudinary.com') || baseUri.includes('imagekit.io')) {
      return `${baseUri}?w=${targetWidth}&h=${targetHeight}&f=auto&q=auto`;
    }
    
    return baseUri;
  },

  /**
   * Estimate asset bundle size
   */
  estimateAssetBundleSize(): number {
    const estimatedSizes = {
      flags: 8 * 2 * 1024, // 8 countries × 2KB each
      icons: 10 * 3 * 1024, // 10 icons × 3KB each  
      screenshots: 0, // Guide screenshots would be loaded from remote URLs
      fonts: 0, // Using system fonts
    };
    
    return Object.values(estimatedSizes).reduce((total, size) => total + size, 0);
  },
};

// Export singleton instance
export const assetLoader = AssetLoader.getInstance();