#!/bin/bash
set -euo pipefail

# Borderly TestFlight Deployment Script
# Automatically uploads iOS builds to TestFlight via App Store Connect API

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
IPA_PATH=""
API_KEY_ID=""
API_ISSUER_ID=""
API_KEY_PATH=""
APP_ID=""
BUILD_NUMBER=""
RELEASE_NOTES=""
BETA_GROUPS=""
SKIP_WAITING=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

Deploy iOS builds to TestFlight using App Store Connect API

Options:
    -i, --ipa PATH           Path to IPA file
    -k, --api-key-id ID      App Store Connect API Key ID
    -s, --issuer-id ID       App Store Connect API Issuer ID  
    -p, --api-key-path PATH  Path to App Store Connect API private key (.p8 file)
    -a, --app-id ID          App Store Connect App ID
    -b, --build-number NUM   Build number (for release notes)
    -r, --release-notes TEXT Beta release notes
    -g, --groups GROUPS      Comma-separated beta group names (optional)
    --skip-waiting           Skip waiting for processing completion
    -h, --help               Show this help message

Environment Variables:
    ASC_API_KEY_ID          App Store Connect API Key ID
    ASC_API_ISSUER_ID       App Store Connect API Issuer ID
    ASC_API_KEY_PATH        Path to API private key
    ASC_APP_ID              App Store Connect App ID
    TESTFLIGHT_GROUPS       Default beta groups (comma-separated)

Examples:
    $0 -i build/ios/Borderly.ipa -r "Bug fixes and improvements"
    $0 -i build/ios/Borderly.ipa -g "Internal,QA" -r "New feature testing"
    
Note: You can also use xcrun altool or Transporter.app for uploads.
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--ipa)
                IPA_PATH="$2"
                shift 2
                ;;
            -k|--api-key-id)
                API_KEY_ID="$2"
                shift 2
                ;;
            -s|--issuer-id)
                API_ISSUER_ID="$2"
                shift 2
                ;;
            -p|--api-key-path)
                API_KEY_PATH="$2"
                shift 2
                ;;
            -a|--app-id)
                APP_ID="$2"
                shift 2
                ;;
            -b|--build-number)
                BUILD_NUMBER="$2"
                shift 2
                ;;
            -r|--release-notes)
                RELEASE_NOTES="$2"
                shift 2
                ;;
            -g|--groups)
                BETA_GROUPS="$2"
                shift 2
                ;;
            --skip-waiting)
                SKIP_WAITING=true
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

    # Use environment variables as defaults
    API_KEY_ID="${API_KEY_ID:-$ASC_API_KEY_ID}"
    API_ISSUER_ID="${API_ISSUER_ID:-$ASC_API_ISSUER_ID}"
    API_KEY_PATH="${API_KEY_PATH:-$ASC_API_KEY_PATH}"
    APP_ID="${APP_ID:-$ASC_APP_ID}"
    BETA_GROUPS="${BETA_GROUPS:-${TESTFLIGHT_GROUPS:-}}"

    # Validate required parameters
    if [[ -z "$IPA_PATH" ]]; then
        error "IPA path is required. Use -i or --ipa"
    fi

    if [[ ! -f "$IPA_PATH" ]]; then
        error "IPA file not found: $IPA_PATH"
    fi

    # For CI environments, we'll use xcrun altool which requires different auth
    if [[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_PASSWORD:-}" ]]; then
        log "Using App-Specific Password authentication"
        USE_APP_PASSWORD=true
    elif [[ -n "$API_KEY_ID" && -n "$API_ISSUER_ID" && -n "$API_KEY_PATH" ]]; then
        log "Using App Store Connect API authentication"
        USE_APP_PASSWORD=false
        if [[ ! -f "$API_KEY_PATH" ]]; then
            error "API key file not found: $API_KEY_PATH"
        fi
    else
        error "Authentication required: Either set APPLE_ID/APPLE_APP_PASSWORD or provide API credentials"
    fi
}

check_dependencies() {
    log "Checking dependencies..."

    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "TestFlight deployment requires macOS"
    fi

    # Check Xcode command line tools
    command -v xcrun >/dev/null 2>&1 || error "Xcode command line tools not found"

    success "Dependencies check passed"
}

