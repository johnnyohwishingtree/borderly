#!/bin/bash
set -euo pipefail

# Borderly Google Play Console Deployment Script
# Automatically uploads Android builds to Google Play Console using Google Play Developer API

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
AAB_PATH=""
PACKAGE_NAME=""
SERVICE_ACCOUNT_KEY=""
TRACK="internal"
RELEASE_NAME=""
RELEASE_NOTES=""
VERSION_CODE=""
ROLLOUT_PERCENTAGE=""
OBBS=""
MAPPING_FILE=""

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

Deploy Android builds to Google Play Console using Play Developer API

Options:
    -a, --aab PATH              Path to AAB file
    -p, --package-name NAME     Android package name (e.g., com.borderly.app)
    -k, --service-key PATH      Path to service account JSON key file
    -t, --track TRACK           Release track: internal|alpha|beta|production (default: internal)
    -n, --release-name NAME     Release name (defaults to version name)
    -r, --release-notes TEXT    Release notes for this version
    -v, --version-code CODE     Version code (extracted from AAB if not provided)
    --rollout-percentage PCT    Staged rollout percentage (1-100, production only)
    --obbs PATHS               Comma-separated list of OBB file paths (optional)
    --mapping-file PATH         ProGuard mapping file path (for crash reporting)
    -h, --help                  Show this help message

Environment Variables:
    PLAY_PACKAGE_NAME          Android package name
    PLAY_SERVICE_ACCOUNT_KEY   Path to service account JSON key
    PLAY_TRACK                Default track (internal|alpha|beta|production)

Tracks:
    internal    - Internal testing (closed testing, up to 100 testers)
    alpha       - Alpha testing (closed testing, up to 100 testers)  
    beta        - Beta testing (open testing, unlimited testers)
    production  - Production release (all users)

Examples:
    $0 -a build/app-release.aab -p com.borderly.app -k service-account.json
    $0 -a build/app-release.aab -t beta -r "New features and bug fixes"
    $0 -a build/app-release.aab -t production --rollout-percentage 10
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--aab)
                AAB_PATH="$2"
                shift 2
                ;;
            -p|--package-name)
                PACKAGE_NAME="$2"
                shift 2
                ;;
            -k|--service-key)
                SERVICE_ACCOUNT_KEY="$2"
                shift 2
                ;;
            -t|--track)
                TRACK="$2"
                shift 2
                ;;
            -n|--release-name)
                RELEASE_NAME="$2"
                shift 2
                ;;
            -r|--release-notes)
                RELEASE_NOTES="$2"
                shift 2
                ;;
            -v|--version-code)
                VERSION_CODE="$2"
                shift 2
                ;;
            --rollout-percentage)
                ROLLOUT_PERCENTAGE="$2"
                shift 2
                ;;
            --obbs)
                OBBS="$2"
                shift 2
                ;;
            --mapping-file)
                MAPPING_FILE="$2"
                shift 2
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
    PACKAGE_NAME="${PACKAGE_NAME:-$PLAY_PACKAGE_NAME}"
    SERVICE_ACCOUNT_KEY="${SERVICE_ACCOUNT_KEY:-$PLAY_SERVICE_ACCOUNT_KEY}"
    TRACK="${TRACK:-${PLAY_TRACK:-internal}}"

    # Validate required parameters
    if [[ -z "$AAB_PATH" ]]; then
        error "AAB path is required. Use -a or --aab"
    fi

    if [[ ! -f "$AAB_PATH" ]]; then
        error "AAB file not found: $AAB_PATH"
    fi

    if [[ -z "$PACKAGE_NAME" ]]; then
        error "Package name is required. Use -p or --package-name or set PLAY_PACKAGE_NAME"
    fi

    if [[ -z "$SERVICE_ACCOUNT_KEY" ]]; then
        error "Service account key is required. Use -k or --service-key or set PLAY_SERVICE_ACCOUNT_KEY"
    fi

    if [[ ! -f "$SERVICE_ACCOUNT_KEY" ]]; then
        error "Service account key file not found: $SERVICE_ACCOUNT_KEY"
    fi

    # Validate track
    case "$TRACK" in
        internal|alpha|beta|production) ;;
        *) error "Invalid track: $TRACK. Must be: internal|alpha|beta|production" ;;
    esac

    # Validate rollout percentage
    if [[ -n "$ROLLOUT_PERCENTAGE" ]]; then
        if [[ "$TRACK" != "production" ]]; then
            error "Rollout percentage is only supported for production track"
        fi
        if [[ ! "$ROLLOUT_PERCENTAGE" =~ ^[0-9]+$ ]] || [[ "$ROLLOUT_PERCENTAGE" -lt 1 || "$ROLLOUT_PERCENTAGE" -gt 100 ]]; then
            error "Rollout percentage must be between 1 and 100"
        fi
    fi

    # Validate optional files
    if [[ -n "$MAPPING_FILE" && ! -f "$MAPPING_FILE" ]]; then
        error "Mapping file not found: $MAPPING_FILE"
    fi

    if [[ -n "$OBBS" ]]; then
        IFS=',' read -ra OBB_ARRAY <<< "$OBBS"
        for obb in "${OBB_ARRAY[@]}"; do
            if [[ ! -f "$obb" ]]; then
                error "OBB file not found: $obb"
            fi
        done
    fi
}

