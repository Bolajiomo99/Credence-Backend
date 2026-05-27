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

## API Key Handling (Integrations)

- **Hashed storage**: API keys are never stored in plain text. Only a SHA-256 hash of the raw key is persisted.
- **Shown once**: The raw key is returned exactly once at creation/rotation and must be stored securely by the integrator.
- **Timing-safe validation**: Key comparisons are performed via constant-time hash checks to avoid timing attacks; raw keys are not logged.
- **Rotation & revocation**: Keys can be rotated or revoked. Rotation issues a new raw key and revokes the previous one; revocation immediately prevents further access.
- **Test isolation**: Tests should generate keys via the API/key-service helpers and must reset the in-memory store between runs.

Never commit raw API keys, test fixtures with live keys, or example bearer tokens to source control or documentation. Use placeholder values or generated keys in tests and CI only.

- `EVIDENCE_UPLOADED` when evidence is stored
- `EVIDENCE_ACCESSED` when evidence is decrypted and returned

Each event includes actor metadata, action name, timestamp, and evidence resource id, enabling compliance queries by actor, resource, and time range.