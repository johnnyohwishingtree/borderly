# No Snapshot Files

Do NOT use `toMatchSnapshot()` in tests. It creates separate `.snap` files that fail in CI (`jest --ci` won't auto-create them).

Instead use `toMatchInlineSnapshot()` which embeds the snapshot directly in the test file — no separate file needed, no CI issues.

If the snapshot content is too large for inline, don't use snapshots at all. Assert on specific properties instead (e.g., check that the output contains expected keys/values).

Existing `.snap` files should be migrated to inline snapshots or replaced with explicit assertions when touched.
