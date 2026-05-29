# Security Architecture

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

## Rate Limiting

### Architecture

Rate limiting is enforced in `src/middleware/rateLimit.ts` using Redis fixed-window counters. Two independent counters are maintained per request:

1. **Tenant bucket** — keyed by `ratelimit:<namespace>:tenant:<ownerId>:<windowStart>`. Enforces the tier ceiling shared across all API keys belonging to the same owner.
2. **Per-key bucket** — keyed by `ratelimit:<namespace>:key:<keyId>:<windowStart>`. Enforces the same tier ceiling scoped to a single API key, preventing one noisy key from exhausting the shared tenant budget.

A request is rejected (HTTP 429) when **either** counter exceeds the limit for the request's subscription tier.

### Fail-closed mode (production default)

When Redis is unavailable the middleware behaviour is controlled by `RATE_LIMIT_FAIL_OPEN`:

- **`false` (default in `NODE_ENV=production`)** — the middleware returns `503 Service Unavailable`. This is the secure default: a Redis outage cannot be exploited to bypass rate limits.
- **`true` (default in `development` / `test`)** — the middleware passes the request through. Useful for local development where Redis may not always be running.

The catch-block fallback in `src/app.ts` also derives `failOpen` from `NODE_ENV`, so a `validateConfig` failure at startup cannot silently disable limits in production.

### Prometheus metric

`rate_limit_rejected_total` (counter) is incremented on every rejected request with labels:

| Label | Values |
|-------|--------|
| `tier` | `free`, `pro`, `enterprise` |
| `key_id` | API key id, or `none` |
| `reason` | `tenant_limit`, `key_limit`, `redis_unavailable` |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable / disable rate limiting |
| `RATE_LIMIT_WINDOW_SEC` | `60` | Fixed-window size in seconds |
| `RATE_LIMIT_MAX_FREE` | `100` | Max requests per window for free tier |
| `RATE_LIMIT_MAX_PRO` | `1000` | Max requests per window for pro tier |
| `RATE_LIMIT_MAX_ENTERPRISE` | `10000` | Max requests per window for enterprise tier |
| `RATE_LIMIT_FAIL_OPEN` | `false` in prod, `true` in dev/test | Fail-open (`true`) or fail-closed (`false`) on Redis error |

### Security considerations

- **Misconfiguration cannot disable limits in production.** The `RATE_LIMIT_FAIL_OPEN` default is `false` when `NODE_ENV=production`, and the startup fallback in `src/app.ts` mirrors this.
- **Key identifiers are never stored in plain text.** When no authenticated record is present, the tenant id is derived from a truncated SHA-256 hash of the API key or Bearer token.
- **Per-key isolation** ensures that a compromised or misbehaving key cannot exhaust the rate budget of other keys belonging to the same tenant.
