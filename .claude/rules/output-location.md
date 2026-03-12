# Output Location

All command output (screenshots, logs, test artifacts, temp files) MUST be written inside the project root directory or its subdirectories.

- Maestro test output: use `--output` flag to write to `maestro/output/`
- Screenshots: save to `maestro/output/` or `tmp/` within the project
- Any temp files: use the project's `tmp/` directory, not `/tmp/` or `~/.maestro/`

Never write output to locations outside the project folder. If a tool defaults to an external path, override it with a project-local path.
