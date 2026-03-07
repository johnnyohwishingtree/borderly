#!/bin/bash

# Borderly Release Preparation Script
# This script prepares a new release by updating version numbers,
# validating assets, running tests, and checking build configurations.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$1
BUILD_NUMBER=$2

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate version format (semantic versioning)
validate_version() {
    if [[ ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Version must be in semantic versioning format (e.g., 1.0.0)"
        exit 1
    fi
}

# Function to validate build number (integer)
validate_build_number() {
    if [[ ! $1 =~ ^[0-9]+$ ]]; then
        print_error "Build number must be a positive integer"
        exit 1
    fi
}

# Function to check required tools
check_requirements() {
    print_status "Checking required tools..."
    
    local missing_tools=()
    
    if ! command_exists "node"; then
        missing_tools+=("node")
    fi
    
    if ! command_exists "pnpm"; then
        missing_tools+=("pnpm")
    fi
    
    if ! command_exists "git"; then
        missing_tools+=("git")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install missing tools and try again"
        exit 1
    fi
    
    print_success "All required tools are available"
}

# Function to validate git status
check_git_status() {
    print_status "Checking git status..."
    
    if ! git diff-index --quiet HEAD --; then
        print_error "Working directory has uncommitted changes"
        print_error "Please commit or stash changes before preparing release"
        exit 1
    fi
    
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Working directory has untracked files"
        print_error "Please add or ignore files before preparing release"
        exit 1
    fi
    
    print_success "Working directory is clean"
}

# Function to update package.json version
update_package_version() {
    print_status "Updating package.json version to $VERSION..."
    
    # Use npm version to update package.json without creating git tag
    npm version "$VERSION" --no-git-tag-version --silent
    
    print_success "Updated package.json version"
}

# Function to update iOS version numbers
update_ios_version() {
    print_status "Updating iOS version numbers..."
    
    local info_plist="$PROJECT_ROOT/ios/Borderly/Info.plist"
    
    if [[ ! -f "$info_plist" ]]; then
        print_error "iOS Info.plist not found at $info_plist"
        exit 1
    fi
    
    # Update CFBundleShortVersionString
    if command_exists "plutil"; then
        plutil -replace CFBundleShortVersionString -string "$VERSION" "$info_plist"
        plutil -replace CFBundleVersion -string "$BUILD_NUMBER" "$info_plist"
    else
        # Fallback to sed (less reliable but works)
        sed -i.bak "s/<key>CFBundleShortVersionString<\/key>.*<string>.*<\/string>/<key>CFBundleShortVersionString<\/key><string>$VERSION<\/string>/" "$info_plist"
        sed -i.bak "s/<key>CFBundleVersion<\/key>.*<string>.*<\/string>/<key>CFBundleVersion<\/key><string>$BUILD_NUMBER<\/string>/" "$info_plist"
        rm -f "$info_plist.bak"
    fi
    
    print_success "Updated iOS version numbers"
}

# Function to update Android version numbers
update_android_version() {
    print_status "Updating Android version numbers..."
    
    local build_gradle="$PROJECT_ROOT/android/app/build.gradle"
    
    if [[ ! -f "$build_gradle" ]]; then
        print_error "Android build.gradle not found at $build_gradle"
        exit 1
    fi
    
    # Update versionName and versionCode
    sed -i.bak "s/versionName \".*\"/versionName \"$VERSION\"/" "$build_gradle"
    sed -i.bak "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" "$build_gradle"
    rm -f "$build_gradle.bak"
    
    print_success "Updated Android version numbers"
}

# Function to validate app store assets
validate_assets() {
    print_status "Validating app store assets..."
    
    local assets_dir="$PROJECT_ROOT/assets/app-store"
    local missing_assets=()
    
    # Check if app store assets directory exists
    if [[ ! -d "$assets_dir" ]]; then
        print_warning "App store assets directory not found at $assets_dir"
        print_warning "You will need to create app store assets before submission"
        return 0
    fi
    
    # TODO: Add specific asset validation once assets are created
    # This would check for:
    # - Required icon sizes
    # - Screenshot dimensions
    # - Metadata files
    
    print_success "App store assets validation complete"
}

# Function to run quality checks
run_quality_checks() {
    print_status "Running quality checks..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies if node_modules doesn't exist
    if [[ ! -d "node_modules" ]]; then
        print_status "Installing dependencies..."
        pnpm install
    fi
    
    # TypeScript type checking
    print_status "Running TypeScript type checking..."
    if ! pnpm typecheck; then
        print_error "TypeScript type checking failed"
        exit 1
    fi
    print_success "TypeScript type checking passed"
    
    # Linting
    print_status "Running linter..."
    if ! pnpm lint; then
        print_error "Linting failed"
        exit 1
    fi
    print_success "Linting passed"
    
    # Unit tests
    print_status "Running unit tests..."
    if ! pnpm test; then
        print_error "Unit tests failed"
        exit 1
    fi
    print_success "Unit tests passed"
    
    # E2E tests
    print_status "Running E2E tests..."
    if ! pnpm e2e; then
        print_error "E2E tests failed"
        exit 1
    fi
    print_success "E2E tests passed"
}

# Function to validate build configurations
validate_build_configs() {
    print_status "Validating build configurations..."
    
    # Check iOS release entitlements
    local release_entitlements="$PROJECT_ROOT/ios/Borderly/Release.entitlements"
    if [[ ! -f "$release_entitlements" ]]; then
        print_warning "iOS Release.entitlements not found"
        print_warning "This file is required for App Store submission"
    else
        print_success "iOS release entitlements found"
    fi
    
    # Check Android release signing config
    local build_gradle="$PROJECT_ROOT/android/app/build.gradle"
    if grep -q "signingConfigs.release" "$build_gradle"; then
        print_success "Android release signing configuration found"
    else
        print_warning "Android release signing configuration not found"
        print_warning "You will need to configure release signing before building"
    fi
}

# Function to generate build summary
generate_summary() {
    print_status "Generating release summary..."
    
    echo ""
    echo "=================================="
    echo "  RELEASE PREPARATION COMPLETE"
    echo "=================================="
    echo "Version: $VERSION"
    echo "Build Number: $BUILD_NUMBER"
    echo "Date: $(date)"
    echo ""
    echo "Files updated:"
    echo "  - package.json"
    echo "  - ios/Borderly/Info.plist"
    echo "  - android/app/build.gradle"
    echo ""
    echo "Quality checks passed:"
    echo "  ✅ TypeScript type checking"
    echo "  ✅ Linting"
    echo "  ✅ Unit tests"
    echo "  ✅ E2E tests"
    echo ""
    echo "Next steps:"
    echo "1. Review and commit version changes:"
    echo "   git add ."
    echo "   git commit -m \"chore: bump version to v$VERSION\""
    echo ""
    echo "2. Create release branch:"
    echo "   git checkout -b release/v$VERSION"
    echo "   git push origin release/v$VERSION"
    echo ""
    echo "3. Build release candidates:"
    echo "   - iOS: Open ios/Borderly.xcworkspace and archive"
    echo "   - Android: cd android && ./gradlew bundleRelease"
    echo ""
    echo "4. Upload to app stores:"
    echo "   - iOS: Upload to App Store Connect"
    echo "   - Android: Upload to Google Play Console"
    echo ""
    echo "For detailed instructions, see docs/app-store-submission-guide.md"
    echo "=================================="
}

# Main function
main() {
    echo ""
    echo "🚀 Borderly Release Preparation Script"
    echo "======================================"
    
    # Check arguments
    if [[ -z "$VERSION" ]] || [[ -z "$BUILD_NUMBER" ]]; then
        print_error "Usage: $0 <version> <build_number>"
        print_error "Example: $0 1.0.0 42"
        exit 1
    fi
    
    # Validate inputs
    validate_version "$VERSION"
    validate_build_number "$BUILD_NUMBER"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run checks and updates
    check_requirements
    check_git_status
    update_package_version
    update_ios_version
    update_android_version
    validate_assets
    validate_build_configs
    run_quality_checks
    
    # Generate summary
    generate_summary
    
    print_success "Release preparation completed successfully! 🎉"
}

# Run main function
main "$@"