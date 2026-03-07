# App Store Submission Checklist

## Pre-Submission Requirements

### 📱 App Configuration

- [ ] **App Icon** - All required sizes (20x20 to 1024x1024)
- [ ] **Launch Screen** - iOS storyboard and Android drawable
- [ ] **App Name** - Consistent across all platforms and store listings
- [ ] **Bundle Identifier** - Matches Apple Developer account
- [ ] **Version Numbers** - Semantic versioning (iOS: CFBundleShortVersionString, Android: versionName)
- [ ] **Build Numbers** - Incremental (iOS: CFBundleVersion, Android: versionCode)
- [ ] **Supported Devices** - iPhone/iPad compatibility defined
- [ ] **Deployment Targets** - iOS 15.0+, Android API 24+ (7.0)

### 🔒 Privacy & Security Compliance

- [ ] **Privacy Policy** - Accessible URL in app and store listing
- [ ] **Data Collection Disclosure** - None for this app (local-first)
- [ ] **Permissions Justification** - Camera (passport scanning), Biometric (security)
- [ ] **Export Compliance** - No encryption beyond standard iOS/Android APIs
- [ ] **Age Rating** - 4+ (no sensitive content)
- [ ] **Third-Party Libraries** - All OSS licenses documented

### 📋 App Store Connect Configuration

#### iOS App Store

- [ ] **App Information**
  - [ ] App name: "Borderly"
  - [ ] App subtitle: "Universal Travel Declaration"
  - [ ] Category: Travel
  - [ ] Content Rights: Contains only original content
  
- [ ] **Version Information**
  - [ ] Version number matches bundle
  - [ ] What's New text (see release-notes.md)
  - [ ] Copyright: 2026 Borderly Inc.
  
- [ ] **App Review Information**
  - [ ] Demo account: Not needed (no server login)
  - [ ] Review notes: Explain passport scanning feature
  - [ ] Contact information: Support email
  
- [ ] **General App Information**
  - [ ] App icon (1024x1024)
  - [ ] Rating: 4+ (no sensitive content)
  - [ ] App description (see marketing copy below)
  - [ ] Keywords: travel,passport,customs,immigration,japan,malaysia,singapore
  - [ ] Support URL
  - [ ] Marketing URL (optional)

#### Google Play Store

- [ ] **App Details**
  - [ ] App name: "Borderly"
  - [ ] Short description: "Fill passport info once, travel everywhere"
  - [ ] Full description (see marketing copy below)
  - [ ] Category: Travel & Local
  
- [ ] **Store Listing**
  - [ ] App icon (512x512)
  - [ ] Feature graphic (1024x500)
  - [ ] Screenshots (min 2, recommended 8)
  - [ ] Developer name: Borderly Inc.
  - [ ] Contact details: Support email
  - [ ] Privacy policy URL

### 📸 App Store Assets

#### Screenshots Required

