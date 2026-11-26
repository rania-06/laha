# Security Specification — Laha Direct Messaging & Marketplace Rules

## 1. Data Invariants
1. **Profiles (`/users/{uid}`)**: Strictly readable/writable by the verified owner (`request.auth.uid == uid`) or admin. No `list` queries allowed.
2. **Startups (`/startups/{startupId}`)**: Publicly readable (`get`, `list`); only verified owners (`ownerId == request.auth.uid`) or admins can update/delete.
3. **Client Requests (`/requests/{requestId}`)**: Strictly readable only by `clientUid`, `targetStartupOwnerId`, or admin. Created strictly as `pending` referencing an existing `/startups/{targetStartupId}` whose `ownerId` matches `targetStartupOwnerId`.
4. **Conversations (`/conversations/{conversationId}`)**:
   - A conversation cannot be created unless `/startups/{startupId}` exists and `startupOwnerId` matches the real startup owner.
   - `clientUid`, `startupId`, `startupOwnerId`, and `createdAt` are immutable after creation.
   - Only `clientUid`, `startupOwnerId`, or bootstrap admin can read/list/update/delete.
   - `allow list` uses zero `get()`/`exists()` calls, strictly evaluating `resource.data.clientUid == request.auth.uid || resource.data.startupOwnerId == request.auth.uid || isBootstrapAdmin()`.
5. **Chat Messages (`/conversations/{conversationId}/messages/{messageId}`)**:
   - Master Gate: `create` and `get` verify parent `/conversations/{conversationId}` exists and `request.auth.uid` is either `clientUid` or `startupOwnerId`.
   - `senderUid` MUST equal `request.auth.uid`, and `clientUid` / `startupOwnerId` MUST match the parent conversation verbatim.
   - Atomicity Guarantee: Every message creation MUST occur atomically with updating the parent conversation (`getAfter(...)` verifies `lastSenderUid == request.auth.uid` and `updatedAt == request.time`).
   - Messages are immutable (`allow update: if false;`) and strictly size-bounded (`body` 1..1500 chars).

## 2. Dirty Dozen Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unverified email creating a conversation** -> Rejected by `isVerifiedUser()`.
2. **Ghost field injection** (`{ isVerified: true }`) on `/conversations/{id}` or `/messages/{id}` -> Rejected by `hasOnly(...)` in `isValidConversation()` / `isValidChatMessage()`.
3. **Orphaned conversation** pointing to non-existent `startupId` -> Rejected by `exists(/startups/$(incoming().startupId))`.
4. **Startup owner spoofing** (`startupOwnerId` != actual startup `ownerId`) -> Rejected by `get(/startups/$(incoming().startupId)).data.ownerId == incoming().startupOwnerId`.
5. **Third-party eavesdropping** (`get` or `list` on someone else's `/conversations/{id}` or `/messages/{id}`) -> Rejected by participant UID checks.
6. **Sender identity spoofing** (`senderUid` != `request.auth.uid` inside `/messages/{id}`) -> Rejected by `incoming().senderUid == request.auth.uid`.
7. **Non-atomic message write** (creating a message without updating parent conversation `lastSenderUid` / `updatedAt`) -> Rejected by `getAfter(...)`.
8. **Tampering with sent message** (`update` on `/messages/{id}`) -> Rejected by `allow update: if false`.
9. **Resource poisoning** (`body` > 1500 chars or document ID > 128 chars / invalid chars) -> Rejected by `isValidId()` and `.size() <= 1500`.
10. **Immutable field mutation** (changing `clientUid` or `startupOwnerId` on conversation update) -> Rejected by equality guards + `affectedKeys().hasOnly(...)`.
11. **Client-forged timestamp** (`createdAt` or `updatedAt` != `request.time`) -> Rejected by `== request.time`.
12. **Admin email spoofing** with `email_verified == false` -> Rejected by `isVerifiedUser()`.
