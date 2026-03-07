# TestFlight Setup & Distribution Guide

This guide covers setting up TestFlight distribution for the Borderly app using GitHub Actions and Fastlane.

## Prerequisites

### 1. Apple Developer Account Setup
- Active Apple Developer Program membership
- App Store Connect access
- Bundle ID registered: `com.borderly.app`

### 2. App Store Connect Configuration
1. Create app in App Store Connect
   - App Name: Borderly
   - Bundle ID: `com.borderly.app`
   - SKU: `borderly-ios`
   - Primary Language: English (U.S.)

2. Configure TestFlight settings:
   - Enable Internal Testing
   - Set up External Testing groups (optional)
   - Configure privacy policy URL
   - Set up test information

### 3. Fastlane Setup

#### Install Fastlane (Local Development)
```bash
# Install Fastlane
sudo gem install fastlane

# Navigate to iOS directory
cd ios

# Initialize Fastlane
fastlane init
```

#### Fastfile Configuration
Create or update `ios/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  before_all do
    setup_circle_ci if ENV['CI']
  end

  desc "Bump patch version"
  lane :bump_version_patch do
    increment_version_number(bump_type: "patch")
    increment_build_number
  end

  desc "Bump minor version"
  lane :bump_version_minor do
    increment_version_number(bump_type: "minor")
    increment_build_number
  end

  desc "Bump major version"
  lane :bump_version_major do
    increment_version_number(bump_type: "major")
    increment_build_number
  end

  desc "Get version number"
  lane :get_version_number do
    get_version_number(xcodeproj: "Borderly.xcodeproj")
  end

  desc "Get build number"
  lane :get_build_number do
    get_build_number(xcodeproj: "Borderly.xcodeproj")
  end

  desc "Beta build to TestFlight"
  lane :beta_to_testflight do
    match(type: "appstore")
    
    build_app(
      scheme: "Borderly",
      configuration: "Release",
      export_method: "app-store",
      include_symbols: true,
      include_bitcode: false,
      clean: true
    )
    
    upload_to_testflight(
      changelog: ENV['TESTFLIGHT_CHANGELOG'] || "Internal beta testing build",
      distribute_external: false,
      notify_external_testers: false,
      skip_waiting_for_build_processing: false
    )
  end

  desc "Release build to TestFlight"
  lane :release_to_testflight do
    match(type: "appstore")
    
    build_app(
      scheme: "Borderly",
      configuration: "Release",
      export_method: "app-store",
      include_symbols: true,
      include_bitcode: false,
      clean: true
    )
    
    upload_to_testflight(
      changelog: ENV['TESTFLIGHT_CHANGELOG'] || "Release candidate build",
      distribute_external: true,
      notify_external_testers: true,
      skip_waiting_for_build_processing: false,
      groups: ["External Testers"]
    )
  end

  error do |lane, exception|
    # Handle errors
    puts "Error in lane #{lane}: #{exception}"
  end
end
```

### 4. Certificate Management

#### Using Fastlane Match (Recommended)
```bash
# Initialize match
fastlane match init

# Generate certificates and provisioning profiles
fastlane match appstore
fastlane match development
```

#### Manual Certificate Setup
1. Development Certificate
2. Distribution Certificate  
3. App Store Provisioning Profile
4. Development Provisioning Profile

### 5. GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `MATCH_PASSWORD` | Password for match certificates encryption | Yes |
| `FASTLANE_USER` | Apple Developer account email | Yes |
| `FASTLANE_PASSWORD` | Apple Developer account password | Yes |
| `FASTLANE_SESSION` | App Store Connect session token | Yes |
| `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` | App-specific password | Yes |

#### Generating App-Specific Password
1. Sign in to [appleid.apple.com](https://appleid.apple.com)
2. Go to "Sign-In and Security" > "App-Specific Passwords"
3. Generate new password
4. Copy the password to GitHub secrets

#### Generating Fastlane Session
```bash
fastlane spaceauth -u your-apple-id@email.com
```

## Usage

### Triggering TestFlight Builds

#### Via GitHub Actions UI
1. Go to Actions tab in GitHub
2. Select "TestFlight Distribution" workflow
3. Click "Run workflow"
4. Configure options:
   - **Build Type**: `beta` (internal) or `release` (external)
   - **Version Bump**: `patch`, `minor`, or `major`
   - **Release Notes**: Description for testers

#### Via GitHub CLI
```bash
# Beta build with patch version bump
gh workflow run testflight.yml \
  -f build_type=beta \
  -f version_bump=patch \
  -f release_notes="Bug fixes and improvements"

# Release build with minor version bump
gh workflow run testflight.yml \
  -f build_type=release \
  -f version_bump=minor \
  -f release_notes="New features for user testing"
```

### Local Testing Before TestFlight
```bash
# Run all tests
pnpm test
pnpm typecheck
pnpm e2e

# Build for iOS device
pnpm ios --device

# Build archive locally
cd ios
fastlane ios beta_to_testflight
```

## Workflow Process

1. **Trigger**: Manual workflow dispatch
2. **Setup**: Install dependencies and configure environment
3. **Certificates**: Download and install signing certificates
4. **Version**: Bump version number based on input
5. **Build**: Create release build with Xcode
6. **Upload**: Submit to TestFlight via App Store Connect API
7. **Tag**: Create Git tag for the build
8. **Release**: Create GitHub release with build information

## TestFlight Configuration

### Internal Testing
- Automatically available to internal testers
- Up to 100 internal testers
- No App Review required
- Instant distribution

### External Testing
- Requires App Review (1-3 days)
- Up to 10,000 external testers
- Public link available
- More comprehensive testing

## Monitoring & Notifications

### Build Status
- GitHub Actions provides build status
- Email notifications on failure
- Slack integration (optional)

### TestFlight Metrics
- Download rates
- Crash reports  
- Tester feedback
- Session duration

## Troubleshooting

### Common Issues

#### Certificate Problems
```bash
# Reset certificates
fastlane match nuke development
fastlane match nuke distribution

# Regenerate
fastlane match development
fastlane match appstore
```

#### Build Failures
```bash
# Clean build
cd ios
xcodebuild clean -workspace Borderly.xcworkspace -scheme Borderly
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

#### Upload Issues
- Check App Store Connect status
- Verify bundle ID matches
- Ensure version/build numbers are unique

### Support Resources
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [TestFlight Best Practices](https://developer.apple.com/testflight/)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)

## Security Considerations

### Sensitive Data Protection
- Certificates encrypted with Match
- Secrets stored in GitHub encrypted storage
- No hardcoded credentials in code
- App Store Connect API tokens rotate

### Build Integrity
- Signed builds only
- Reproducible builds with locked dependencies
- Artifact checksums verified
- Source code integrity maintained