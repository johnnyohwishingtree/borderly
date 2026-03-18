/**
 * Verification checks — TypeScript port of verify-checks.sh.
 *
 * Runs lint, typecheck, metro bundle, unit tests, and native dependency checks.
 * Returns structured JSON output.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

export interface CheckResult {
  pass: boolean;
  errors: string;
}

export interface VerifyChecksOutput {
  pass: boolean;
  checks: {
    lint: CheckResult;
    typecheck: CheckResult;
    bundle: CheckResult;
    test: CheckResult;
    native_deps: CheckResult;
  };
  summary: string;
}

export interface VerifyChecksOptions {
  lintOnlyChanged?: boolean;
  failFast?: boolean;
  skipNative?: boolean;
}

function runCmd(cmd: string): { stdout: string; success: boolean } {
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { stdout, success: true };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    return { stdout: (error.stdout ?? '') + (error.stderr ?? ''), success: false };
  }
}

function progress(msg: string): void {
  console.error(msg);
}

export function runVerifyChecks(opts: VerifyChecksOptions = {}): VerifyChecksOutput {
  let overallPass = true;
  let summary = '';
  const checks: VerifyChecksOutput['checks'] = {
    lint: { pass: true, errors: '' },
    typecheck: { pass: true, errors: '' },
    bundle: { pass: true, errors: '' },
    test: { pass: true, errors: '' },
    native_deps: { pass: true, errors: '' },
  };

  function recordFailure(check: keyof typeof checks, errors: string, label: string): void {
    overallPass = false;
    checks[check] = { pass: false, errors };
    summary += `\n${label}:\n${errors}`;
  }

  function shouldSkip(): boolean {
    return opts.failFast === true && !overallPass;
  }

  // === Lint ===
  progress('=== Lint ===');
  if (opts.lintOnlyChanged) {
    const { stdout: changedFiles } = runCmd(
      "git diff --name-only origin/master...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null | grep -v node_modules || true"
    );
    if (changedFiles.trim()) {
      const fileCount = changedFiles.trim().split('\n').length;
      progress(`Linting ${fileCount} changed files`);
      const { stdout: lintOut } = runCmd(
        `echo "${changedFiles.trim()}" | xargs -d '\\n' npx eslint --quiet 2>&1`
      );
      if (/error /.test(lintOut)) {
        progress('Lint FAILED');
        const errors = lintOut.split('\n').filter((l) => /error /.test(l)).slice(0, 10).join('\n');
        recordFailure('lint', errors, 'LINT ERRORS');
      } else {
        progress('Lint passed');
      }
    } else {
      progress('No changed JS/TS files to lint');
    }
  } else {
    progress('Linting all files');
    const { stdout: lintOut } = runCmd('npx eslint . --quiet 2>&1');
    if (/error /.test(lintOut)) {
      progress('Lint FAILED');
      const errors = lintOut.split('\n').filter((l) => /error /.test(l)).slice(0, 10).join('\n');
      recordFailure('lint', errors, 'LINT ERRORS');
    } else {
      progress('Lint passed');
    }
  }

  // === Typecheck ===
  progress('=== Typecheck ===');
  if (!shouldSkip()) {
    const { stdout: tcOut } = runCmd('pnpm typecheck 2>&1');
    if (/error TS/.test(tcOut)) {
      progress('Typecheck FAILED');
      const errors = tcOut.split('\n').filter((l) => /error TS/.test(l)).slice(0, 10).join('\n');
      recordFailure('typecheck', errors, 'TYPECHECK ERRORS');
    } else {
      progress('Typecheck passed');
    }
  }

  // === Metro Bundle ===
  progress('=== Metro Bundle ===');
  if (!shouldSkip()) {
    for (const [platform, output] of [['ios', '/tmp/bundle.js'], ['android', '/tmp/android-bundle.js']] as const) {
      progress(`=== Metro Bundle (${platform.toUpperCase()}) ===`);
      const { stdout: bundleOut } = runCmd(
        `npx react-native bundle --platform ${platform} --dev false --entry-file index.js --bundle-output ${output} 2>&1`
      );
      if (/error|unable to resolve/i.test(bundleOut)) {
        progress(`Metro Bundle (${platform.toUpperCase()}) FAILED`);
        const errors = bundleOut.split('\n').filter((l) => /error|unable to resolve/i.test(l)).slice(0, 5).join('\n');
        recordFailure('bundle', errors, `BUNDLE ERRORS (${platform.toUpperCase()})`);
        if (opts.failFast) break;
      } else {
        progress(`Metro Bundle (${platform.toUpperCase()}) passed`);
      }
    }
  }

  // === Tests ===
  progress('=== Tests ===');
  if (!shouldSkip()) {
    const { stdout: testOut } = runCmd('pnpm test 2>&1');
    if (/FAIL /.test(testOut)) {
      progress('Tests FAILED');
      const errors = testOut.split('\n')
        .filter((l) => /FAIL |● |Expected|Received/.test(l) && !/● Console/.test(l))
        .slice(0, 20).join('\n');
      recordFailure('test', errors, 'TEST FAILURES');
    } else {
      progress('Tests passed');
    }
  }

  // === Native Dependency Check ===
  progress('=== Native Dependency Check ===');
  if (!opts.skipNative && !shouldSkip()) {
    try {
      const pkgJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
      const nativePkgs = Object.keys(allDeps).filter(
        (d) => d.startsWith('react-native-') || d.startsWith('@react-native-')
      );

      const missing: string[] = [];
      const podfileLock = existsSync('ios/Podfile.lock')
        ? readFileSync('ios/Podfile.lock', 'utf-8')
        : '';

      for (const pkg of nativePkgs) {
        if (/[^a-zA-Z0-9@/._-]/.test(pkg)) continue;
        const pkgDir = `node_modules/${pkg}`;
        if (!existsSync(pkgDir)) continue;

        const hasNative = existsSync(`${pkgDir}/ios`) ||
          runCmd(`ls ${pkgDir}/*.podspec 2>/dev/null`).success;

        if (hasNative && !podfileLock.includes(`node_modules/${pkg}`)) {
          missing.push(pkg);
        }
      }

      if (missing.length > 0) {
        progress('Native Dependency Check FAILED');
        const errors = missing.map((m) =>
          `UNLINKED: ${m} is in package.json with native iOS code but missing from ios/Podfile.lock`
        ).join('\n');
        recordFailure('native_deps', errors, 'NATIVE DEP ERRORS');
      } else {
        progress('Native Dependency Check passed');
      }
    } catch {
      progress('Native Dependency Check skipped (no package.json or Podfile.lock)');
    }
  }

  return { pass: overallPass, checks, summary: summary.trim() };
}
