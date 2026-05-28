# Security Architecture

## API Key Scope Model

### Granular Scopes (Least Privilege)

Every API key is issued with an explicit set of **scopes** that determine which endpoints it may call. The middleware enforces a **deny-by-default** policy: if the key's granted scopes do not cover the required scope, the request is rejected with `403 Forbidden` before reaching any handler.

| Scope                | Grants access to                                                   |
|----------------------|--------------------------------------------------------------------|
| `trust:read`         | Trust scores and bond read endpoints                               |
| `attestations:read`  | Attestation list and count endpoints                               |
| `attestations:write` | Create and revoke attestations                                     |
| `payouts:write`      | Payout / settlement creation                                       |
| `reports:generate`   | Report job creation and status polling                             |
| `exports:read`       | Report artifact downloads and audit-log exports                    |
| `webhooks:admin`     | Webhook secret rotation and revocation                             |
| `admin:read`         | Admin read operations (users, audit logs, failed events)           |
| `admin:write`        | Admin write operations (role assignment, key revocation, impersonation, event replay) |

Legacy `public` and `enterprise` values are still accepted and automatically expanded to their respective scope sets (see `docs/api-keys.md`).

### Scope Enforcement Implementation

`src/middleware/auth.ts` exports:

- **`ApiScope`** — enum of all valid scope strings.
- **`SCOPE_SETS`** — maps legacy tier names to their expanded `Set<ApiScope>`.
- **`scopeSatisfies(grantedScopes, requiredScope)`** — pure function; returns `true` when the granted set covers the required scope (including legacy expansion).
- **`requireApiKey(requiredScope)`** — Express middleware factory. Reads the key from `X-API-Key` or `Authorization: Bearer`, validates it, checks scope, and attaches `{ key, scopes, scope }` to `req.apiKey`.

### Scope Assignment at Key Creation

When issuing a key via `generateApiKey` / `InMemoryApiKeyRepository.create`, pass an explicit `scopes` array:

```typescript
repo.create('owner-id', 'trust:read', 'free', ['trust:read', 'attestations:read'])
```

The `scopes` array is stored on `StoredApiKey` and preserved through key rotation.

### Security Properties

- **Deny-by-default**: missing or insufficient scope → `403` before handler execution.
- **No scope escalation**: a key can only be rotated to the same or narrower scope set.
- **Audit trail**: every `403` response includes `requiredScope` and `grantedScopes` for debugging without leaking key material.
- **Backward compatibility**: existing `enterprise` keys continue to work and satisfy all granular scopes.

---

## Encrypted Evidence Storage

Dispute and slash evidence submitted to the platform often contain sensitive user data. To ensure privacy, security, and integrity, all evidence is encrypted at rest before being saved to the database or object storage.

### Encryption Standard
- **Algorithm**: AES-256-GCM (Galois/Counter Mode).
- **Key Management**: Managed via environment variables (`EVIDENCE_ENCRYPTION_KEY`). It must be exactly 32 bytes.
- **Integrity Validation**: GCM provides an authentication tag (`authTag`). During decryption, this tag ensures the data has not been tampered with or corrupted in the storage layer.

### Access Control (RBAC)
Access to decrypted evidence is strictly limited using Role-Based Access Control.
- **USER**: Denied access to view encrypted evidence blobs.
- **ARBITRATOR**: Granted access to retrieve and decrypt evidence for reviewing active disputes.
- **GOVERNANCE**: Granted access to retrieve and decrypt evidence for auditing, slashing events, and platform management.

### Evidence Audit Trail

All sensitive evidence actions are written to the immutable audit stream:

- `EVIDENCE_UPLOADED` when evidence is stored
- `EVIDENCE_ACCESSED` when evidence is decrypted and returned

Each event includes actor metadata, action name, timestamp, and evidence resource id, enabling compliance queries by actor, resource, and time range.