/**
 * Schema Migration Service
 *
 * Applies migrations to transform schemas from one version to another.
 * Supports add, remove, rename, and transform operations with built-in
 * named transformers.
 */

import { CountryFormSchema, SchemaMigration, SchemaValidationResult } from '../../../types/schema';
import { schemaValidator } from '../validation';
import {
  compareVersions,
  sortMigrationsByVersion,
  findMigrationPath,
  navigateToParent,
  getValueAtPath,
  setValueAtPath,
} from './pathUtils';

class SchemaMigrator {
  /**
   * Apply a series of migrations to transform a schema from one version to another
   */
  async applyMigrations(
    currentSchema: CountryFormSchema,
    targetSchema: CountryFormSchema,
    migrations: SchemaMigration[]
  ): Promise<CountryFormSchema> {
    if (!migrations || migrations.length === 0) {
      return targetSchema;
    }

    const sortedMigrations = sortMigrationsByVersion(migrations);

    const migrationPath = findMigrationPath(
      currentSchema.schemaVersion,
      targetSchema.schemaVersion,
      sortedMigrations
    );

    if (migrationPath.length === 0) {
      console.log(`No migrations needed from ${currentSchema.schemaVersion} to ${targetSchema.schemaVersion}`);
      return targetSchema;
    }

    console.log(`Applying ${migrationPath.length} migrations from ${currentSchema.schemaVersion} to ${targetSchema.schemaVersion}`);

    let migratedSchema = { ...currentSchema };

    for (const migration of migrationPath) {
      try {
        migratedSchema = await this.applyMigration(migratedSchema, migration);
        console.log(`Applied migration ${migration.fromVersion} -> ${migration.toVersion}`);
      } catch (error) {
        throw new Error(`Migration failed ${migration.fromVersion} -> ${migration.toVersion}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const validationResult = await schemaValidator.validateSchema(migratedSchema);
    if (!validationResult.valid) {
      throw new Error(`Migrated schema is invalid: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    return migratedSchema;
  }

  /**
   * Apply a single migration to a schema
   */
  async applyMigration(schema: CountryFormSchema, migration: SchemaMigration): Promise<CountryFormSchema> {
    let migratedSchema = JSON.parse(JSON.stringify(schema)) as CountryFormSchema;

    for (const transformation of migration.transformations) {
      try {
        migratedSchema = await this.applyTransformation(migratedSchema, transformation);
      } catch (error) {
        throw new Error(`Transformation failed for path '${transformation.path}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    migratedSchema.schemaVersion = migration.toVersion;
    migratedSchema.lastUpdated = new Date().toISOString();

    return migratedSchema;
  }

  /**
   * Apply a single transformation to a schema
   */
  private async applyTransformation(schema: CountryFormSchema, transformation: any): Promise<CountryFormSchema> {
    const { operation, path, newPath, defaultValue, transformer } = transformation;

    switch (operation) {
      case 'add':
        return this.addField(schema, path, defaultValue);

      case 'remove':
        return this.removeField(schema, path);

      case 'rename':
        if (!newPath) {
          throw new Error('Rename operation requires newPath');
        }
        return this.renameField(schema, path, newPath);

      case 'transform':
        if (!transformer) {
          throw new Error('Transform operation requires transformer');
        }
        return this.transformField(schema, path, transformer);

      default:
        throw new Error(`Unknown migration operation: ${operation}`);
    }
  }

  private addField(schema: CountryFormSchema, path: string, defaultValue: any): CountryFormSchema {
    const pathParts = path.split('.');
    const target = navigateToParent(schema, pathParts);
    const fieldName = pathParts[pathParts.length - 1];

    if (target && typeof target === 'object') {
      (target as any)[fieldName] = defaultValue;
    } else {
      throw new Error(`Cannot add field to path: ${path}`);
    }

    return schema;
  }

  private removeField(schema: CountryFormSchema, path: string): CountryFormSchema {
    const pathParts = path.split('.');
    const target = navigateToParent(schema, pathParts);
    const fieldName = pathParts[pathParts.length - 1];

    if (target && typeof target === 'object' && fieldName in target) {
      delete (target as any)[fieldName];
    }

    return schema;
  }

  private renameField(schema: CountryFormSchema, oldPath: string, newPath: string): CountryFormSchema {
    const value = getValueAtPath(schema, oldPath);
    this.removeField(schema, oldPath);
    this.addField(schema, newPath, value);
    return schema;
  }

  /**
   * Built-in named transformers for schema field migration.
   */
  private readonly builtInTransformers: Record<string, (value: unknown, schema: CountryFormSchema) => unknown> = {
    toString: (value: unknown) => String(value ?? ''),
    toNumber: (value: unknown) => Number(value),
    toBoolean: (value: unknown) => Boolean(value),
    toLowerCase: (value: unknown) => typeof value === 'string' ? value.toLowerCase() : value,
    toUpperCase: (value: unknown) => typeof value === 'string' ? value.toUpperCase() : value,
    trim: (value: unknown) => typeof value === 'string' ? value.trim() : value,
    toNull: (_value: unknown) => null,
  };

  private transformField(schema: CountryFormSchema, path: string, transformerCode: string): CountryFormSchema {
    try {
      const transformer = this.builtInTransformers[transformerCode];
      if (!transformer) {
        throw new Error(`Unknown transformer: "${transformerCode}". Available transformers: ${Object.keys(this.builtInTransformers).join(', ')}`);
      }

      const currentValue = getValueAtPath(schema, path);
      const newValue = transformer(currentValue, schema);
      setValueAtPath(schema, path, newValue);

    } catch (error) {
      throw new Error(`Transform function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return schema;
  }

  /**
   * Create a reverse migration
   */
  createReverseMigration(migration: SchemaMigration): SchemaMigration | null {
    if (!migration.reversible) {
      return null;
    }

    const reverseTransformations = migration.transformations.map(transformation => {
      switch (transformation.operation) {
        case 'add':
          return { operation: 'remove' as const, path: transformation.path };

        case 'remove':
          return { operation: 'add' as const, path: transformation.path, defaultValue: transformation.defaultValue };

        case 'rename':
          return { operation: 'rename' as const, path: transformation.newPath!, newPath: transformation.path };

        case 'transform':
          throw new Error(`Transform operation cannot be automatically reversed: ${transformation.path}`);

        default:
          throw new Error(`Unknown operation: ${transformation.operation}`);
      }
    }).reverse();

    return {
      fromVersion: migration.toVersion,
      toVersion: migration.fromVersion,
      transformations: reverseTransformations,
      description: `Reverse of: ${migration.description}`,
      reversible: true,
    };
  }

  /**
   * Validate that a migration is safe to apply
   */
  async validateMigration(migration: SchemaMigration): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

    if (!semverRegex.test(migration.fromVersion)) {
      result.errors.push({ path: 'fromVersion', message: 'fromVersion must be in semantic versioning format', severity: 'error' });
    }

    if (!semverRegex.test(migration.toVersion)) {
      result.errors.push({ path: 'toVersion', message: 'toVersion must be in semantic versioning format', severity: 'error' });
    }

    migration.transformations.forEach((transformation, index) => {
      const transformPath = `transformations[${index}]`;

      if (!transformation.operation || !['add', 'remove', 'rename', 'transform'].includes(transformation.operation)) {
        result.errors.push({ path: `${transformPath}.operation`, message: `Invalid operation: ${transformation.operation}`, severity: 'error' });
      }

      if (!transformation.path) {
        result.errors.push({ path: `${transformPath}.path`, message: 'Path is required for all transformations', severity: 'error' });
      }

      if (transformation.operation === 'rename' && !transformation.newPath) {
        result.errors.push({ path: `${transformPath}.newPath`, message: 'newPath is required for rename operations', severity: 'error' });
      }

      if (transformation.operation === 'transform' && !transformation.transformer) {
        result.errors.push({ path: `${transformPath}.transformer`, message: 'transformer is required for transform operations', severity: 'error' });
      }
    });

    result.valid = result.errors.filter(e => e.severity === 'error').length === 0;
    return result;
  }

  /**
   * Generate a migration between two schema versions
   */
  generateMigration(
    fromSchema: CountryFormSchema,
    toSchema: CountryFormSchema,
    description?: string
  ): SchemaMigration {
    const transformations: any[] = [];

    if (fromSchema.schemaVersion !== toSchema.schemaVersion) {
      transformations.push({
        operation: 'transform',
        path: 'schemaVersion',
        transformer: `return "${toSchema.schemaVersion}";`,
      });

      transformations.push({
        operation: 'transform',
        path: 'lastUpdated',
        transformer: `return new Date().toISOString();`,
      });
    }

    return {
      fromVersion: fromSchema.schemaVersion,
      toVersion: toSchema.schemaVersion,
      transformations,
      description: description || `Migrate from ${fromSchema.schemaVersion} to ${toSchema.schemaVersion}`,
      reversible: true,
    };
  }

  /**
   * Check if migration is needed between two versions
   */
  isMigrationNeeded(fromVersion: string, toVersion: string): boolean {
    return compareVersions(fromVersion, toVersion) !== 0;
  }

  /**
   * Get the target version after applying migrations
   */
  getTargetVersion(sourceVersion: string, migrations: SchemaMigration[]): string {
    const path = findMigrationPath(sourceVersion, '', migrations);
    return path.length > 0 ? path[path.length - 1].toVersion : sourceVersion;
  }
}

export const schemaMigrator = new SchemaMigrator();
