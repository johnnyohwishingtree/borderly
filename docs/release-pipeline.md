# Release Pipeline Documentation

This document describes Borderly's automated testing and release pipeline, including CI/CD workflows, deployment processes, and quality gates.

## Overview

Borderly uses a comprehensive release pipeline to ensure high-quality releases across iOS and Android platforms. The pipeline includes:

- **Automated Testing**: TypeScript checks, linting, unit tests, and E2E tests
- **Security Auditing**: Dependency scanning and vulnerability checks
- **Build Automation**: Platform-specific builds with version management
- **Deployment Automation**: TestFlight and Google Play Console deployment
- **Release Management**: Automated release notes and changelog generation

## Pipeline Components

### 1. Existing Quality Gates (`.github/workflows/test.yml`)

The existing test workflow provides comprehensive PR validation:

#### Quality Checks
- **TypeScript Check**: Validates type safety with baseline error tracking
- **Metro Bundle Check**: Ensures React Native bundles compile correctly
- **Unit Tests**: Jest test suite execution with forceExit
- **Auto-fix**: Automatically comments on PRs with failures and retry logic

### 2. Release Workflow (`.github/workflows/release.yml`)

Handles full production releases with comprehensive validation:

#### Release Validation
- All quality gates must pass
- Version format validation (semver)
- Tag uniqueness verification
- App Store compliance checks

#### Build Process
- **iOS Build**: Xcode archive and IPA generation
- **Android Build**: Gradle AAB compilation with signing
- **Version Management**: Automatic version updates in platform files
- **Artifact Storage**: Builds stored as GitHub artifacts

#### GitHub Release Creation
- **Automated Tagging**: Creates and pushes release tags
- **Release Notes**: Generates comprehensive release documentation
- **Asset Upload**: Attaches platform builds to GitHub release

### 3. Build Scripts

#### `scripts/build-release.sh`

Comprehensive build script for production releases:

**Features:**
- Platform-specific builds (iOS, Android, or both)
- Version validation and updating
- Quality gate execution
- Build artifact verification
- Comprehensive logging and error handling

**Usage:**
```bash
# Build all platforms for version 1.0.0
./scripts/build-release.sh -v 1.0.0

# Build iOS only, skip tests
./scripts/build-release.sh -v 1.0.0 -p ios --skip-tests

# Custom build number
./scripts/build-release.sh -v 1.0.0 -b 42
```

**Environment Variables:**
```bash
export APPLE_TEAM_ID="ABC123DEF4"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="upload"
export ANDROID_KEY_PASSWORD="key-password"
```

#### `scripts/deploy-testflight.sh`

TestFlight deployment automation:

**Features:**
- App Store Connect API integration
- Automatic upload and processing
- Beta group configuration
- Release notes management
- Processing status monitoring

**Usage:**
```bash
# Deploy with release notes
./scripts/deploy-testflight.sh \
  -i build/ios/Borderly.ipa \
  -r "Bug fixes and new features"

# Deploy to specific beta groups
./scripts/deploy-testflight.sh \
  -i build/ios/Borderly.ipa \
  -g "Internal,QA" \
  -r "Ready for testing"
```

#### `scripts/deploy-play-console.sh`

Google Play Console deployment:

**Features:**
- Google Play Developer API integration
- Track-based deployment (internal/alpha/beta/production)
- Staged rollout support
- ProGuard mapping upload
- Release configuration management

**Usage:**
```bash
# Deploy to internal testing
./scripts/deploy-play-console.sh \
  -a build/app-release.aab \
  -t internal \
  -r "Internal testing build"

# Production deployment with staged rollout
./scripts/deploy-play-console.sh \
  -a build/app-release.aab \
  -t production \
  --rollout-percentage 10 \
  -r "Stable release with gradual rollout"
```

### 4. Release Notes Generator (`scripts/generate-release-notes.js`)

Automated release notes from git history:

**Features:**
- Conventional commit parsing
- Automatic categorization by type
- Breaking change detection
- PR and issue reference extraction
- Multiple output formats (Markdown, JSON, text)

**Usage:**
```bash
# Generate release notes for version 1.2.0
node scripts/generate-release-notes.js -v 1.2.0

# Generate notes between specific tags
node scripts/generate-release-notes.js -f v1.0.0 -t v1.1.0 -v 1.1.0

# Update existing changelog
node scripts/generate-release-notes.js -v 1.2.0 --update
```

## Release Process

### 1. Development Phase

1. **Feature Development**: Work on feature branches
2. **Pull Request**: Create PR targeting `main` branch
3. **Quality Gates**: Automated PR checks run and must pass
4. **Code Review**: Human review and approval required
5. **Merge**: Squash and merge to `main`

### 2. Pre-release Phase

1. **Version Planning**: Determine next version number (semver)
2. **Release Branch**: Create release branch if needed
3. **Final Testing**: Run full test suite
4. **Release Notes**: Generate and review release notes

### 3. Release Phase

1. **Tag Creation**: Create version tag (`v1.0.0`)
2. **Automatic Build**: Release workflow triggers automatically
3. **Quality Validation**: All checks must pass
4. **Build Generation**: iOS and Android builds created
5. **GitHub Release**: Release created with artifacts

### 4. Manual Deployment Phase (until workflow permissions are available)

1. **Download Artifacts**: Get builds from GitHub release
2. **TestFlight Upload**: Use deployment script for iOS
3. **Play Console Upload**: Use deployment script for Android
4. **Beta Testing**: Release to internal/beta testers
5. **Production Release**: Promote to production tracks
6. **Monitoring**: Monitor for issues and user feedback

