---
name: <kebab-case-name>
description: <one line — what this skill does>
argument-hint: "[optional args]"
---

# /<skill-name> — <Title>

<One paragraph: what this skill does and when to use it.>

## Policies
<!-- Machine-readable. Graph engine parses this section. -->
- .knowledge/policies/workflow/verification.md
- .knowledge/policies/workflow/fix-strategy.md

## Skills
<!-- Other skills this skill invokes. Graph engine parses this section. -->
- /optimize (Step N)

## Steps

### Step 1: <Name>
<What to do. Reference policies inline: "Follow `.knowledge/policies/workflow/verification.md`." >

### Step 2: <Name>
...

### Step N: Verify
Follow `.knowledge/policies/workflow/verification.md`.

### Step N+1: Report
<Summary of what was done.>

## What NOT to do
- <Guardrails specific to this skill>

## Matching rubric
`.knowledge/rubrics/skill-quality.md`
