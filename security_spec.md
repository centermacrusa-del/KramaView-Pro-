# Security Specification — KramaView Pro Firestore Rules

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity**: All read and write operations require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Strict Ownership Isolation (PII & Private Workspace)**:
   - Every document in `/savedAnalyses/{analysisId}`, `/priceAlerts/{alertId}`, and `/alertLogs/{logId}` must have `ownerId == request.auth.uid`.
   - Every document in `/notificationConfigs/{userId}` must have both `userId == request.auth.uid` and `ownerId == request.auth.uid`. Non-owners can never read (`get` or `list`) another user's email address, Telegram bot token, or saved analyses.
4. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` can never be mutated during an `update`.
5. **Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create and update) must equal `request.time`.
6. **Strict Schema & Volumetric Bounds**:
   - Every string is bounded by explicit `.size()` and regex `.matches()` where specified in `firebase-blueprint.json`.
   - Lists (`indicators`, `drawings`) are strictly bounded (`indicators.size() <= 10`, `drawings.size() <= 50`) and first-element type-checked.
7. **Action-Based Updates**: Updates must pass `isValid[Entity](incoming())` first and restrict modified keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Create)**: Creating a `savedAnalyses` document with `ownerId: "victim_uid_999"` while signed in as `"attacker_uid_111"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoof)**: Attempting to create a `priceAlerts` document when `request.auth.token.email_verified == false`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow Field Injection on Create)**: Creating a `priceAlerts` document with an extra undeclared field `isAdmin: true`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow Field Injection on Update)**: Updating a `savedAnalyses` document with an extra field `hacked: "yes"`. -> `PERMISSION_DENIED`
5. **Payload 5 (Ownership Hijack on Update)**: Updating `ownerId` on an existing `priceAlerts` document to transfer ownership. -> `PERMISSION_DENIED`
6. **Payload 6 (Timestamp Forgery)**: Creating or updating an `alertLogs` document with a forged client timestamp (`createdAt != request.time`). -> `PERMISSION_DENIED`
7. **Payload 7 (ID Poisoning Attack)**: Creating a document at `/savedAnalyses/invalid$id!with spaces` or >128 characters. -> `PERMISSION_DENIED`
8. **Payload 8 (Denial of Wallet String Overflow)**: Submitting a `notes` string of 10,000 characters (`> 2000` limit) in `savedAnalyses`. -> `PERMISSION_DENIED`
9. **Payload 9 (Unbounded Array Exhaustion)**: Submitting `drawings` with 100 items (`> 50` limit) or `indicators` with non-string first element. -> `PERMISSION_DENIED`
10. **Payload 10 (PII Cross-Tenant Read)**: Authenticated user `"attacker_uid"` attempting `get` on `/notificationConfigs/victim_uid`. -> `PERMISSION_DENIED`
11. **Payload 11 (Unfiltered List Scraping)**: Authenticated user attempting `list` on `/savedAnalyses` without `where('ownerId', '==', request.auth.uid)`. -> `PERMISSION_DENIED`
12. **Payload 12 (Value Poisoning on Update)**: Updating `status` on `priceAlerts` to an invalid enum value `"hacked_status"` or wrong type. -> `PERMISSION_DENIED`