## Quality Gates

### Code Quality
- **TypeScript**: Baseline error tracking (current baseline: 76 errors)
- **Metro Bundle**: React Native bundle compilation validation
- **Unit Tests**: Jest test suite execution
- **E2E Tests**: Available but not in primary CI workflow

### Security
- **Dependency Audit**: No high/critical vulnerabilities
- **License Compliance**: Only approved licenses
- **Secret Scanning**: No secrets in code
- **Privacy Compliance**: PII handling validation

### Performance
- **Bundle Size**: Monitor and limit app size growth
- **Build Time**: Reasonable CI/CD execution time
- **Test Speed**: Fast feedback loops

### Platform Requirements
- **iOS**: Xcode build validation
- **Android**: Gradle build and lint checks
- **React Native**: Metro bundler validation

## Environment Configuration

### GitHub Actions Secrets

**iOS Deployment:**
```
APPLE_ID=your-apple-id@example.com
APPLE_APP_PASSWORD=app-specific-password
APPLE_TEAM_ID=ABC123DEF4
ASC_API_KEY_ID=api-key-id
ASC_API_ISSUER_ID=api-issuer-id
ASC_API_KEY_PATH=/path/to/key.p8
```

**Android Deployment:**
```
ANDROID_KEYSTORE_BASE64=base64-encoded-keystore
ANDROID_KEYSTORE_PASSWORD=keystore-password
ANDROID_KEY_ALIAS=upload-key-alias
ANDROID_KEY_PASSWORD=key-password
PLAY_PACKAGE_NAME=com.borderly.app
PLAY_SERVICE_ACCOUNT_KEY=service-account.json
```

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Setup iOS** (macOS only):
   ```bash
   cd ios && pod install
   ```

3. **Run Quality Checks**:
   ```bash
   pnpm typecheck
   pnpm lint  
   pnpm test
   pnpm e2e
   ```

## Deployment Automation

### Manual Deployment (Current State)

Since GitHub App permissions don't include `workflows`, manual deployment using the provided scripts:

```bash
# 1. Build release locally or download from GitHub Actions
./scripts/build-release.sh -v 1.0.0

# 2. Deploy to TestFlight
./scripts/deploy-testflight.sh \
  -i build/ios/Borderly.ipa \
  -r "Production release v1.0.0"

# 3. Deploy to Play Console
./scripts/deploy-play-console.sh \
  -a build/app-release.aab \
  -t internal \
  -r "Production release v1.0.0"
```

### Future Automation (when workflow permissions available)

The release workflow can be enhanced to include automatic deployment steps by adding the workflow modifications that are currently blocked by permissions.

## Troubleshooting

### Common Issues

**TypeScript Errors:**
```bash
# Run type check with detailed errors
pnpm typecheck --verbose

# Current baseline: 76 errors (being tracked)
```

**Bundle Issues:**
```bash
# Check bundle with verbose output
npx react-native bundle --platform ios --dev false --verbose
```

**Test Failures:**
```bash
# Run tests with debugging
pnpm test --verbose --no-coverage

# Run specific test file
pnpm test SomeComponent.test.tsx
```

**Build Failures:**
```bash
# Clean and rebuild iOS
cd ios && xcodebuild clean
rm -rf ios/build ios/DerivedData

# Clean Android
cd android && ./gradlew clean
```

### GitHub Workflow Permissions

If you need to modify workflows (`.github/workflows/`), the GitHub App requires additional `workflows` permission. Contact repository administrators to:

1. Grant `workflows` permission to the GitHub App
2. Add the enhanced PR checks workflow
3. Enable automatic deployment in release workflow

## Rollback Procedures

### 1. Emergency Rollback

If a critical issue is discovered post-release:

1. **Immediate Action**: Remove from app stores if possible
2. **Hotfix Branch**: Create hotfix branch from last stable tag
3. **Critical Fix**: Implement minimal fix for critical issue
4. **Fast-track Release**: Use expedited release process
5. **Communication**: Notify stakeholders and users

### 2. Partial Rollback

For staged rollouts with issues:

1. **Reduce Rollout**: Lower rollout percentage
2. **Monitor Metrics**: Watch crash rates and user feedback
3. **Fix or Revert**: Decide on fix vs. full rollback
4. **Gradual Recovery**: Slowly increase rollout after fix

### 3. Version Rollback

For systemic issues requiring version revert:

1. **Previous Version**: Promote previous stable version
2. **User Communication**: Clear messaging about temporary revert
3. **Fix Development**: Develop comprehensive fix
4. **Re-release**: New version with fixes

## Monitoring and Metrics

### Build Metrics
- **Build Success Rate**: Track CI/CD success percentage
- **Build Duration**: Monitor for performance regressions
- **Test Coverage**: Ensure coverage maintains/improves
- **Bundle Size**: Track app size over time

### Release Metrics
- **Release Frequency**: Measure delivery velocity
- **Time to Production**: Track lead time
- **Rollback Rate**: Monitor release quality
- **User Adoption**: Track version adoption rates

### Quality Metrics
- **Test Pass Rate**: Monitor test stability
- **Security Vulnerabilities**: Track and resolve quickly
- **Code Quality**: ESLint/TypeScript error trends
- **Performance**: Bundle size and load time metrics

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [React Native Release Process](https://reactnative.dev/docs/signed-apk-android)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [Google Play Developer API](https://developers.google.com/android-publisher)
- [Conventional Commits](https://conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)