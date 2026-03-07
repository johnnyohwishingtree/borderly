# Release Process Documentation

This document outlines the complete release process for Borderly, from code freeze to app store deployment.

## Release Cycle Overview

Borderly follows a continuous deployment model with the following release cadence:
- **Major releases**: Quarterly (new country support, major features)
- **Minor releases**: Monthly (feature improvements, UX enhancements)  
- **Patch releases**: As needed (critical bugs, government portal changes)

## Release Branching Strategy

```
main (production-ready code)
├── release/v1.0.0 (release branch)
├── feature/new-country-support
└── hotfix/critical-bug-fix
```

### Branch Types
- `main`: Production-ready code, protected branch
- `release/vX.Y.Z`: Release preparation, feature freeze
- `feature/*`: New feature development
- `hotfix/*`: Critical bug fixes for production

## Pre-Release Phase

### 1. Planning & Code Freeze (T-14 days)

```bash
# Create release branch from main
git checkout main
git pull origin main
git checkout -b release/v1.1.0
git push origin release/v1.1.0
```

**Release Manager Tasks**:
- [ ] Create release branch
- [ ] Update version numbers across all platforms
- [ ] Freeze feature development
- [ ] Begin integration testing
- [ ] Update CHANGELOG.md
- [ ] Create release GitHub issue

### 2. Version Number Management

Update version numbers in the following files:

**package.json**:
```json
{
  "version": "1.1.0"
}
```

**iOS - ios/Borderly/Info.plist**:
```xml
<key>CFBundleShortVersionString</key>
<string>1.1.0</string>
<key>CFBundleVersion</key>
<string>42</string>
```

**Android - android/app/build.gradle**:
```gradle
versionName "1.1.0"
versionCode 42
```

### 3. Quality Assurance (T-10 days)

Run comprehensive test suite:

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck

# Unit tests with coverage
pnpm test --coverage

# E2E tests
pnpm e2e

# Performance tests
pnpm test:performance

# Bundle size analysis
pnpm build:analyze

# Security audit
pnpm audit

# Compliance validation
pnpm test:compliance
```

**QA Checklist**:
- [ ] All automated tests passing
- [ ] Manual testing on iOS 15.0+ devices
- [ ] Manual testing on Android 7.0+ devices  
- [ ] Accessibility testing (VoiceOver/TalkBack)
- [ ] Performance benchmarking
- [ ] Security penetration testing
- [ ] Government portal integration testing

### 4. Government Schema Validation (T-7 days)

Critical validation of country schemas against live government portals:

```bash
# Run schema validation tests
pnpm test:schemas

# Manual validation
# 1. Create test trip for each supported country
# 2. Generate forms using current schemas
# 3. Verify fields match current government portals
# 4. Test submission process end-to-end
```

**Portal Validation Checklist**:
- [ ] Japan - Visit Japan Web (vjw.digital.go.jp)
- [ ] Malaysia - MDAC (mdac.gov.my)
- [ ] Singapore - SG Arrival Card (eservices.ica.gov.sg)

## Build & Release Phase

### 1. Release Build Preparation (T-3 days)

**iOS Release Build**:
```bash
# Ensure release entitlements are configured
cp ios/Borderly/Release.entitlements ios/Borderly/Borderly.entitlements

# Clean and build
cd ios
rm -rf build/ DerivedData/
xcodebuild clean -workspace Borderly.xcworkspace -scheme Borderly

# Create release archive
xcodebuild archive \
  -workspace Borderly.xcworkspace \
  -scheme Borderly \
  -configuration Release \
  -archivePath build/Borderly.xcarchive \
  CODE_SIGN_STYLE=Manual \
  PROVISIONING_PROFILE_SPECIFIER="Borderly App Store" \
  CODE_SIGN_IDENTITY="iPhone Distribution"
```

**Android Release Build**:
```bash
# Navigate to Android project
cd android

# Clean previous builds  
./gradlew clean

# Build signed release bundle
./gradlew bundleRelease

# Verify bundle contents
unzip -l app/build/outputs/bundle/release/app-release.aab
```

### 2. Pre-Upload Validation

**iOS Validation**:
```bash
# Validate archive before upload
xcodebuild -exportArchive \
  -archivePath build/Borderly.xcarchive \
  -exportPath build/validation \
  -exportOptionsPlist ios/ExportOptions-validation.plist

# Check app size and performance
instruments -t "App Launch" build/validation/Borderly.app
```

**Android Validation**:
```bash
# Analyze bundle with bundletool
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=app/build/outputs/apk/release/borderly.apks

# Extract and analyze APK size
bundletool extract-apks \
  --apks=app/build/outputs/apk/release/borderly.apks \
  --output-dir=app/build/outputs/apk/release/extracted
```

## App Store Submission

### 1. Upload Builds

**iOS Upload to App Store Connect**:
```bash
# Upload via Xcode (recommended)
# OR via command line:
xcrun altool \
  --upload-app \
  --type ios \
  --file build/Borderly.ipa \
  --username "developer@borderly.app" \
  --password "@keychain:APPLE_ID_PASSWORD"
