#!/bin/bash
# Diagnose a Maestro test failure.
# Collects: screenshot, app logs, accessibility tree, failing step, and source context.
#
# Usage:
#   scripts/diagnose-maestro.sh                    # Latest failure
#   scripts/diagnose-maestro.sh /path/to/test/dir  # Specific failure

set -e

# Find latest test directory
if [ -n "$1" ]; then
  TEST_DIR="$1"
else
  TEST_DIR=$(ls -td ~/.maestro/tests/*/ 2>/dev/null | head -1)
fi

if [ -z "$TEST_DIR" ] || [ ! -d "$TEST_DIR" ]; then
  echo "No Maestro test results found."
  exit 1
fi

echo "=== MAESTRO FAILURE DIAGNOSIS ==="
echo "Test dir: $TEST_DIR"
echo ""

# 1. Screenshot
SCREENSHOT=$(ls "$TEST_DIR"/screenshot-*.png 2>/dev/null | head -1)
if [ -n "$SCREENSHOT" ]; then
  # Copy to project for easy access
  cp "$SCREENSHOT" maestro/output/last-failure.png 2>/dev/null
  echo "📸 Screenshot: maestro/output/last-failure.png"
else
  echo "📸 Screenshot: none"
fi
echo ""

# 2. Failing step from commands JSON
COMMANDS_FILE=$(ls "$TEST_DIR"/commands-*.json 2>/dev/null | head -1)
if [ -n "$COMMANDS_FILE" ]; then
  echo "❌ Failing step:"
  python3 -c "
import json
with open('$COMMANDS_FILE') as f:
    cmds = json.load(f)
for cmd in cmds:
    meta = cmd.get('metadata', {})
    if meta.get('status') == 'FAILED':
        c = cmd.get('command', {})
        for key, val in c.items():
            if isinstance(val, dict):
                print(f'  Type: {key}')
                for k, v in val.items():
                    if v and str(v).strip():
                        print(f'    {k}: {v}')
                break
        err = meta.get('error', {})
        if isinstance(err, dict):
            print(f'  Error: {err.get(\"message\", \"unknown\")}')
            # Extract testIDs from accessibility tree
            root = err.get('hierarchyRoot', {})
            def find_ids(node, ids=[]):
                attrs = node.get('attributes', {})
                rid = attrs.get('resource-id', '')
                label = attrs.get('accessibilityText', '')
                if rid:
                    ids.append(f'{rid} ({label})')
                for child in node.get('children', []):
                    find_ids(child, ids)
                return ids
            ids = find_ids(root)
            if ids:
                print(f'  Visible testIDs: {len(ids)}')
                for tid in ids[:15]:
                    print(f'    - {tid}')
                if len(ids) > 15:
                    print(f'    ... and {len(ids)-15} more')
        elif err:
            print(f'  Error: {err}')
        break
else:
    print('  No FAILED step found (test may have passed)')
" 2>/dev/null || echo "  (could not parse commands JSON)"
else
  echo "❌ Failing step: unknown (no commands JSON)"
fi
echo ""

# 3. App logs (JS errors, navigation, keychain)
echo "📋 App logs (last 2 min):"
xcrun simctl spawn booted log show --last 2m --predicate 'process == "Borderly"' 2>/dev/null \
  | grep -i "error\|exception\|fail\|navigate\|keychain\|entitlement" \
  | grep -v "XCTAutomationSupport\|CFNetwork\|error: (null)" \
  | tail -10 \
  || echo "  (no simulator logs available)"
echo ""

# 4. Accessibility tree snapshot (what Maestro sees)
echo "🌳 Accessibility tree (interactive elements):"
xcrun simctl spawn booted log show --last 30s --predicate 'process == "Borderly" AND category == "Default"' 2>/dev/null \
  | grep -i "accessibility\|testID\|label\|identifier" \
  | tail -10 \
  || echo "  (run 'xcrun simctl accessibility booted' for full tree)"
echo ""

# 5. AI analysis prompt
echo "📝 AI report from Maestro:"
AI_REPORT=$(ls "$TEST_DIR"/ai-report-*.html 2>/dev/null | head -1)
if [ -n "$AI_REPORT" ]; then
  # Extract text from HTML
  sed 's/<[^>]*>//g' "$AI_REPORT" | head -20
else
  echo "  (no AI report)"
fi
echo ""

echo "=== QUICK CHECKS ==="
echo "• Is the app installed? $(xcrun simctl listapps booted 2>/dev/null | grep -c borderly) match(es)"
echo "• Simulator booted? $(xcrun simctl list devices booted 2>/dev/null | grep -c Booted) device(s)"
echo "• Metro running? $(pgrep -c metro 2>/dev/null || echo 0) process(es)"
echo ""
echo "=== DONE ==="