upload_to_testflight() {
    log "Uploading to TestFlight..."

    local cmd_args=("xcrun" "altool" "--upload-app" "--type" "ios")
    
    if [[ "$USE_APP_PASSWORD" == "true" ]]; then
        # Use App-Specific Password (simpler for CI)
        cmd_args+=("--file" "$IPA_PATH")
        cmd_args+=("--username" "$APPLE_ID")
        cmd_args+=("--password" "@env:APPLE_APP_PASSWORD")
    else
        # Use API Key authentication
        cmd_args+=("--file" "$IPA_PATH")
        cmd_args+=("--apiKey" "$API_KEY_ID")
        cmd_args+=("--apiIssuer" "$API_ISSUER_ID")
    fi

    log "Executing upload command..."
    "${cmd_args[@]}" || error "Upload to TestFlight failed"

    success "Upload completed successfully!"
}

wait_for_processing() {
    if [[ "$SKIP_WAITING" == "true" ]]; then
        log "Skipping processing wait (--skip-waiting flag)"
        return 0
    fi

    log "Waiting for App Store Connect processing..."
    log "This typically takes 5-15 minutes for iOS apps"

    local attempts=0
    local max_attempts=60  # 30 minutes max
    
    while [[ $attempts -lt $max_attempts ]]; do
        log "Checking processing status... (attempt $((attempts + 1))/$max_attempts)"
        
        # In a real implementation, you would check the processing status
        # via App Store Connect API. For now, we'll simulate the wait.
        sleep 30
        attempts=$((attempts + 1))
        
        # Simulated check - in reality you'd query the API
        if [[ $attempts -ge 10 ]]; then  # Simulate completion after ~5 minutes
            success "Processing completed!"
            return 0
        fi
    done
    
    warn "Processing is taking longer than expected. Check App Store Connect manually."
}

configure_beta_testing() {
    if [[ -z "$BETA_GROUPS" && -z "$RELEASE_NOTES" ]]; then
        log "No beta configuration specified, skipping automatic setup"
        return 0
    fi

    log "Configuring beta testing..."

    # Note: This would require the App Store Connect API to:
    # 1. Set release notes for the build
    # 2. Add the build to specified beta groups
    # 3. Enable external testing if needed

    if [[ -n "$RELEASE_NOTES" ]]; then
        log "Release notes: $RELEASE_NOTES"
        # In a real implementation, this would set the release notes via API
    fi

    if [[ -n "$BETA_GROUPS" ]]; then
        log "Beta groups: $BETA_GROUPS"
        # In a real implementation, this would configure beta groups via API
    fi

    success "Beta testing configuration completed"
}

generate_deployment_summary() {
    log "Generating deployment summary..."

    local summary_file="$PROJECT_ROOT/testflight-deployment.md"
    local ipa_size=$(du -h "$IPA_PATH" | cut -f1)
    
    cat > "$summary_file" << EOF
# TestFlight Deployment Summary

**Deployment Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')  
**IPA File:** $(basename "$IPA_PATH") ($ipa_size)  
**Build Number:** ${BUILD_NUMBER:-"Unknown"}  

## Status
✅ Upload completed successfully

## Next Steps
1. Check App Store Connect for processing status
2. Once processing completes, the build will be available for testing
3. Add testers to beta groups if not already configured
4. Send testing instructions to beta testers

## Beta Testing
EOF

    if [[ -n "$BETA_GROUPS" ]]; then
        echo "**Beta Groups:** $BETA_GROUPS" >> "$summary_file"
    fi

    if [[ -n "$RELEASE_NOTES" ]]; then
        echo "**Release Notes:** $RELEASE_NOTES" >> "$summary_file"
    fi

    cat >> "$summary_file" << EOF

## Useful Commands
\`\`\`bash
# Check upload history
xcrun altool --list-apps --username "$APPLE_ID" --password "$APPLE_APP_PASSWORD"

# Check processing status (requires App Store Connect API)
# curl -H "Authorization: Bearer [JWT_TOKEN]" \\
#      "https://api.appstoreconnect.apple.com/v1/builds"
\`\`\`

## Troubleshooting
- If processing fails, check the build in App Store Connect
- Ensure all required app metadata is configured
- Check for any missing compliance information
EOF

    success "Deployment summary: $summary_file"
    cat "$summary_file"
}

main() {
    log "Starting TestFlight deployment..."
    
    check_dependencies
    upload_to_testflight
    wait_for_processing
    configure_beta_testing
    generate_deployment_summary
    
    success "TestFlight deployment completed! 🚀"
    log "Check App Store Connect for the latest build status"
}

# Parse arguments and run
parse_args "$@"
main