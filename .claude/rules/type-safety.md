# Type Safety

These rules apply to ALL TypeScript code — source files, tests, pipeline scripts.

## Never use `as any`

Cast to the correct type instead. If you don't know the type, define one or use `unknown` with a type guard.

```typescript
// BAD
expect((field as any).validation).toBeDefined();

// GOOD
expect(field.validation).toBeDefined();
// or if the type doesn't include the property:
const typedField = field as SchemaField & { validation?: unknown };
expect(typedField.validation).toBeDefined();
```

## Never use non-null assertions (`!`) on uncertain values

Use optional chaining (`?.`) and nullish coalescing (`??`) instead.

```typescript
// BAD
const value = fields.find(f => f.id === 'name')!.label;

// GOOD
const value = fields.find(f => f.id === 'name')?.label ?? '';
```

## Don't annotate types that TypeScript can infer

Let TypeScript infer callback parameter types from context.

```typescript
// BAD
const payment = prerequisites.find((p: any) => p.type === 'payment');

// GOOD
const payment = prerequisites.find(p => p.type === 'payment');
```

## In tests: use proper types for test data

When creating test fixtures, type them correctly rather than using `any` to bypass checks.

```typescript
// BAD
const mockField: any = { id: 'name', type: 'text' };

// GOOD
const mockField: SchemaField = { id: 'name', type: 'text', label: 'Name', required: true };
```

## Use `unknown` + type guards for truly dynamic data

When you genuinely don't know the type (e.g., parsing JSON, API responses in tests), use `unknown` and narrow with checks.

```typescript
// BAD
const data = JSON.parse(response) as any;
console.log(data.name);

// GOOD
const data: unknown = JSON.parse(response);
if (data && typeof data === 'object' && 'name' in data) {
  console.log((data as { name: string }).name);
}
```
