#!/bin/bash
set -euo pipefail

# Borderly Release Build Script
# Builds production-ready iOS and Android apps for app store submission

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
VERSION=""
BUILD_NUMBER=""
PLATFORM=""
SKIP_TESTS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build production releases for iOS and Android

Options:
    -v, --version VERSION    Release version (e.g., 1.0.0)
    -b, --build-number NUM   Build number (defaults to current timestamp)
    -p, --platform PLATFORM Build specific platform: ios|android|all (default: all)
    -s, --skip-tests        Skip running tests before build
    -h, --help              Show this help message

Environment Variables:
    APPLE_TEAM_ID              Apple Developer Team ID (required for iOS)
    ANDROID_KEYSTORE_PASSWORD  Android keystore password
    ANDROID_KEY_ALIAS          Android key alias
    ANDROID_KEY_PASSWORD       Android key password

Examples:
    $0 -v 1.0.0                           # Build all platforms
    $0 -v 1.0.0 -p ios                    # Build iOS only
    $0 -v 1.0.0 -b 42 --skip-tests        # Custom build number, skip tests
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -b|--build-number)
                BUILD_NUMBER="$2"
                shift 2
                ;;
            -p|--platform)
                PLATFORM="$2"
                shift 2
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Validate required args
    if [[ -z "$VERSION" ]]; then
        error "Version is required. Use -v or --version"
    fi

    # Validate version format
    if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
        error "Invalid version format: $VERSION. Expected: X.Y.Z or X.Y.Z-prerelease"
    fi

    # Set defaults
    if [[ -z "$BUILD_NUMBER" ]]; then
        BUILD_NUMBER=$(date +%s)
    fi

    if [[ -z "$PLATFORM" ]]; then
        PLATFORM="all"
    fi

    # Validate platform
    case "$PLATFORM" in
        ios|android|all) ;;
        *) error "Invalid platform: $PLATFORM. Must be: ios|android|all" ;;
    esac
}

check_dependencies() {
    log "Checking dependencies..."

    # Check Node.js and pnpm
    command -v node >/dev/null 2>&1 || error "Node.js is not installed"
    command -v pnpm >/dev/null 2>&1 || error "pnpm is not installed"

    # Check platform-specific tools
    if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
        if [[ "$OSTYPE" != "darwin"* ]]; then
            error "iOS builds require macOS"
        fi
        command -v xcodebuild >/dev/null 2>&1 || error "Xcode is not installed"
        command -v pod >/dev/null 2>&1 || error "CocoaPods is not installed"
    fi

    if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
        test -x "$PROJECT_ROOT/android/gradlew" || error "Android Gradle wrapper not found or not executable"
    fi

    success "Dependencies check passed"
}

setup_environment() {
    log "Setting up build environment..."

    cd "$PROJECT_ROOT"

    # Create build directory
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # Install dependencies
    log "Installing dependencies..."
    pnpm install --frozen-lockfile

    success "Environment setup complete"
}

run_quality_gates() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warn "Skipping tests (--skip-tests flag)"
        return 0
    fi

    log "Running quality gates..."

    # TypeScript check
    log "Running TypeScript check..."
    pnpm typecheck || error "TypeScript check failed"

    # Linting
    log "Running ESLint..."
    pnpm lint || error "Linting failed"

    # Unit tests
    log "Running unit tests..."
    pnpm test --ci --watchAll=false || error "Unit tests failed"

    # E2E tests
    log "Running E2E tests..."
    pnpm e2e || error "E2E tests failed"

    # Bundle validation
    log "Validating React Native bundle..."
    npx react-native bundle \
        --platform ios \
        --dev false \
        --entry-file index.js \
        --bundle-output /tmp/validate-bundle.js \
        --verbose || error "Bundle validation failed"

    success "Quality gates passed"
}

build_ios() {
    log "Building iOS release..."

    cd "$PROJECT_ROOT/ios"

    # Update version in Info.plist
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" Borderly/Info.plist
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" Borderly/Info.plist

    log "Updated iOS version to $VERSION ($BUILD_NUMBER)"

    # Install CocoaPods dependencies
    log "Installing CocoaPods dependencies..."
    pod install --repo-update

    # Clean previous builds
    xcodebuild clean \
        -workspace Borderly.xcworkspace \
        -scheme Borderly

    # Build archive
    log "Building iOS archive..."
    xcodebuild archive \
        -workspace Borderly.xcworkspace \
        -scheme Borderly \
        -configuration Release \
        -destination generic/platform=iOS \
        -archivePath "$BUILD_DIR/Borderly.xcarchive"

    # Create export options
    cat > "$BUILD_DIR/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>$APPLE_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
</dict>
</plist>
EOF

    # Export IPA
    log "Exporting iOS IPA..."
    xcodebuild -exportArchive \
        -archivePath "$BUILD_DIR/Borderly.xcarchive" \
        -exportPath "$BUILD_DIR/ios" \
        -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist"

    # Verify IPA was created
    IPA_PATH="$BUILD_DIR/ios/Borderly.ipa"
    if [[ -f "$IPA_PATH" ]]; then
        IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
        success "iOS build completed: $IPA_PATH ($IPA_SIZE)"
    else
        error "iOS IPA not found at expected location: $IPA_PATH"
    fi
}

