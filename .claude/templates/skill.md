---
name: <kebab-case-name>
description: <one line — what this skill does>
argument-hint: "[optional args]"
---

# /<skill-name> — <Title>

<One paragraph: what this skill does and when to use it.>

## Usage
```
/<skill-name>              # Default invocation
/<skill-name> --flag       # With options
```

## Steps

### Step 1: <Check preconditions>

Before doing work, verify the environment is ready. Exit early if not.

### Step 2: <Do the work>

<Clear instructions with explicit commands.>

### Step 3: <Verify the work>

```bash
pnpm lint && pnpm typecheck && pnpm test
```

If verification fails:
- <What to fix>
- <How many retries>
- <What to do if all retries fail>

### Step 4: <Deliver the result>

Only reached if Step 3 passed.

## Template Maintenance

<!-- Update this skill when: conditions that should trigger an update -->
