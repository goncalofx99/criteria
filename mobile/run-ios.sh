#!/bin/bash
# Build, install, and launch the iOS app on the booted simulator.
# Use this instead of Xcode's Run button when iOS 26's simulator-launch
# layer is in one of its "Application failed preflight checks" moods.
#
# Usage:
#   ./run-ios.sh                          # use whatever simulator is already booted
#   ./run-ios.sh "iPhone 17 Pro"          # boot a specific simulator first
set -e

cd "$(dirname "$0")/ios/App"

DEVICE_NAME="${1:-}"
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/App-cnjismkmxjtzhxavqqmzbslnnwvr"
APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/App.app"
BUNDLE_ID="com.criteria.app"

# Ensure a simulator is booted
if [ -n "$DEVICE_NAME" ]; then
  echo "Booting $DEVICE_NAME..."
  xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
  open -a Simulator
  sleep 3
elif ! xcrun simctl list devices booted | grep -q "Booted"; then
  echo "No simulator is booted. Boot one in the Simulator app first, or pass a device name."
  exit 1
fi

# Build
echo "Building..."
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -sdk iphonesimulator \
  -configuration Debug \
  build 2>&1 | tail -3

# Install + launch
echo "Reinstalling..."
xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install booted "$APP_PATH"

echo "Launching..."
xcrun simctl launch booted "$BUNDLE_ID"

# Stream logs in foreground (Ctrl+C to exit)
echo ""
echo "Streaming app logs (Ctrl+C to stop)..."
xcrun simctl spawn booted log stream --predicate "subsystem CONTAINS '$BUNDLE_ID' OR processImagePath CONTAINS 'App.app'" --level debug
