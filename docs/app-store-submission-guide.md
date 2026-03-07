# App Store Submission Guide

This guide walks you through the complete process of submitting Borderly to both the iOS App Store and Google Play Store.

## Prerequisites

### Development Environment
- Xcode 15.0+ (iOS submission)
- Android Studio with SDK 34+ (Android submission)
- Node.js 18+ with pnpm installed
- Valid Apple Developer account ($99/year)
- Valid Google Play Developer account ($25 one-time)

### Code Signing Setup

#### iOS Code Signing
1. **Apple Developer Account Setup**
   - Log into [Apple Developer Portal](https://developer.apple.com)
   - Create App ID for `com.borderly.app`
   - Generate iOS Distribution Certificate
   - Create App Store Provisioning Profile

2. **Xcode Configuration**
   ```bash
   # Open iOS project
   open ios/Borderly.xcworkspace
   
   # In Xcode:
   # 1. Select "Borderly" project in navigator
   # 2. Go to "Signing & Capabilities" tab
   # 3. Set Team to your Apple Developer account
   # 4. Ensure Bundle Identifier is "com.borderly.app"
   # 5. Select "iOS Distribution" certificate for Release
   ```

#### Android Code Signing
1. **Generate Release Keystore**
   ```bash
   # Generate keystore (one-time setup)
   keytool -genkeypair -v -keystore borderly-release-key.keystore \
     -alias borderly-key-alias -keyalg RSA -keysize 2048 -validity 10000
   
   # Store keystore securely (DO NOT commit to git)
   mv borderly-release-key.keystore ~/.android/
   ```

2. **Environment Variables**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export BORDERLY_UPLOAD_STORE_FILE=~/.android/borderly-release-key.keystore
   export BORDERLY_UPLOAD_KEY_ALIAS=borderly-key-alias
   export BORDERLY_UPLOAD_STORE_PASSWORD=your_store_password
   export BORDERLY_UPLOAD_KEY_PASSWORD=your_key_password
   ```

## Pre-Submission Checklist

### 1. Code Quality Verification
```bash
# Ensure all tests pass
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# E2E tests
pnpm e2e

# Bundle size analysis
pnpm build:analyze
```

### 2. Version Management
Update version numbers in:
- `package.json` → version
- `ios/Borderly/Info.plist` → CFBundleShortVersionString & CFBundleVersion
- `android/app/build.gradle` → versionName & versionCode

### 3. Asset Preparation
All app store assets should be prepared in `assets/app-store/`:
- App icons (multiple sizes)
- Screenshots for all device types
- Feature graphics
- Marketing copy

## iOS App Store Submission

### Step 1: Create App Store Record
1. Log into [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill out app information:
   - **Platform**: iOS
   - **Name**: Borderly
   - **Primary Language**: English
   - **Bundle ID**: com.borderly.app
   - **SKU**: borderly-ios-app

### Step 2: App Information Setup
1. **App Information Tab**:
   - App Name: "Borderly"
   - App Subtitle: "Universal Travel Declaration"
   - Category: Travel
   - Content Rights: "Does not use third-party content"

2. **Pricing and Availability**:
   - Price: Free
   - Availability: All countries
   - App Store Distribution: Yes

### Step 3: App Review Information
```text
Demo Account: Not required (no server authentication)

Review Notes:
This app helps travelers fill out customs and immigration forms for Japan, Malaysia, and Singapore. Key features to test:

1. Passport scanning: Use the camera to scan passport MRZ (Machine Readable Zone)
2. Form generation: Create a trip and see auto-filled forms
3. QR wallet: Store submission QR codes offline
4. Privacy: All data stays on device (no network calls except to government portals)

The app requires camera permission for passport scanning and biometric permission for data security. No personal data is transmitted to our servers.

Contact: support@borderly.app
```

### Step 4: Build Archive and Upload
```bash
# Clean and build for release
cd ios
rm -rf build/
xcodebuild clean -workspace Borderly.xcworkspace -scheme Borderly

# Create archive
xcodebuild archive \
  -workspace Borderly.xcworkspace \
  -scheme Borderly \
  -configuration Release \
  -archivePath build/Borderly.xcarchive

# Upload to App Store Connect (or use Xcode Organizer)
xcodebuild -exportArchive \
  -archivePath build/Borderly.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ExportOptions.plist
```

### Step 5: App Store Metadata
Upload all assets and complete store listing:
- App icon (1024×1024)
- iPhone screenshots (6.7", 6.5", 5.5")
- iPad screenshots (12.9", 11")
- App description (see `app-store-submission-checklist.md`)
- Keywords: travel, passport, customs, immigration, japan, malaysia, singapore
- Support URL: https://borderly.app/support
- Marketing URL: https://borderly.app

### Step 6: Submit for Review
1. Select the build uploaded in Step 4
2. Complete Export Compliance: "No" (uses only standard encryption)
3. Complete Advertising Identifier: "No" (no ads or tracking)
4. Submit for Review

## Google Play Store Submission

### Step 1: Google Play Console Setup
1. Log into [Google Play Console](https://play.google.com/console)
2. Create new app:
   - **App name**: Borderly
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

### Step 2: App Content Setup
Complete all required sections:

1. **App access**:
   - All functionality available without restrictions
   - No special access needed

2. **Ads**:
   - No, my app does not contain ads

3. **Content rating**:
   - Target age: General audiences
   - Content rating: Everyone

4. **Target audience**:
   - Age groups: 13+ (travel app appropriate for teens/adults)

5. **Data safety**:
   - Data collection: None
   - Data sharing: None
   - Security practices: Data encrypted in transit and at rest

### Step 3: Build Release Bundle
```bash
# Navigate to Android project
cd android

# Clean previous builds
./gradlew clean

# Build release bundle
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

### Step 4: Upload Release Bundle
1. In Google Play Console, go to "Production" → "Create new release"
2. Upload `app/build/outputs/bundle/release/app-release.aab`
3. Complete release notes (see `release-notes.md`)
4. Save as draft

### Step 5: Store Listing
Complete store listing with prepared assets:
- App icon (512×512)
- Feature graphic (1024×500)
- Phone screenshots (minimum 2, maximum 8)
- Tablet screenshots (if supporting tablets)
- Short description: "Fill passport info once, travel everywhere"
- Full description (see marketing copy in `app-store-submission-checklist.md`)

### Step 6: Review and Publish
1. Complete all policy requirements
2. Review content rating questionnaire
3. Set up Play App Signing (recommended)
4. Submit for review

## Post-Submission Monitoring

### Week 1 Checklist
- [ ] Monitor crash reports (Xcode Organizer & Play Console)
- [ ] Track download/install metrics
- [ ] Respond to user reviews within 24 hours
- [ ] Verify all government portal links still work
- [ ] Check app performance metrics

### Ongoing Maintenance
- Monthly schema validation for Japan/Malaysia/Singapore forms
- Quarterly dependency security updates
- Annual compliance review for store policy changes
- User feedback integration into roadmap planning

## Common Issues & Solutions

### iOS Review Rejections
1. **Guideline 2.1 - Performance**: App crashes
   - Solution: Run stress tests, fix memory leaks
   
2. **Guideline 5.1.1 - Data Collection**: Privacy policy missing
   - Solution: Ensure privacy policy URL is accessible
   
3. **Guideline 4.3 - Design**: App too simple
   - Solution: Highlight unique passport scanning feature

### Android Review Rejections
1. **Privacy Policy**: Missing or inaccessible
   - Solution: Update store listing with valid privacy policy URL

2. **Permissions**: Unclear camera usage
   - Solution: Update permission descriptions in AndroidManifest.xml

3. **Target API**: Using outdated target SDK
   - Solution: Update targetSdkVersion to latest stable

## Emergency Response Plan

### Critical Bug Discovered Post-Launch
1. **Immediate**: Use store emergency halt features
2. **Communication**: Update store descriptions with known issues
3. **Fix**: Create hotfix branch with minimal changes
4. **Expedited Review**: Use Apple's expedited review for critical fixes

### Government Portal Changes
1. **Detection**: Monitor schema validation tests
2. **Update**: Modify country schemas in emergency update
3. **Testing**: Validate against real government portals
4. **Release**: Push hotfix with updated schemas

## Contact & Support

- **Developer Support**: support@borderly.app
- **App Store Issues**: appstore@borderly.app
- **Emergency Contact**: +1 (555) 123-4567

For technical implementation details, see `release-process.md` and `app-store-submission-checklist.md`.