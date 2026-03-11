# Commit Gate

Before EVERY `git commit`, run these in order:

1. `pnpm lint` — must exit 0
2. `pnpm typecheck` — must exit 0
3. `pnpm test` — must exit 0

If any of these commands fail, DO NOT commit. Fix the errors first.

Never use `git add -A` or `git add .` — always add specific files by name.
Check `git status` before committing to verify only intended files are staged.
Never commit generated files or files listed in `.gitignore`. Examples include `node_modules/`, `ios/Pods/`, `android/build/`.