build_android() {
    log "Building Android release..."

    cd "$PROJECT_ROOT/android"

    # Update version in build.gradle
    sed -i.bak "s/versionName \".*\"/versionName \"$VERSION\"/" app/build.gradle
    sed -i.bak "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" app/build.gradle

    log "Updated Android version to $VERSION ($BUILD_NUMBER)"

    # Clean previous builds
    ./gradlew clean

    # Build release AAB
    log "Building Android release AAB..."
    if [[ -f app/release.keystore ]] && [[ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ]]; then
        # Build signed release (credentials read from environment variables by gradle.properties)
        ./gradlew bundleRelease
        
        AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    else
        warn "No keystore found or credentials missing, building debug version"
        ./gradlew bundleDebug
        AAB_PATH="app/build/outputs/bundle/debug/app-debug.aab"
    fi

    # Copy to build directory
    cp "$AAB_PATH" "$BUILD_DIR/"

    # Verify AAB was created
    FINAL_AAB_PATH="$BUILD_DIR/$(basename "$AAB_PATH")"
    if [[ -f "$FINAL_AAB_PATH" ]]; then
        AAB_SIZE=$(du -h "$FINAL_AAB_PATH" | cut -f1)
        success "Android build completed: $FINAL_AAB_PATH ($AAB_SIZE)"
    else
        error "Android AAB not found at expected location: $FINAL_AAB_PATH"
    fi
}

generate_build_summary() {
    log "Generating build summary..."

    SUMMARY_FILE="$BUILD_DIR/build-summary.md"
    
    cat > "$SUMMARY_FILE" << EOF
# Build Summary

**Version:** $VERSION  
**Build Number:** $BUILD_NUMBER  
**Platform:** $PLATFORM  
**Build Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')  
**Git Commit:** $(git rev-parse HEAD)  

## Artifacts

EOF

    if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]] && [[ -f "$BUILD_DIR/ios/Borderly.ipa" ]]; then
        IPA_SIZE=$(du -h "$BUILD_DIR/ios/Borderly.ipa" | cut -f1)
        echo "- **iOS**: \`Borderly.ipa\` ($IPA_SIZE)" >> "$SUMMARY_FILE"
    fi

    if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
        if [[ -f "$BUILD_DIR/app-release.aab" ]]; then
            AAB_SIZE=$(du -h "$BUILD_DIR/app-release.aab" | cut -f1)
            echo "- **Android**: \`app-release.aab\` ($AAB_SIZE)" >> "$SUMMARY_FILE"
        elif [[ -f "$BUILD_DIR/app-debug.aab" ]]; then
            AAB_SIZE=$(du -h "$BUILD_DIR/app-debug.aab" | cut -f1)
            echo "- **Android**: \`app-debug.aab\` ($AAB_SIZE) ⚠️ Debug build" >> "$SUMMARY_FILE"
        fi
    fi

    cat >> "$SUMMARY_FILE" << EOF

## Next Steps

### iOS
1. Upload \`Borderly.ipa\` to App Store Connect
2. Configure app metadata and screenshots  
3. Submit for App Store review

### Android
1. Upload \`app-release.aab\` to Google Play Console
2. Configure store listing and screenshots
3. Submit for Play Store review

## Verification

To verify the builds:
\`\`\`bash
# iOS
unzip -l build/ios/Borderly.ipa

# Android
unzip -l build/app-release.aab
\`\`\`
EOF

    success "Build summary generated: $SUMMARY_FILE"
    cat "$SUMMARY_FILE"
}

main() {
    log "Starting Borderly release build..."
    log "Version: $VERSION, Build: $BUILD_NUMBER, Platform: $PLATFORM"

    check_dependencies
    setup_environment
    run_quality_gates

    case "$PLATFORM" in
        ios)
            build_ios
            ;;
        android)
            build_android
            ;;
        all)
            build_ios
            build_android
            ;;
    esac

    generate_build_summary
    success "Release build completed successfully! 🎉"
}

# Parse arguments and run
parse_args "$@"
main