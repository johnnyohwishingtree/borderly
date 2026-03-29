# mobile-mcp Usage

## Screenshots

1. **NEVER use `take_screenshot`** — it returns a full-res image inline that permanently bloats conversation context.
2. **Always use `save_screenshot`** — saves to disk, only a small text confirmation enters context.
3. Save screenshots to `e2e/screenshots/` within the project.
4. **Naming convention**: `{screen}-{context}.jpg` where:
   - `screen` = screen or page name (e.g., `welcome`, `passport`, `mdac-portal`)
   - `context` = what's notable (e.g., `initial`, `error`, `after-autofill`)
   - Examples: `welcome-initial.jpg`, `mdac-portal-captcha.jpg`, `form-after-autofill.jpg`
   - **Same name = overwrite** — retaking a screenshot of the same screen/context replaces the old one, no accumulation.
5. Only read a saved screenshot when genuinely stuck or verifying an unknown screen state.
6. E2E test screenshots are already 300px wide (resized by MobileDriver) — read them directly.
7. For manual `save_screenshot` via MCP, resize before reading:
   ```
   sips --resampleWidth 300 -s format jpeg --setProperty formatOptions 20 e2e/screenshots/file.jpg --out e2e/screenshots/file.jpg
   ```

## Element Discovery

## Element Discovery

8. **NEVER use `list_elements`** — it dumps hundreds of elements as JSON into context. Element info is already in the source code.
9. Read `testIDs.ts` files and component source to know what elements exist — this is static and cheap.
10. For unknown screens (third-party WebViews, system dialogs), use a resized screenshot instead of element dumps.

## Navigation

11. Read the **source code first** — know what screens, testIDs, and elements exist before touching the simulator.
12. Navigate by element ID or coordinates — don't explore what you already know from code.
13. Batch navigation into one turn — don't screenshot between every tap.
