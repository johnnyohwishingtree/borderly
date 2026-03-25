# Pattern: Add a Native Dependency

Three mandatory steps. See `.knowledge/conventions/native-modules.md` for details.

## Steps (in order)

### 1. Install
```bash
pnpm add <package>
```

### 2. Web mock
- Create `e2e/mocks/<package>.js` with no-op exports
- Add alias in `webpack.config.js`: `'<package>': path.resolve('./e2e/mocks/<package>.js')`
- Verify: `pnpm e2e`

### 3. iOS linking
```bash
cd ios && pod install
```
- If package needs fonts/assets: register in `ios/Borderly/Info.plist` under `UIAppFonts`
- Commit: `Podfile.lock`, `Info.plist`

### 4. Jest mock
- Add mock in `jest.setup.js`

