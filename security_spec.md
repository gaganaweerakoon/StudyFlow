# StudyFlow Firestore Security Specification

## Phase 0: Data Invariants
1. **Strict Ownership & PII Isolation**: `/users/{userId}` contains PII (`email`, `photoURL`). Only the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may `get`, `create`, `update`, or `delete` their own document.
2. **No Directory Enumeration**: `allow list` on `/users` is strictly `false` so no user can scrape or enumerate student emails.
3. **Identity Integrity**: On create and update, `incoming().uid == request.auth.uid && incoming().uid == userId`, and `uid` and `createdAt` are immutable after creation.
4. **Strict Keys & Size Bounds**: Only fields declared in `firebase-blueprint.json` are accepted (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update). Every string is bounded by its blueprint `maxLength`.
5. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on both create and update.
6. **Path Variable Hardening**: `{userId}` must match `^[a-zA-Z0-9_-]+$` and `size() <= 128`.
7. **Default Deny**: All unmatched paths are explicitly denied (`allow read, write: if false;`).

## The "Dirty Dozen" Adversarial Payloads (Must All Be Rejected)
1. **Unauthenticated Read/Write**: `request.auth == null` attempting `get` or `create` on `/users/alice`.
2. **Cross-User PII Read**: Authenticated `bob` attempting `get` on `/users/alice`.
3. **Collection Enumeration**: Authenticated `alice` attempting `list` on `/users`.
4. **Unverified Email Spoofing**: Authenticated `alice` with `email_verified: false` attempting `create` or `update` on `/users/alice`.
5. **Identity Spoofing on Create**: Authenticated `alice` writing `uid: "bob"` into `/users/alice`.
6. **Shadow Field Injection (Create)**: Payload containing an extra ghost field `{ isAdmin: true }` or `{ role: "admin" }`.
7. **Shadow Field Injection (Update)**: Update modifying an undeclared key `{ plan: "enterprise" }`.
8. **Immutable Field Tampering**: Update attempting to change `uid` or `createdAt`.
9. **Client Timestamp Forgery**: Create or update sending a backdated/future timestamp instead of `request.time`.
10. **Path ID Poisoning**: Document ID containing invalid characters or exceeding 128 chars (`../admin` or 200-char string).
11. **Value Poisoning (Oversized String)**: Setting `displayName` to a 500-char string (> 120 max) or `photoURL` to 2048 chars (> 1024 max).
12. **Type / Enum Poisoning**: Setting `theme: "hacked"`, `accentColor: "javascript:alert(1)"`, `dailyGoalHours: 999`, or `displayName: 12345`.
