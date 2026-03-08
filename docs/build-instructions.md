# iOS Build Instructions

This guide provides step-by-step instructions for building and distributing the Borderly iOS app for development, TestFlight, and App Store release.

## Prerequisites

### Development Environment
- **Xcode 15.0+** with iOS 15.1+ SDK
- **Node.js 18+** and **pnpm** package manager
- **CocoaPods** for dependency management
- **Apple Developer Program** membership for distribution

### Apple Developer Account Setup
1. **Bundle Identifier**: `com.borderly.app`
2. **Team ID**: Configure in Xcode project settings
3. **Certificates**:
   - iOS Development Certificate (for testing)
   - iOS Distribution Certificate (for App Store)
4. **Provisioning Profiles**:
   - Development Profile: `com.borderly.app Development`
   - App Store Profile: `com.borderly.app AppStore`

## Project Configuration

### Bundle Settings
- **Bundle ID**: `com.borderly.app`
- **App Name**: `Borderly`
- **Marketing Version**: `1.0` (set in Xcode project)
- **Current Project Version**: Auto-incremented build number

### Code Signing Configuration
- **Debug Configuration**:
  - Code Sign Identity: `iPhone Developer`
  - Code Sign Style: `Manual`
  - Entitlements: `Borderly.entitlements`

- **Release Configuration**:
  - Code Sign Identity: `iPhone Distribution`
  - Code Sign Style: `Manual`
  - Entitlements: `Release.entitlements`
  - Optimizations enabled for production

## Build Process

### 1. Development Build

For local testing and debugging:

```bash
# Install dependencies
pnpm install
cd ios && pod install && cd ..

# Set up development team and provisioning profile in Xcode
# 1. Open ios/Borderly.xcworkspace
# 2. Select Borderly target
# 3. Go to Signing & Capabilities
# 4. Select your development team
# 5. Select development provisioning profile

# Build and run on simulator
pnpm ios

# Build and run on device
pnpm ios --device "Your Device Name"
```

### 2. Release Build (Archive)

For TestFlight and App Store distribution:

```bash
# Ensure all dependencies are installed
pnpm install
cd ios && pod install && cd ..

# Run quality checks
pnpm typecheck  # Must pass
pnpm test      # Must pass
pnpm e2e       # Must pass

# Verify bundle builds correctly
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js

# Build archive via Xcode
# Method 1: Using Xcode GUI
# 1. Open ios/Borderly.xcworkspace
# 2. Select "Any iOS Device" as target
# 3. Product → Archive
# 4. When archive completes, select "Distribute App"
# 5. Choose distribution method (TestFlight/App Store)

# Method 2: Using command line
cd ios
xcodebuild -workspace Borderly.xcworkspace \
           -scheme Borderly \
           -configuration Release \
           -archivePath build/Borderly.xcarchive \
           clean archive

# Export for App Store
xcodebuild -exportArchive \
           -archivePath build/Borderly.xcarchive \
           -exportPath build/Release-iphoneos \
           -exportOptionsPlist ExportOptions.plist
```

### 3. Automated TestFlight Build

Using the GitHub Actions workflow:

```bash
# Via GitHub CLI (requires setup)
gh workflow run testflight.yml \
  -f build_type=beta \
  -f version_bump=patch \
  -f release_notes="Bug fixes and improvements"

# Or via GitHub web interface:
# 1. Go to Actions tab
# 2. Select "TestFlight Distribution"
# 3. Click "Run workflow"
# 4. Configure build options
```

## Version Management

### Version Numbers
- **Marketing Version** (`CFBundleShortVersionString`): User-facing version (1.0, 1.1, 2.0)
- **Build Version** (`CFBundleVersion`): Internal build number (1, 2, 3, ...)

### Version Bump Strategy
```bash
# Patch version (1.0.0 → 1.0.1)
cd ios
agvtool next-version -all           # Increment build number
agvtool new-marketing-version 1.0.1 # Set new marketing version

# Minor version (1.0.1 → 1.1.0) 
agvtool new-marketing-version 1.1.0

# Major version (1.1.0 → 2.0.0)
agvtool new-marketing-version 2.0.0
```

