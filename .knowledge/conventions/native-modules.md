# Native Module Conventions

## Adding a native dependency — three mandatory steps

1. **Web mock**: Create mock in `e2e/mocks/`, add alias in `webpack.config.js`, verify `pnpm e2e` passes. Native modules crash at runtime in the browser — webpack won't catch this at build time.

2. **iOS linking**: Run `cd ios && pod install`. If the package requires fonts/assets (e.g., `react-native-vector-icons`), register in `ios/Borderly/Info.plist` under `UIAppFonts`. Commit `Podfile.lock` and `Info.plist`.

3. **Jest mock**: Add mock in `jest.setup.js`. Understand this hides real import failures — Metro bundle check is the safety net.

## React version
Never bump `react` independently of `react-native`. RN pins a specific React version via `react-native-renderer`. Check `node_modules/react-native/package.json` peerDependencies. Mismatches cause runtime crashes.

## Other rules
- Never use `|| true` to silence quality checks
- `react-native-mmkv` v3.x requires `newArchEnabled=true`

## Known gaps
