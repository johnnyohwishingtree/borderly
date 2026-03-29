# Fact: iOS Simulator Screen Geometry

The E2E test target simulator (iPhone 17 Pro) has specific screen geometry that affects coordinate-based taps:

- **Screen size**: 402 x 874 points
- **SafeAreaView top inset**: ~59px (status bar + dynamic island)
- **Tab bar top**: ~790px

These values change with different device models. When switching simulators, verify with `mobile_get_screen_size` and update this fact.