```

**Android Upload to Play Console**:
1. Log into [Google Play Console](https://play.google.com/console)
2. Go to "Borderly" app
3. Navigate to "Production" → "Create new release"
4. Upload `app/build/outputs/bundle/release/app-release.aab`
5. Complete release notes and save as draft

### 2. Store Metadata Updates

**iOS App Store Connect**:
- Update "What's New in This Version" with release notes
- Verify app screenshots are current
- Update privacy questionnaire if data handling changed
- Complete export compliance declaration

**Google Play Console**:
- Update release notes for current version
- Verify store listing screenshots
- Update data safety form if required
- Complete content rating if app features changed

### 3. Submit for Review

**iOS Submission**:
1. Select uploaded build in App Store Connect
2. Complete metadata and compliance forms
3. Submit for review
4. Estimated review time: 1-3 days

**Android Submission**:
1. Review all policy compliance requirements
2. Submit to production (or staged rollout)
3. Estimated review time: 0-2 days

## Post-Release Phase

### 1. Launch Monitoring (Day 0-7)

Set up comprehensive monitoring for first week post-launch:

```bash
# Monitor crash reports
# iOS: Xcode Organizer → Crashes
# Android: Play Console → Quality → Android vitals

# Track key metrics
# - Download/install numbers
# - Crash-free session rate (target: >99.9%)
# - App launch time (target: <3 seconds)
# - Memory usage
# - Battery consumption
```

**Daily Monitoring Checklist**:
- [ ] Check crash reports and fix critical issues
- [ ] Monitor user reviews and respond within 24h
- [ ] Verify government portal integrations still work
- [ ] Track download metrics and user acquisition
- [ ] Monitor app performance dashboards

### 2. User Feedback Response

**Review Response Templates**:

*Positive Reviews*:
```text
Thank you for using Borderly! We're thrilled that it made your travel experience smoother. Safe travels! 🌍
```

*Bug Reports*:
```text
Thanks for reporting this issue. We've identified the problem and will include a fix in our next update. Please contact support@borderly.app if you need immediate assistance.
```

*Feature Requests*:
```text
Great suggestion! We're always looking to improve Borderly. We've added this to our product roadmap for consideration in future updates.
```

### 3. Hotfix Process

If critical issues are discovered post-launch:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# Make minimal fix
# ... fix the bug ...

# Test hotfix
pnpm test
pnpm e2e

# Merge and tag
git checkout main
git merge hotfix/critical-bug-fix
git tag v1.1.1
git push origin main --tags

# Follow expedited release process
```

## Release Automation

### 1. Automated Release Script

Create `scripts/prepare-release.sh`:

```bash
#!/bin/bash
set -e

VERSION=$1
BUILD_NUMBER=$2

if [ -z "$VERSION" ] || [ -z "$BUILD_NUMBER" ]; then
    echo "Usage: ./prepare-release.sh <version> <build_number>"
    echo "Example: ./prepare-release.sh 1.1.0 42"
    exit 1
fi

echo "🚀 Preparing release v$VERSION (build $BUILD_NUMBER)"

# Update version numbers
echo "📝 Updating version numbers..."
npm version $VERSION --no-git-tag-version

# Update iOS version
sed -i '' "s/CFBundleShortVersionString<\/key>.*<string>.*<\/string>/CFBundleShortVersionString<\/key><string>$VERSION<\/string>/" ios/Borderly/Info.plist
sed -i '' "s/CFBundleVersion<\/key>.*<string>.*<\/string>/CFBundleVersion<\/key><string>$BUILD_NUMBER<\/string>/" ios/Borderly/Info.plist

# Update Android version
sed -i '' "s/versionName \".*\"/versionName \"$VERSION\"/" android/app/build.gradle
sed -i '' "s/versionCode .*/versionCode $BUILD_NUMBER/" android/app/build.gradle

# Run quality checks
echo "🧪 Running quality checks..."
pnpm typecheck
pnpm test
pnpm lint

echo "✅ Release v$VERSION prepared successfully!"
echo "Next steps:"
echo "1. Review and commit version changes"
echo "2. Create release branch: git checkout -b release/v$VERSION"
echo "3. Run full test suite: pnpm e2e"
echo "4. Build and test release candidates"
```

### 2. CI/CD Integration

Add release automation to GitHub Actions:

```yaml
name: Release Build
on:
  push:
    branches: [release/*]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test && pnpm e2e
      - name: Build iOS
        run: |
          cd ios
          xcodebuild archive \
            -workspace Borderly.xcworkspace \
            -scheme Borderly \
            -configuration Release \
            -archivePath build/Borderly.xcarchive
            
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: pnpm install
      - name: Build Android
        run: |
          cd android
          ./gradlew bundleRelease
```

## Emergency Response Procedures

### 1. Critical Bug Response (< 2 hours)

```bash
# Immediate response for app-breaking bugs
echo "🚨 CRITICAL BUG DETECTED"

# 1. Assess impact and affected users
# 2. Create hotfix branch immediately
# 3. Implement minimal fix
# 4. Test fix in isolation
# 5. Use app store expedited review
# 6. Consider phased rollout halt if needed
```

### 2. Government Portal Changes (< 24 hours)

```bash
# Response for government portal schema changes
echo "⚠️ GOVERNMENT PORTAL CHANGE DETECTED"

# 1. Update affected country schema
# 2. Test against live portal
# 3. Release schema update
# 4. Monitor user submission success rates
# 5. Notify users via in-app banner if needed
```

## Success Metrics

### Release Quality Targets
- **Crash-free session rate**: >99.9%
- **App launch time**: <3 seconds
- **Memory usage**: <100MB baseline
- **Battery drain**: <2% per hour active use
- **User rating**: >4.5 stars
- **Review response time**: <24 hours

### Business Metrics
- **Download growth**: 20% month-over-month
- **User retention**: 60% after 7 days
- **Form completion rate**: >95%
- **Government portal success rate**: >98%

For technical details on builds and configurations, see `app-store-submission-guide.md` and `app-store-submission-checklist.md`.