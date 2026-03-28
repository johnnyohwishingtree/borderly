#!/bin/bash
# Capture screenshot + accessibility tree + app logs at the current moment.
# Usage: scripts/capture-step.sh "step name"
# Example: scripts/capture-step.sh "01-welcome-screen"
#
# Creates: maestro/output/walkthrough/<step-name>/
#   - screenshot.png
#   - accessibility-tree.txt (all testIDs + labels visible on screen)
#   - app-logs.txt (last 30s of app logs)

STEP_NAME="${1:-$(date +%H%M%S)}"
OUT_DIR="maestro/output/walkthrough/${STEP_NAME}"
mkdir -p "$OUT_DIR"

# 1. Screenshot
xcrun simctl io booted screenshot "$OUT_DIR/screenshot.png" 2>/dev/null
echo "📸 Screenshot saved"

# 2. Accessibility tree (what Maestro sees)
# Use Maestro's hierarchy dump via the test driver
python3 -c "
import subprocess, json, re

# Get the hierarchy from Maestro's XCTest driver
try:
    result = subprocess.run(
        ['xcrun', 'simctl', 'spawn', 'booted', 'log', 'show', '--last', '5s',
         '--predicate', 'process == \"Borderly\"'],
        capture_output=True, text=True, timeout=5
    )
    # Extract accessibility info from recent queries
    lines = result.stdout.split('\n')
    print(f'App log lines: {len(lines)}')
except Exception as e:
    print(f'Log error: {e}')
" 2>/dev/null

# Get accessibility tree via simctl
xcrun simctl ui booted accessibility 2>/dev/null > "$OUT_DIR/accessibility-tree.txt" || \
  # Fallback: try Maestro's hierarchy endpoint
  curl -s http://localhost:7001/api/viewHierarchy 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    def extract(node, depth=0):
        attrs = node.get('attributes', {})
        rid = attrs.get('resource-id', '')
        label = attrs.get('accessibilityText', '')
        bounds = attrs.get('bounds', '')
        if rid or label:
            indent = '  ' * depth
            parts = []
            if rid: parts.append(f'testID={rid}')
            if label: parts.append(f'label=\"{label}\"')
            if bounds: parts.append(f'bounds={bounds}')
            print(f'{indent}' + ' '.join(parts))
        for child in node.get('children', []):
            extract(child, depth + 1)
    extract(data)
except:
    print('(no accessibility data available)')
" > "$OUT_DIR/accessibility-tree.txt" 2>/dev/null
echo "🌳 Accessibility tree saved"

# 3. App logs (last 30s)
xcrun simctl spawn booted log show --last 30s \
  --predicate 'process == "Borderly"' 2>/dev/null \
  | grep -v "XCTAutomation\|CFNetwork\|error: (null)" \
  | tail -30 \
  > "$OUT_DIR/app-logs.txt"
echo "📋 App logs saved"

echo ""
echo "Saved to: $OUT_DIR/"
echo "  screenshot.png"
echo "  accessibility-tree.txt"
echo "  app-logs.txt"
