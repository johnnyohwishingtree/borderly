# Facts: Regulatory

Truths because a governing body says so. These change when laws change — often suddenly.

## f:reg:portal-tos-prohibit-automation

Many government customs portals explicitly prohibit automated access in their Terms of Service. Automated form submission may violate computer access laws in some jurisdictions.

**Referenced by:** `beliefs/guided-submission-over-automation.md`, `models/submission-guide.md`

## f:reg:human-must-be-actor-of-record

For customs declarations, the traveler is the legal actor of record. An app that submits on behalf of the user creates liability for both the user and the app.

**Referenced by:** `beliefs/guided-submission-over-automation.md`

## f:reg:gdpr-data-minimization

GDPR requires that personal data not be stored longer than necessary for its purpose. Borderly stores data locally on-device (not on servers), but data retention policies still apply.

**Referenced by:** `policies/architecture/local-first.md`, `policies/data/pii-boundary.md`

## f:reg:pii-has-special-handling-requirements

Passport numbers, dates of birth, full names, and nationality are regulated personal information under GDPR, CCPA, and most national privacy laws. These require explicit handling, access controls, and breach notification.

**Referenced by:** `policies/data/pii-boundary.md`, `policies/data/storage-tiers.md`

## f:reg:clipboard-is-readable-by-other-apps

On mobile platforms, clipboard contents can be read by other apps. Copied passport data becomes exploitable if the device is shared or abandoned. Auto-clear after a timeout mitigates this.

**Referenced by:** `policies/data/pii-boundary.md` (60-second clipboard auto-clear rule)
