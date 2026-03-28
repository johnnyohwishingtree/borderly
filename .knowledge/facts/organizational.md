# Facts: Organizational

Decisions specific to how Borderly is built. These change when the team or process changes.

## f:org:three-tier-storage

Borderly uses three storage tiers mapped to data sensitivity: OS Keychain (PII + encryption keys), WatermelonDB (structured data, encrypted at rest), MMKV (config + schemas, unencrypted, fast).

**Referenced by:** `policies/data/storage-tiers.md`, `policies/data/pii-boundary.md`

## f:org:schema-first-development

Adding a country requires a JSON schema file and a knowledge file — not new React Native components. The form engine renders any schema through a single DynamicForm component.

**Referenced by:** `beliefs/schema-driven-forms-scale.md`, `patterns/add-country.md`, `models/form-engine.md`

## f:org:policies-over-rules

Auto-loaded rules (`.claude/rules/`) are limited to 2 irreversible-damage guardrails. All other constraints live in policies (`.knowledge/policies/`) loaded on-demand by skills.

**Referenced by:** `models/system-architecture.md`

## f:org:structural-tests-enforce-policies

Every testable policy has a structural test in `__tests__/structure/` that runs in under 1 second. Policies without tests are treated as design guidelines, not hard constraints.

**Referenced by:** `policies/architecture/testable-architecture.md`

## f:org:pipeline-learning-is-mandatory

PRs with 5+ files changed must include a knowledge update. Bug fixes must add root cause to the relevant policy's Anti-patterns section. The pipeline cannot close a story without checking for stale knowledge.

**Referenced by:** `policies/workflow/learning.md`

## f:org:biometric-asymmetric-ux

Enabling app lock is low-friction (no auth required). Disabling app lock requires biometric proof. This asymmetry prevents accidental security downgrades.

**Referenced by:** `policies/data/pii-boundary.md`
