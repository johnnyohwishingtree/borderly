#!/usr/bin/env node

/**
 * App Store Asset Validator for Borderly
 * 
 * This script validates that all required assets are present and meet
 * App Store submission requirements before release.
 */

const fs = require('fs');
const path = require('path');

// Asset requirements
const REQUIRED_ASSETS = {
  icons: {
    ios: [
      { file: 'icon-20@2x.svg', size: '40x40' },
      { file: 'icon-20@3x.svg', size: '60x60' },
      { file: 'icon-29@2x.svg', size: '58x58' },
      { file: 'icon-29@3x.svg', size: '87x87' },
      { file: 'icon-40@2x.svg', size: '80x80' },
      { file: 'icon-40@3x.svg', size: '120x120' },
      { file: 'icon-60@2x.svg', size: '120x120' },
      { file: 'icon-60@3x.svg', size: '180x180' },
      { file: 'icon-1024.svg', size: '1024x1024' },
      { file: 'AppStore-1024x1024.svg', size: '1024x1024' }
    ],
    master: 'app-icon-1024.svg'
  },
  screenshots: {
    'iPhone-6.7': { width: 1290, height: 2796, required: true },
    'iPhone-6.5': { width: 1242, height: 2688, required: false },
    'iPhone-5.5': { width: 1242, height: 2208, required: false },
    'iPad-12.9': { width: 2048, height: 2732, required: false },
    'iPad-11': { width: 1668, height: 2388, required: false }
  },
  metadata: {
    'privacy-policy.md': 'Privacy policy document',
    'app-store-metadata.json': 'App Store submission metadata'
  }
};

const SCREENSHOT_COUNT = 5; // Required number of screenshots per device type

class AssetValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.join(__dirname, '..');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️ ',
      'success': '✅',
      'warning': '⚠️ ',
      'error': '❌'
    }[type] || '';
    
    console.log(`${prefix} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  fileExists(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  directoryExists(dirPath) {
    try {
      return fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  validateIcons() {
    this.log('Validating app icons...', 'info');
    
    // Check master icon
    const masterIconPath = path.join(this.projectRoot, 'assets', 'icons', REQUIRED_ASSETS.icons.master);
    if (!this.fileExists(masterIconPath)) {
      this.addError(`Master app icon not found: ${masterIconPath}`);
    } else {
      this.log('Master app icon found', 'success');
    }

    // Check iOS icon set
    const iosIconDir = path.join(this.projectRoot, 'assets', 'app-store', 'ios', 'icons');
    if (!this.directoryExists(iosIconDir)) {
      this.addError(`iOS icons directory not found: ${iosIconDir}`);
      return;
    }

    let iosIconsValid = true;
    for (const icon of REQUIRED_ASSETS.icons.ios) {
      const iconPath = path.join(iosIconDir, icon.file);
      if (!this.fileExists(iconPath)) {
        this.addError(`iOS icon not found: ${icon.file} (${icon.size})`);
        iosIconsValid = false;
      }
    }

    if (iosIconsValid) {
      this.log(`All ${REQUIRED_ASSETS.icons.ios.length} iOS icons found`, 'success');
    }

    // Check iOS Xcode asset catalog
    const xcodeIconDir = path.join(this.projectRoot, 'ios', 'Borderly', 'Images.xcassets', 'AppIcon.appiconset');
    const contentsJson = path.join(xcodeIconDir, 'Contents.json');
    
    if (!this.fileExists(contentsJson)) {
      this.addWarning('Xcode AppIcon Contents.json not found - icons may not display in iOS app');
    } else {
      this.log('Xcode AppIcon configuration found', 'success');
      
      // Check for PNG files in Xcode directory
      const pngFiles = fs.readdirSync(xcodeIconDir).filter(file => file.endsWith('.png')).length;
      if (pngFiles === 0) {
        this.addWarning('No PNG icons found in Xcode AppIcon set - convert SVGs to PNG for production');
      } else {
        this.log(`${pngFiles} PNG icons found in Xcode AppIcon set`, 'success');
      }
    }
  }

  validateScreenshots() {
    this.log('Validating screenshots...', 'info');
    
    const screenshotDir = path.join(this.projectRoot, 'assets', 'app-store', 'ios', 'screenshots');
    if (!this.directoryExists(screenshotDir)) {
      this.addError(`Screenshots directory not found: ${screenshotDir}`);
      return;
    }

    for (const [deviceName, config] of Object.entries(REQUIRED_ASSETS.screenshots)) {
      const deviceDir = path.join(screenshotDir, deviceName);
      
      if (!this.directoryExists(deviceDir)) {
        if (config.required) {
          this.addError(`Required screenshot directory not found: ${deviceName}`);
        } else {
          this.addWarning(`Optional screenshot directory not found: ${deviceName}`);
        }
        continue;
      }

      const screenshots = fs.readdirSync(deviceDir).filter(file => 
        file.endsWith('.svg') || file.endsWith('.png')
      );

      if (screenshots.length < SCREENSHOT_COUNT) {
        if (config.required) {
          this.addError(`Insufficient screenshots for ${deviceName}: found ${screenshots.length}, need ${SCREENSHOT_COUNT}`);
        } else {
          this.addWarning(`Insufficient screenshots for ${deviceName}: found ${screenshots.length}, recommended ${SCREENSHOT_COUNT}`);
        }
      } else {
        this.log(`Screenshots for ${deviceName}: ${screenshots.length} files found`, 'success');
      }

      // Check for PNG versions (required for submission)
      const pngScreenshots = screenshots.filter(file => file.endsWith('.png'));
      if (pngScreenshots.length === 0 && screenshots.length > 0) {
        this.addWarning(`No PNG screenshots found for ${deviceName} - convert SVG files for App Store submission`);
      }
    }
  }

  validateMetadata() {
    this.log('Validating metadata files...', 'info');
    
    for (const [filename, description] of Object.entries(REQUIRED_ASSETS.metadata)) {
      const filePath = path.join(this.projectRoot, 'docs', filename);
      
      if (!this.fileExists(filePath)) {
        this.addError(`${description} not found: ${filePath}`);
        continue;
      }

      this.log(`Found ${description}`, 'success');

      // Validate specific content requirements
      if (filename === 'privacy-policy.md') {
        this.validatePrivacyPolicy(filePath);
      } else if (filename === 'app-store-metadata.json') {
        this.validateAppStoreMetadata(filePath);
      }
    }
  }

  validatePrivacyPolicy(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for key privacy requirements
      const requirements = [
        'zero-server',
        'local-first',
        'keychain',
        'biometric',
        'encryption',
        'contact'
      ];

      const missing = requirements.filter(req => 
        !content.toLowerCase().includes(req.toLowerCase())
      );

      if (missing.length > 0) {
        this.addWarning(`Privacy policy may be missing key concepts: ${missing.join(', ')}`);
      } else {
        this.log('Privacy policy contains all key concepts', 'success');
      }

      // Check length (App Store requires substantial privacy policies)
      if (content.length < 1000) {
        this.addWarning('Privacy policy may be too short for App Store requirements');
      }
      
    } catch (error) {
      this.addError(`Error reading privacy policy: ${error.message}`);
    }
  }

  validateAppStoreMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const metadata = JSON.parse(content);
      
      // Check required fields
      const requiredFields = [
        'app.name',
        'app.bundleId',
        'appStoreInformation.description',
        'appStoreInformation.keywords',
        'appStoreInformation.supportURL',
        'appStoreInformation.privacyPolicyURL'
      ];

      for (const field of requiredFields) {
        const value = this.getNestedValue(metadata, field);
        if (!value) {
          this.addError(`Missing required metadata field: ${field}`);
        }
      }

      // Validate description length
      const description = metadata.appStoreInformation?.description;
      if (description) {
        if (description.length > 4000) {
          this.addError('App Store description exceeds 4000 character limit');
        } else if (description.length < 100) {
          this.addWarning('App Store description may be too short');
        } else {
          this.log('App Store description length is appropriate', 'success');
        }
      }

      // Validate keywords
      const keywords = metadata.appStoreInformation?.keywords;
      if (keywords) {
        const keywordCount = keywords.split(',').length;
        if (keywordCount > 100) {
          this.addError('App Store keywords exceed 100 character limit');
        } else {
          this.log(`App Store keywords: ${keywordCount} characters`, 'success');
        }
      }

    } catch (error) {
      this.addError(`Error validating App Store metadata: ${error.message}`);
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  validateLaunchScreen() {
    this.log('Validating launch screen...', 'info');
    
    const launchScreenPath = path.join(this.projectRoot, 'ios', 'Borderly', 'LaunchScreen.storyboard');
    
    if (!this.fileExists(launchScreenPath)) {
      this.addError('Launch screen storyboard not found');
      return;
    }

    try {
      const content = fs.readFileSync(launchScreenPath, 'utf8');
      
      // Check for Borderly branding
      if (content.includes('Borderly')) {
        this.log('Launch screen contains Borderly branding', 'success');
      } else {
        this.addWarning('Launch screen may not contain proper branding');
      }

      // Check for color customization
      if (content.includes('color key="backgroundColor"')) {
        this.log('Launch screen has custom background color', 'success');
      } else {
        this.addWarning('Launch screen may be using default background');
      }

    } catch (error) {
      this.addError(`Error reading launch screen: ${error.message}`);
    }
  }

  generateReport() {
    this.log('\n=== Asset Validation Report ===', 'info');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('🎉 All assets validated successfully!', 'success');
      this.log('Ready for App Store submission (after PNG conversion)', 'success');
    } else {
      if (this.errors.length > 0) {
        this.log(`\n❌ ${this.errors.length} Error(s) found:`, 'error');
        this.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }

      if (this.warnings.length > 0) {
        this.log(`\n⚠️  ${this.warnings.length} Warning(s):`, 'warning');
        this.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
      }

      if (this.errors.length > 0) {
        this.log('\n❌ Fix all errors before App Store submission', 'error');
        return false;
      } else {
        this.log('\n✅ No critical errors - review warnings before submission', 'success');
        return true;
      }
    }

    return true;
  }

  run() {
    this.log('Starting App Store asset validation...', 'info');
    
    this.validateIcons();
    this.validateScreenshots();
    this.validateMetadata();
    this.validateLaunchScreen();
    
    return this.generateReport();
  }
}

// Main execution
if (require.main === module) {
  const validator = new AssetValidator();
  const success = validator.run();
  
  if (!success) {
    process.exit(1);
  }
}

module.exports = { AssetValidator };