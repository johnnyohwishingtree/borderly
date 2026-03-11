import { CountryFormSchema, SchemaMigration, SchemaValidationResult } from '../../types/schema';
import { schemaValidator } from './schemaValidator';

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

    // Sort migrations by version
    const sortedMigrations = this.sortMigrationsByVersion(migrations);
    
    // Find the migration path from current to target version
    const migrationPath = this.findMigrationPath(
      currentSchema.schemaVersion,
      targetSchema.schemaVersion,
      sortedMigrations
    );

    if (migrationPath.length === 0) {
      console.log(`No migrations needed from ${currentSchema.schemaVersion} to ${targetSchema.schemaVersion}`);
      return targetSchema;
    }

    console.log(`Applying ${migrationPath.length} migrations from ${currentSchema.schemaVersion} to ${targetSchema.schemaVersion}`);

    // Apply each migration in sequence
    let migratedSchema = { ...currentSchema };
    
    for (const migration of migrationPath) {
      try {
        migratedSchema = await this.applyMigration(migratedSchema, migration);
        console.log(`Applied migration ${migration.fromVersion} -> ${migration.toVersion}`);
      } catch (error) {
        throw new Error(`Migration failed ${migration.fromVersion} -> ${migration.toVersion}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate the final migrated schema
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

    // Update the schema version
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

  /**
   * Add a field to the schema
   */
  private addField(schema: CountryFormSchema, path: string, defaultValue: any): CountryFormSchema {
    const pathParts = path.split('.');
    const target = this.navigateToParent(schema, pathParts);
    const fieldName = pathParts[pathParts.length - 1];
    
    if (target && typeof target === 'object') {
      (target as any)[fieldName] = defaultValue;
    } else {
      throw new Error(`Cannot add field to path: ${path}`);
    }
    
    return schema;
  }

  /**
   * Remove a field from the schema
   */
  private removeField(schema: CountryFormSchema, path: string): CountryFormSchema {
    const pathParts = path.split('.');
    const target = this.navigateToParent(schema, pathParts);
    const fieldName = pathParts[pathParts.length - 1];
    
    if (target && typeof target === 'object' && fieldName in target) {
      delete (target as any)[fieldName];
    }
    
    return schema;
  }

  /**
   * Rename a field in the schema
   */
  private renameField(schema: CountryFormSchema, oldPath: string, newPath: string): CountryFormSchema {
    // Get the value from the old path
    const value = this.getValueAtPath(schema, oldPath);
    
    // Remove the old field
    this.removeField(schema, oldPath);
    
    // Add the new field
    this.addField(schema, newPath, value);
    
    return schema;
  }

  /**
   * Built-in named transformers that can be applied to schema fields during migration.
   * Named transformers replace the previous dynamic Function constructor (eval) approach.
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

  /**
   * Transform a field using a named built-in transformer.
   * The transformerCode must be one of the keys in builtInTransformers.
   */
  private transformField(schema: CountryFormSchema, path: string, transformerCode: string): CountryFormSchema {
    try {
      const transformer = this.builtInTransformers[transformerCode];
      if (!transformer) {
        throw new Error(`Unknown transformer: "${transformerCode}". Available transformers: ${Object.keys(this.builtInTransformers).join(', ')}`);
      }

      const currentValue = this.getValueAtPath(schema, path);
      const newValue = transformer(currentValue, schema);

      // Update the field with the transformed value
      this.setValueAtPath(schema, path, newValue);

    } catch (error) {
      throw new Error(`Transform function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return schema;
  }

  /**
   * Navigate to the parent object of a path
   */
  private navigateToParent(obj: any, pathParts: string[]): any {
    let current = obj;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      
      // Handle array indices
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
   * Get a value at a specific path
   */
  private getValueAtPath(obj: any, path: string): any {
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
   * Set a value at a specific path
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const pathParts = path.split('.');
    const target = this.navigateToParent(obj, pathParts);
    const fieldName = pathParts[pathParts.length - 1];
    
    if (target && typeof target === 'object') {
      if (Array.isArray(target) && !isNaN(Number(fieldName))) {
        target[Number(fieldName)] = value;
      } else {
        target[fieldName] = value;
      }
    }
  }

  /**
   * Sort migrations by their version numbers
   */
  private sortMigrationsByVersion(migrations: SchemaMigration[]): SchemaMigration[] {
    return migrations.slice().sort((a, b) => {
      return this.compareVersions(a.fromVersion, b.fromVersion);
    });
  }

  /**
   * Find the shortest path of migrations from source to target version
   */
  private findMigrationPath(
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
   * Compare two semantic version strings
   */
  private compareVersions(a: string, b: string): number {
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
   * Create a reverse migration
   */
  createReverseMigration(migration: SchemaMigration): SchemaMigration | null {
    if (!migration.reversible) {
      return null;
    }

    const reverseTransformations = migration.transformations.map(transformation => {
      switch (transformation.operation) {
        case 'add':
          return {
            operation: 'remove' as const,
            path: transformation.path,
          };
          
        case 'remove':
          return {
            operation: 'add' as const,
            path: transformation.path,
            defaultValue: transformation.defaultValue,
          };
          
        case 'rename':
          return {
            operation: 'rename' as const,
            path: transformation.newPath!,
            newPath: transformation.path,
          };
          
        case 'transform':
          // Transform operations are generally not reversible automatically
          throw new Error(`Transform operation cannot be automatically reversed: ${transformation.path}`);
          
        default:
          throw new Error(`Unknown operation: ${transformation.operation}`);
      }
    }).reverse(); // Reverse the order of operations

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

    // Validate version format
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    
    if (!semverRegex.test(migration.fromVersion)) {
      result.errors.push({
        path: 'fromVersion',
        message: 'fromVersion must be in semantic versioning format',
        severity: 'error',
      });
    }
    
    if (!semverRegex.test(migration.toVersion)) {
      result.errors.push({
        path: 'toVersion',
        message: 'toVersion must be in semantic versioning format',
        severity: 'error',
      });
    }

    // Validate transformations
    migration.transformations.forEach((transformation, index) => {
      const transformPath = `transformations[${index}]`;
      
      if (!transformation.operation || !['add', 'remove', 'rename', 'transform'].includes(transformation.operation)) {
        result.errors.push({
          path: `${transformPath}.operation`,
          message: `Invalid operation: ${transformation.operation}`,
          severity: 'error',
        });
      }
      
      if (!transformation.path) {
        result.errors.push({
          path: `${transformPath}.path`,
          message: 'Path is required for all transformations',
          severity: 'error',
        });
      }
      
      if (transformation.operation === 'rename' && !transformation.newPath) {
        result.errors.push({
          path: `${transformPath}.newPath`,
          message: 'newPath is required for rename operations',
          severity: 'error',
        });
      }
      
      if (transformation.operation === 'transform' && !transformation.transformer) {
        result.errors.push({
          path: `${transformPath}.transformer`,
          message: 'transformer is required for transform operations',
          severity: 'error',
        });
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
    
    // This is a simplified implementation. A real implementation would
    // perform deep comparison and generate appropriate transformations.
    
    // For now, we'll just handle the common case of version updates
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
    return this.compareVersions(fromVersion, toVersion) !== 0;
  }

  /**
   * Get the target version after applying migrations
   */
  getTargetVersion(sourceVersion: string, migrations: SchemaMigration[]): string {
    const path = this.findMigrationPath(sourceVersion, '', migrations);
    return path.length > 0 ? path[path.length - 1].toVersion : sourceVersion;
  }
}

export const schemaMigrator = new SchemaMigrator();