**iPhone (6.7" Display)**
- [ ] Trip Overview (showing Japan → Malaysia → Singapore)
- [ ] Form Preview (auto-filled passport data)
- [ ] QR Code Wallet
- [ ] Passport Scanning
- [ ] Settings/Profile

**iPad (12.9" Display)** 
- [ ] Same 5 screenshots adapted for tablet layout

**Android Phone**
- [ ] Same 5 screenshots (1080x1920 or higher)

#### Marketing Copy

**App Description (iOS/Android)**
```
Borderly makes international travel declarations effortless.

Scan your passport once, then auto-generate customs and immigration forms for Japan, Malaysia, and Singapore. No more re-entering the same information on confusing government websites.

KEY FEATURES:
• Passport OCR scanning with camera
• Auto-fill forms for 3 countries (more coming soon)
• Offline QR code wallet
• Step-by-step submission guides
• 100% local storage - your data never leaves your phone

SUPPORTED COUNTRIES:
• Japan (Visit Japan Web)
• Malaysia (Malaysia Digital Arrival Card)  
• Singapore (SG Arrival Card)

Perfect for frequent Asia travelers who value privacy and efficiency.

Your passport data is stored securely on your device using biometric encryption. Borderly never uploads your personal information to any server.
```

### ⚡ Performance & Quality

- [ ] **App Size** - Under 50MB uncompressed
- [ ] **Launch Time** - Under 3 seconds on target devices
- [ ] **Memory Usage** - No memory leaks in Instruments
- [ ] **Battery Usage** - No excessive background activity
- [ ] **Crash Rate** - 0% based on internal testing
- [ ] **Network Usage** - Only for government portal links (user-initiated)

### 🧪 Testing & Quality Assurance

- [ ] **Unit Tests** - Pass all tests (`pnpm test`)
- [ ] **E2E Tests** - Pass all smoke tests (`pnpm e2e`)
- [ ] **TypeScript** - No type errors (`pnpm typecheck`)
- [ ] **Device Testing** - iOS 15.0+ and Android 7.0+ devices
- [ ] **Accessibility** - VoiceOver/TalkBack support
- [ ] **Localization** - English only for MVP
- [ ] **Edge Cases** - Airplane mode, low storage, permissions denied

### 📱 Build Configuration

#### iOS (Xcode)

- [ ] **Signing & Capabilities**
  - [ ] Automatic signing enabled
  - [ ] Team: Borderly Development Team
  - [ ] Bundle identifier: com.borderly.app
  - [ ] Capabilities: Camera, Biometric Authentication
  
- [ ] **Build Settings**
  - [ ] Code signing identity: iPhone Distribution
  - [ ] Provisioning profile: App Store distribution
  - [ ] Bitcode: Disabled (React Native requirement)
  - [ ] Strip debug symbols: Yes
  
- [ ] **Info.plist**
  - [ ] NSCameraUsageDescription: "Scan passport for automatic form filling"
  - [ ] NSFaceIDUsageDescription: "Secure your passport data with biometric lock"
  - [ ] ITSAppUsesNonExemptEncryption: NO

#### Android (Gradle)

- [ ] **app/build.gradle**
  - [ ] versionName matches marketing version
  - [ ] versionCode incremented from last release
  - [ ] minSdkVersion: 24 (Android 7.0)
  - [ ] targetSdkVersion: 34 (Android 14)
  - [ ] Proguard enabled for release
  
- [ ] **Signing Configuration**
  - [ ] Release keystore configured
  - [ ] Key alias and passwords set via environment variables
  - [ ] SHA-1 fingerprint registered for Google Play
  
- [ ] **Permissions (AndroidManifest.xml)**
  - [ ] CAMERA: "Required for passport scanning"
  - [ ] USE_BIOMETRIC: "Secure passport data access"

### 🚀 Release Process

#### Pre-Release Validation

- [ ] **Code Freeze** - No new features, only critical fixes
- [ ] **Version Bump** - iOS and Android versions incremented
- [ ] **Changelog** - Updated with user-facing changes
- [ ] **Git Tag** - Release tagged (v1.0.0)
- [ ] **Branch Protection** - Main branch requires PR reviews

#### Build & Upload

- [ ] **iOS Archive**
  - [ ] Build for release configuration
  - [ ] Upload to App Store Connect via Xcode
  - [ ] Processing complete (wait for app to show in TestFlight)
  
- [ ] **Android APK/AAB**
  - [ ] Build signed release bundle (`./gradlew bundleRelease`)
  - [ ] Upload to Google Play Console
  - [ ] All pre-launch reports pass

#### Store Submission

- [ ] **iOS Review** - Submit for App Store review
- [ ] **Android Review** - Release to production (or staged rollout)
- [ ] **Release Notes** - Published to users
- [ ] **Monitor** - Watch for crashes, reviews, download metrics

### 🔍 Post-Launch Monitoring

#### Week 1 Metrics

- [ ] **Download Numbers** - Track organic vs. featured
- [ ] **Crash Rate** - Should remain under 1%
- [ ] **User Reviews** - Respond to feedback within 24h
- [ ] **Performance** - Monitor app launch time, memory usage
- [ ] **Government Portal Changes** - Verify form schemas still accurate

#### Ongoing Maintenance

- [ ] **Schema Updates** - Monitor Japan/Malaysia/Singapore form changes
- [ ] **OS Compatibility** - Test with new iOS/Android releases
- [ ] **Security Updates** - React Native and dependency updates
- [ ] **Feature Requests** - Collect and prioritize user feedback

## Emergency Rollback Plan

If critical issues are discovered post-launch:

1. **iOS**: Use Phased Release to stop rollout, or remove from sale
2. **Android**: Use staged rollout halt, or publish hotfix
3. **Communication**: Update store descriptions with known issues
4. **Hotfix Process**: Critical fixes bypass normal review for expedited approval

## Compliance Validation

This checklist ensures compliance with:
- Apple App Store Review Guidelines
- Google Play Developer Policy
- GDPR (no data collection)
- COPPA (4+ age rating)
- Export Administration Regulations (EAR)