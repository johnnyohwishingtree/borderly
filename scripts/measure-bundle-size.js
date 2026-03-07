#!/usr/bin/env node

/**
 * Bundle Size Measurement Script
 * 
 * This script measures the size of the React Native bundle and assets
 * to track bundle size over time and ensure we stay under thresholds.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFileSizeInBytes(filepath) {
  if (!fs.existsSync(filepath)) {
    return 0;
  }
  const stats = fs.statSync(filepath);
  return stats.size;
}

function getFolderSizeInBytes(folderPath) {
  if (!fs.existsSync(folderPath)) {
    return 0;
  }
  
  let totalSize = 0;
  
  function calculateSize(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }
  
  calculateSize(folderPath);
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function measureBundleSize(platform = 'ios') {
  console.log(`📊 Measuring bundle size for ${platform}...`);
  
  const bundleDir = path.join(__dirname, '../bundle-temp');
  const bundlePath = path.join(bundleDir, `index.${platform}.bundle`);
  const assetsDir = path.join(bundleDir, 'assets');
  
  try {
    // Clean up previous bundle
    if (fs.existsSync(bundleDir)) {
      execSync(`rm -rf ${bundleDir}`);
    }
    fs.mkdirSync(bundleDir, { recursive: true });
    
    // Generate bundle
    console.log('🔨 Generating production bundle...');
    execSync(
      `npx react-native bundle ` +
      `--platform ${platform} ` +
      `--dev false ` +
      `--entry-file index.js ` +
      `--bundle-output ${bundlePath} ` +
      `--assets-dest ${bundleDir}`,
      { stdio: 'pipe' }
    );
    
    // Measure sizes
    const bundleSize = getFileSizeInBytes(bundlePath);
    const assetsSize = getFolderSizeInBytes(assetsDir);
    const schemasSize = getFolderSizeInBytes(path.join(__dirname, '../src/schemas'));
    
    const totalSize = bundleSize + assetsSize + schemasSize;
    
    // Calculate metrics
    const metrics = {
      platform,
      timestamp: new Date().toISOString(),
      bundleSize: {
        bytes: bundleSize,
        formatted: formatBytes(bundleSize)
      },
      assetsSize: {
        bytes: assetsSize,
        formatted: formatBytes(assetsSize)
      },
      schemasSize: {
        bytes: schemasSize,
        formatted: formatBytes(schemasSize)
      },
      totalSize: {
        bytes: totalSize,
        formatted: formatBytes(totalSize)
      }
    };
    
    // Display results
    console.log('\\n📈 Bundle Size Report:');
    console.log('------------------------');
    console.log(`Platform: ${metrics.platform}`);
    console.log(`Bundle: ${metrics.bundleSize.formatted}`);
    console.log(`Assets: ${metrics.assetsSize.formatted}`);
    console.log(`Schemas: ${metrics.schemasSize.formatted}`);
    console.log(`Total: ${metrics.totalSize.formatted}`);
    console.log('------------------------');
    
    // Check thresholds
    const thresholdMB = 50;
    const totalMB = totalSize / (1024 * 1024);
    
    if (totalMB > thresholdMB) {
      console.log(`\\n⚠️  WARNING: Bundle size (${totalMB.toFixed(2)}MB) exceeds threshold (${thresholdMB}MB)`);
      console.log('\\n💡 Recommendations:');
      
      if (bundleSize / totalSize > 0.7) {
        console.log('  • Bundle is largest component - consider code splitting');
      }
      if (assetsSize / totalSize > 0.3) {
        console.log('  • Assets are large - optimize images and use WebP format');
      }
      if (schemasSize / totalSize > 0.2) {
        console.log('  • Schemas are large - implement more aggressive lazy loading');
      }
      
      process.exit(1);
    } else {
      console.log(`\\n✅ Bundle size (${totalMB.toFixed(2)}MB) is within threshold (${thresholdMB}MB)`);
    }
    
    // Save metrics to file
    const metricsPath = path.join(__dirname, '../bundle-metrics.json');
    let allMetrics = [];
    
    if (fs.existsSync(metricsPath)) {
      allMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    }
    
    allMetrics.push(metrics);
    
    // Keep only last 50 measurements
    if (allMetrics.length > 50) {
      allMetrics = allMetrics.slice(-50);
    }
    
    fs.writeFileSync(metricsPath, JSON.stringify(allMetrics, null, 2));
    console.log(`\\n💾 Metrics saved to ${metricsPath}`);
    
    // Clean up
    execSync(`rm -rf ${bundleDir}`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Error measuring bundle size:', error.message);
    process.exit(1);
  }
}

function compareBundleSizes() {
  const metricsPath = path.join(__dirname, '../bundle-metrics.json');
  
  if (!fs.existsSync(metricsPath)) {
    console.log('No historical metrics found');
    return;
  }
  
  const allMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  
  if (allMetrics.length < 2) {
    console.log('Not enough historical data for comparison');
    return;
  }
  
  const latest = allMetrics[allMetrics.length - 1];
  const previous = allMetrics[allMetrics.length - 2];
  
  const sizeDiff = latest.totalSize.bytes - previous.totalSize.bytes;
  const percentChange = ((sizeDiff / previous.totalSize.bytes) * 100).toFixed(2);
  
  console.log('\\n📊 Bundle Size Comparison:');
  console.log('---------------------------');
  console.log(`Previous: ${previous.totalSize.formatted}`);
  console.log(`Current:  ${latest.totalSize.formatted}`);
  console.log(`Change:   ${formatBytes(Math.abs(sizeDiff))} (${percentChange}%)`);
  
  if (sizeDiff > 0) {
    console.log(`📈 Bundle size increased`);
  } else if (sizeDiff < 0) {
    console.log(`📉 Bundle size decreased`);
  } else {
    console.log(`➖ No change in bundle size`);
  }
}

// CLI interface
const platform = process.argv[2] || 'ios';
const command = process.argv[3];

if (command === 'compare') {
  compareBundleSizes();
} else {
  measureBundleSize(platform);
  if (fs.existsSync(path.join(__dirname, '../bundle-metrics.json'))) {
    compareBundleSizes();
  }
}