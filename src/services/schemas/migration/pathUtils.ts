/**
 * Migration Path Utilities
 *
 * Version comparison, migration path finding (BFS), and sorting
 * utilities used by the SchemaMigrator.
 */

import { SchemaMigration } from '../../../types/schema';

/**
 * Compare two semantic version strings
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (version: string) => {
    const parts = version.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  };

  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }
  return versionA.patch - versionB.patch;
}

/**
 * Sort migrations by their fromVersion
 */
export function sortMigrationsByVersion(migrations: SchemaMigration[]): SchemaMigration[] {
  return migrations.slice().sort((a, b) => {
    return compareVersions(a.fromVersion, b.fromVersion);
  });
}

/**
 * Find the shortest path of migrations from source to target version using BFS
 */
export function findMigrationPath(
  sourceVersion: string,
  targetVersion: string,
  migrations: SchemaMigration[]
): SchemaMigration[] {
  if (sourceVersion === targetVersion) {
    return [];
  }

  // Build a graph of migrations
  const graph = new Map<string, SchemaMigration[]>();

  for (const migration of migrations) {
    if (!graph.has(migration.fromVersion)) {
      graph.set(migration.fromVersion, []);
    }
    graph.get(migration.fromVersion)!.push(migration);
  }

  // Use breadth-first search to find the shortest path
  const queue: { version: string; path: SchemaMigration[] }[] = [
    { version: sourceVersion, path: [] }
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { version, path } = queue.shift()!;

    if (visited.has(version)) {
      continue;
    }
    visited.add(version);

    if (version === targetVersion) {
      return path;
    }

    const availableMigrations = graph.get(version) || [];
    for (const migration of availableMigrations) {
      if (!visited.has(migration.toVersion)) {
        queue.push({
          version: migration.toVersion,
          path: [...path, migration]
        });
      }
    }
  }

  // No path found
  throw new Error(`No migration path found from ${sourceVersion} to ${targetVersion}`);
}

/**
 * Navigate to the parent object of a dot-separated path
 */
export function navigateToParent(obj: any, pathParts: string[]): any {
  let current = obj;

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];

    if (Array.isArray(current) && !isNaN(Number(part))) {
      current = current[Number(part)];
    } else if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Get a value at a specific dot-separated path
 */
export function getValueAtPath(obj: any, path: string): any {
  const pathParts = path.split('.');
  let current = obj;

  for (const part of pathParts) {
    if (Array.isArray(current) && !isNaN(Number(part))) {
      current = current[Number(part)];
    } else if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Set a value at a specific dot-separated path
 */
export function setValueAtPath(obj: any, path: string, value: any): void {
  const pathParts = path.split('.');
  const target = navigateToParent(obj, pathParts);
  const fieldName = pathParts[pathParts.length - 1];

  if (target && typeof target === 'object') {
    if (Array.isArray(target) && !isNaN(Number(fieldName))) {
      target[Number(fieldName)] = value;
    } else {
      target[fieldName] = value;
    }
  }
}