check_dependencies() {
    log "Checking dependencies..."

    # Check if Google Play Console API tools are available
    command -v python3 >/dev/null 2>&1 || error "Python 3 is required"

    # Check if we have googleapiclient
    python3 -c "import googleapiclient" 2>/dev/null || {
        warn "Google API Client not found, installing..."
        pip3 install --user google-api-python-client google-auth-httplib2 google-auth-oauthlib
    }

    success "Dependencies check passed"
}

extract_version_info() {
    if [[ -n "$VERSION_CODE" ]]; then
        log "Using provided version code: $VERSION_CODE"
        return 0
    fi

    log "Extracting version information from AAB..."

    # Use aapt2 to extract version info (requires Android SDK)
    if command -v aapt2 >/dev/null 2>&1; then
        VERSION_CODE=$(aapt2 dump badging "$AAB_PATH" | grep versionCode | sed -n "s/.*versionCode='\([^']*\)'.*/\1/p")
        local version_name=$(aapt2 dump badging "$AAB_PATH" | grep versionName | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")
        
        if [[ -n "$VERSION_CODE" ]]; then
            log "Extracted version code: $VERSION_CODE"
            if [[ -z "$RELEASE_NAME" ]]; then
                RELEASE_NAME="$version_name"
                log "Using version name as release name: $RELEASE_NAME"
            fi
        else
            error "Could not extract version code from AAB"
        fi
    else
        error "aapt2 not found. Install Android SDK or provide --version-code"
    fi
}

create_upload_script() {
    log "Creating Python upload script..."

    cat > "/tmp/play_upload.py" << 'EOF'
#!/usr/bin/env python3

import sys
import os
import argparse
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.auth.transport.requests import Request
from google.oauth2 import service_account

def authenticate(service_account_file):
    """Authenticate with Google Play Console API"""
    SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
    
    credentials = service_account.Credentials.from_service_account_file(
        service_account_file, scopes=SCOPES)
    
    return build('androidpublisher', 'v3', credentials=credentials)

def upload_aab(service, package_name, aab_path, track, release_name, release_notes, version_code, rollout_percentage=None, mapping_file=None):
    """Upload AAB to Google Play Console"""
    
    try:
        # Create an edit
        edit_request = service.edits().insert(body={}, packageName=package_name)
        edit_result = edit_request.execute()
        edit_id = edit_result['id']
        
        print(f"Created edit with ID: {edit_id}")
        
        # Upload the AAB
        media = MediaFileUpload(aab_path, mimetype='application/octet-stream', resumable=True)
        bundle_response = service.edits().bundles().upload(
            editId=edit_id,
            packageName=package_name,
            media_body=media
        ).execute()
        
        version_code_from_upload = bundle_response['versionCode']
        print(f"Uploaded AAB with version code: {version_code_from_upload}")
        
        # Upload mapping file if provided
        if mapping_file and os.path.exists(mapping_file):
            print(f"Uploading mapping file: {mapping_file}")
            mapping_media = MediaFileUpload(mapping_file, mimetype='application/octet-stream')
            service.edits().deobfuscationfiles().upload(
                editId=edit_id,
                packageName=package_name,
                apkVersionCode=version_code_from_upload,
                deobfuscationFileType='proguard',
                media_body=mapping_media
            ).execute()
            print("Mapping file uploaded successfully")
        
        # Create release
        release_body = {
            'versionCodes': [version_code_from_upload],
            'status': 'completed'
        }
        
        if release_name:
            release_body['name'] = release_name
            
        if release_notes:
            release_body['releaseNotes'] = [
                {
                    'language': 'en-US',
                    'text': release_notes
                }
            ]
        
        # For production track with rollout
        if track == 'production' and rollout_percentage:
            release_body['status'] = 'inProgress'
            release_body['userFraction'] = rollout_percentage / 100.0
        
        # Create track release
        track_response = service.edits().tracks().update(
            editId=edit_id,
            track=track,
            packageName=package_name,
            body={'releases': [release_body]}
        ).execute()
        
        print(f"Created release on track: {track}")
        
        # Commit the edit
        commit_response = service.edits().commit(
            editId=edit_id,
            packageName=package_name
        ).execute()
        
        print(f"Edit committed successfully: {commit_response['id']}")
        
        return {
            'success': True,
            'edit_id': edit_id,
            'version_code': version_code_from_upload,
            'track': track
        }
        
    except Exception as e:
        print(f"Error during upload: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    parser = argparse.ArgumentParser(description='Upload AAB to Google Play Console')
    parser.add_argument('--service-key', required=True, help='Service account JSON key file')
    parser.add_argument('--package-name', required=True, help='Android package name')
    parser.add_argument('--aab-path', required=True, help='Path to AAB file')
    parser.add_argument('--track', default='internal', help='Release track')
    parser.add_argument('--release-name', help='Release name')
    parser.add_argument('--release-notes', help='Release notes')
    parser.add_argument('--version-code', type=int, help='Version code')
    parser.add_argument('--rollout-percentage', type=int, help='Rollout percentage (1-100)')
    parser.add_argument('--mapping-file', help='ProGuard mapping file path')
    
    args = parser.parse_args()
    
    # Authenticate
    service = authenticate(args.service_key)
    
    # Upload
    result = upload_aab(
        service=service,
        package_name=args.package_name,
        aab_path=args.aab_path,
        track=args.track,
        release_name=args.release_name,
        release_notes=args.release_notes,
        version_code=args.version_code,
        rollout_percentage=args.rollout_percentage,
        mapping_file=args.mapping_file
    )
    
    if result['success']:
        print("Upload completed successfully!")
        print(f"Version code: {result['version_code']}")
        print(f"Track: {result['track']}")
    else:
        print(f"Upload failed: {result['error']}")
        sys.exit(1)

if __name__ == '__main__':
    main()
EOF

    chmod +x "/tmp/play_upload.py"
}

upload_to_play_console() {
    log "Uploading to Google Play Console..."

    create_upload_script

    # Build upload command
    local upload_cmd="python3 /tmp/play_upload.py"
    upload_cmd="$upload_cmd --service-key \"$SERVICE_ACCOUNT_KEY\""
    upload_cmd="$upload_cmd --package-name \"$PACKAGE_NAME\""
    upload_cmd="$upload_cmd --aab-path \"$AAB_PATH\""
    upload_cmd="$upload_cmd --track \"$TRACK\""

    if [[ -n "$RELEASE_NAME" ]]; then
        upload_cmd="$upload_cmd --release-name \"$RELEASE_NAME\""
    fi

    if [[ -n "$RELEASE_NOTES" ]]; then
        upload_cmd="$upload_cmd --release-notes \"$RELEASE_NOTES\""
    fi

    if [[ -n "$VERSION_CODE" ]]; then
        upload_cmd="$upload_cmd --version-code $VERSION_CODE"
    fi

    if [[ -n "$ROLLOUT_PERCENTAGE" ]]; then
        upload_cmd="$upload_cmd --rollout-percentage $ROLLOUT_PERCENTAGE"
    fi

    if [[ -n "$MAPPING_FILE" ]]; then
        upload_cmd="$upload_cmd --mapping-file \"$MAPPING_FILE\""
    fi

    log "Executing upload..."
    eval "$upload_cmd" || error "Upload to Google Play Console failed"

    success "Upload completed successfully!"
}

generate_deployment_summary() {
    log "Generating deployment summary..."

    local summary_file="$PROJECT_ROOT/play-console-deployment.md"
    local aab_size=$(du -h "$AAB_PATH" | cut -f1)
    
    cat > "$summary_file" << EOF
# Google Play Console Deployment Summary

**Deployment Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')  
**AAB File:** $(basename "$AAB_PATH") ($aab_size)  
**Package Name:** $PACKAGE_NAME  
**Track:** $TRACK  
**Version Code:** ${VERSION_CODE:-"Auto-extracted"}  

## Status
✅ Upload completed successfully

## Release Configuration
EOF

    if [[ -n "$RELEASE_NAME" ]]; then
        echo "**Release Name:** $RELEASE_NAME" >> "$summary_file"
    fi

    if [[ -n "$RELEASE_NOTES" ]]; then
        echo "**Release Notes:** $RELEASE_NOTES" >> "$summary_file"
    fi

    if [[ -n "$ROLLOUT_PERCENTAGE" ]]; then
        echo "**Rollout:** Staged rollout at $ROLLOUT_PERCENTAGE%" >> "$summary_file"
    fi

    cat >> "$summary_file" << EOF

## Next Steps

### For Internal/Alpha/Beta Testing
1. The app is now available for testing on the **$TRACK** track
2. Add testers to the testing group in Play Console
3. Testers will receive notification or can access via Play Store link
4. Monitor crash reports and feedback

### For Production Releases
1. Monitor the release for any critical issues
2. If using staged rollout, gradually increase percentage
3. Promote to 100% rollout once stable
4. Update store listing and metadata as needed

## Track Information

- **internal**: Closed testing up to 100 internal testers
- **alpha**: Closed testing up to 100 alpha testers  
- **beta**: Open testing with unlimited testers
- **production**: Live on Google Play Store

## Useful Commands
\`\`\`bash
# Check release status
# (View in Play Console or use API)

# Upload additional artifacts
$0 --mapping-file proguard-mapping.txt

# Deploy to next track
$0 -t beta -r "Ready for wider testing"
\`\`\`

## Troubleshooting
- Check Play Console for any review issues
- Ensure all required store listing information is complete
- Monitor for any post-deployment crashes or ANRs
- Verify release notes and metadata are correct
EOF

    success "Deployment summary: $summary_file"
    cat "$summary_file"
}

main() {
    log "Starting Google Play Console deployment..."
    log "Track: $TRACK, Package: $PACKAGE_NAME"
    
    check_dependencies
    extract_version_info
    upload_to_play_console
    generate_deployment_summary
    
    success "Google Play Console deployment completed! 🚀"
    log "Check Play Console for release status and testing setup"
}

# Parse arguments and run
parse_args "$@"
main