## Build Optimization

### Release Configuration Optimizations
- **Swift Optimization**: `-O` (Speed optimization)
- **Swift Compilation Mode**: `wholemodule`
- **Strip Installed Product**: `YES`
- **Validate Product**: `YES`
- **Only Active Architecture**: `NO`

### CocoaPods Optimizations
- **GCC Optimization Level**: `3`
- **Swift Optimization Level**: `-O`
- **Whole Module Compilation**: Enabled

## Troubleshooting

### Common Build Issues

#### 1. Code Signing Errors
```bash
# Check certificate status
security find-identity -v -p codesigning

# Check provisioning profile
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision
```

**Solutions**:
- Verify development team ID matches
- Ensure provisioning profile includes device UDID
- Check certificate expiration dates
- Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`

#### 2. Dependency Issues
```bash
# Clean and reinstall CocoaPods
cd ios
rm -rf Pods Podfile.lock
pod install --clean-install

# Clean pnpm cache
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 3. Bundle/Metro Issues
```bash
# Reset Metro bundler cache
npx react-native start --reset-cache

# Clean iOS build folder
cd ios
xcodebuild clean -workspace Borderly.xcworkspace -scheme Borderly
```

#### 4. Archive Validation Errors
- **Missing Compliance**: `ITSAppUsesNonExemptEncryption` set to `false` in Info.plist
- **Invalid Bundle**: Check bundle identifier matches provisioning profile
- **Missing Entitlements**: Ensure entitlements match App Store Connect capabilities

### Quality Assurance

#### Pre-Distribution Checklist
- [ ] All unit tests pass (`pnpm test`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] E2E tests pass (`pnpm e2e`)
- [ ] Bundle builds successfully (manual verification)
- [ ] App launches and core flows work on device
- [ ] Performance is acceptable (no memory leaks, smooth animations)
- [ ] Privacy settings are configured correctly
- [ ] App Store assets are ready (screenshots, descriptions)

#### Testing Environments
1. **Simulator Testing**: Basic functionality and UI
2. **Device Testing**: Performance, camera, biometrics, notifications
3. **TestFlight Beta**: External testing with real users
4. **App Store Review**: Final validation before public release

## File References

### Key Configuration Files
- `ios/Borderly.xcodeproj/project.pbxproj` - Xcode project settings
- `ios/Borderly/Info.plist` - App bundle configuration
- `ios/Borderly/Borderly.entitlements` - Development entitlements
- `ios/Borderly/Release.entitlements` - Distribution entitlements
- `ios/Podfile` - CocoaPods dependency configuration
- `package.json` - Node.js dependencies and scripts

### Build Artifacts
- `ios/build/Borderly.xcarchive` - Archive for distribution
- `ios/build/Release-iphoneos/Borderly.ipa` - App Store package
- `ios/DerivedData/` - Temporary build files (can be deleted)

## Security Considerations

### Certificate Management
- Store certificates in Keychain with restricted access
- Use separate certificates for development and distribution
- Rotate certificates annually or when compromised

### Sensitive Data
- Never commit certificates or provisioning profiles to git
- Use environment variables for API keys and secrets
- Ensure app sandbox is properly configured
- Validate all external network connections use HTTPS

### Distribution Security
- Only distribute through official Apple channels (TestFlight, App Store)
- Verify code signing on all builds
- Use App Transport Security (ATS) settings
- Follow Apple's security guidelines for data handling

## Support Resources

- **Apple Documentation**: [iOS App Distribution](https://developer.apple.com/ios/distribute/)
- **Xcode User Guide**: [Building and Running](https://help.apple.com/xcode/#/devc8c2a6be1)
- **React Native Guide**: [Publishing to App Store](https://reactnative.dev/docs/publishing-to-app-store)
- **TestFlight Guide**: [docs/testflight-setup.md](./testflight-setup.md)