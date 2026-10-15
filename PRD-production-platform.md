# PRD — Production platform: separate frontend, secure backend, Auth0, and cloud persistence

**Status:** Proposed  
**Owner:** TBD  
**Target release:** Phased production launch  
**Last updated:** 2026-08-19

## 1. Executive summary

Convert `apprendre-francais` from a local-first Vue/Vite application into a production web product with two independently deployable services:

1. a static Vue single-page application (SPA); and
2. a Node.js API and background worker that own authentication enforcement, application data, file storage, and every LLM interaction.

The current application is not entirely frontend-only. Its Claude/DeepSeek code already runs server-side, but only through a custom Vite dev/preview plugin. A static `vite build` has no production API, no authentication, no database, no authorization boundary, no rate limits, and no durable cross-device persistence. Learner drafts, attempts, recordings, imported content, and generated vocabulary currently live in `localStorage` or IndexedDB on one browser.

The production platform will use:

- **Auth0 Universal Login** and Authorization Code Flow with PKCE for user authentication;
- **Auth0-issued access tokens** verified by the API for authorization;
- **PostgreSQL** as the source of truth for users, attempts, responses, evaluations, vocabulary, and job metadata;
- **private object storage** for audio and other large binary assets, accessed only through short-lived signed URLs;
- a **server-side LLM gateway and worker** for provider credentials, validation, budgets, retries, and structured outputs;
- exact-origin CORS, request validation, per-user authorization, rate limits, auditability, encrypted managed services, backups, monitoring, and a documented deployment/rollback process.

The migration must preserve the current learning experience and existing LLM prompts before adding new learning features. No production provider secret, database credential, privileged Auth0 credential, or private object URL may be exposed to the browser.

## 2. Product problem

### 2.1 Current architecture

```diagram
┌──────────────────────────────────────┐
│ Vue SPA                              │
│ localStorage + IndexedDB             │
└───────────────┬──────────────────────┘
                │ /api/* only during Vite dev/preview
                ▼
┌──────────────────────────────────────┐
│ Vite middleware                     │
│ evaluate · correct · vocabulary     │
└───────────────┬──────────────────────┘
                │ provider credentials in process.env
                ▼
┌──────────────────────────────────────┐
│ Anthropic or DeepSeek                │
└──────────────────────────────────────┘
```

Current application API routes:

- `POST /api/correct` — French correction and style suggestions;
- `POST /api/evaluate` — task-aware EE/EO evaluation;
- `POST /api/eo/vocab` — generated thematic vocabulary.

Current persistence includes:

- EE, EO, CE, and CO state in `localStorage` and/or IndexedDB;
- production attempts, evaluations, and audio blobs in IndexedDB;
- generated vocabulary cache in `localStorage`;
- theme preference in `localStorage`.

Static generated conjugation data under `/generated/*` is a public application asset, not a privileged application API. It may remain on the frontend CDN. All personal data, mutable application data, uploads, and AI operations must use the backend.

### 2.2 Production gaps

| Area | Current state | Production requirement |
|---|---|---|
| API runtime | Vite dev/preview middleware | Independently deployable API with health checks and graceful shutdown |
| Identity | No accounts | Auth0 Universal Login; verified access token on protected requests |
| Authorization | None | Every personal record scoped to the authenticated user |
| Persistence | One browser only | PostgreSQL source of truth and optional local cache |
| Binary data | IndexedDB audio blobs | Private object storage with signed upload/download URLs |
| LLM security | Secrets are server-side, but runtime is development-only | Production secret manager, server-only provider calls, quotas, validation, and logs without learner content |
| Abuse protection | None | Body limits, rate limits, user quotas, timeouts, and cost controls |
| Reliability | No migrations, backups, monitoring, or rollback | Automated migrations, point-in-time recovery, alerts, runbooks, and rollback |
| Delivery | Frontend build only | Separate frontend and API/worker deployments with CI gates |

### 2.3 User need

A learner must be able to sign in safely, use AI features without supplying provider credentials, resume work across devices, retain attempts and feedback, manage recordings, and delete their account and personal data. The learner should not need to understand where the frontend, API, database, or LLM provider is hosted.

## 3. Goals

1. Deploy the Vue frontend and backend as separate production services with separate configuration and release lifecycles.
2. Require a valid Auth0 identity for every AI operation and every read or write of personal cloud data.
3. Move all provider calls and secrets behind the backend; the browser communicates only with the application API.
4. Store learner data durably in PostgreSQL and large private files in object storage.
5. Enforce object-level authorization so one user can never read, modify, infer, or delete another user's records.
6. Preserve current correction, evaluation, vocabulary, attempt, and recording behavior during migration.
7. Offer an explicit, idempotent one-time import of existing browser-local data after sign-in.
8. Add production controls for validation, rate limiting, LLM spend, privacy, observability, backups, incident response, and account deletion.
9. Provide repeatable local, staging, and production environments and an automated release pipeline.
10. Publish only after the launch security and operational acceptance criteria in this PRD are met.

## 4. Non-goals

- Rewriting the Vue user interface or changing the app's learning methodology.
- Adding subscriptions, payments, organizations, teachers, social features, or an administration portal.
- Replacing Auth0 with a custom password system.
- Training or fine-tuning an LLM on learner data.
- Sending raw EO audio to an LLM. Existing EO evaluation remains transcript-based unless separately approved with a privacy design.
- Claiming official TCF scoring or immigration eligibility.
- Uploading private or unlicensed imported CO content automatically. Cloud sync for imported third-party sets requires an explicit user action and a separate content-rights decision.
- Moving public immutable frontend assets, such as generated verb chunks, through the API merely to make every HTTP request dynamic.
- Building multi-region active-active infrastructure for the first launch.

## 5. Product principles and decisions

### 5.1 Backend is the trust boundary

The frontend is untrusted. It may suggest an identifier, status, owner, token count, or score, but the API must derive identity from the verified access token, validate input, enforce state transitions, and calculate protected metadata itself.

### 5.2 Auth0 authenticates; the application authorizes

Auth0 proves who the user is. It does not replace application authorization. The API maps the immutable Auth0 `sub` claim to an internal user UUID and scopes every query by that UUID. Email is display/contact data and must never be used as the ownership key.

### 5.3 Minimize sensitive data

Store only data needed for the learning experience, support, abuse prevention, and billing reconciliation with infrastructure providers. Do not put access tokens, provider credentials, raw learner text, transcripts, or audio URLs in analytics or normal application logs.

### 5.4 Preserve first, migrate second

First reproduce the existing endpoint contracts behind the new API. Then migrate persistence one feature at a time. The frontend must not switch a feature until its API contract, authorization tests, and failure states are ready.

### 5.5 Production provider credentials only

`CLAUDE_CODE_OAUTH_TOKEN` is a developer convenience and must not be used in production. Production uses a provider-issued API key held in the deployment secret manager. The gateway may support Anthropic and DeepSeek, but production has one explicitly configured primary provider and an intentional fallback policy; it must not silently select a provider merely because an unrelated environment variable exists.

## 6. Target architecture

### 6.1 Recommended deployment topology

```diagram
┌──────────────────┐      Auth0 Universal Login      ┌──────────────┐
│ Vue SPA / CDN    │◀───────────────────────────────▶│ Auth0 tenant │
└────────┬─────────┘                                 └──────────────┘
         │ HTTPS + Bearer access token
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ Node.js API                                                      │
│ JWT verification · validation · authorization · rate limits      │
└──────────┬────────────────────┬────────────────────┬──────────────┘
           │                    │                    │ enqueue
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ PostgreSQL       │  │ Private object   │  │ Background worker    │
│ users + learning │  │ storage / audio  │  │ LLM gateway + jobs   │
└──────────────────┘  └──────────────────┘  └──────────┬───────────┘
                                                       │ server-side only
                                                       ▼
                                            ┌──────────────────────┐
                                            │ LLM provider         │
                                            └──────────────────────┘
```

Recommended first implementation:

- retain the repository as a monorepo with explicit `web` and `api` packages;
- Vue 3/Vite SPA for the frontend;
- Node.js LTS, TypeScript, and a schema-first HTTP framework for the API;
- PostgreSQL with versioned migrations and a typed query layer;
- a PostgreSQL-backed durable job queue initially, avoiding Redis until measured load requires it;
- one API container and one worker process built from the backend package;
- an OpenAPI document generated from or checked against the runtime schemas.

Exact vendors are deployment decisions. Managed services must support TLS, encryption at rest, automated backups, secret injection, metrics, and separate staging and production resources.

### 6.2 Repository boundary

The target layout may be introduced incrementally:

```text
apps/
  web/                  # Vue SPA; public Auth0 and API-origin config only
  api/                  # HTTP application and health endpoints
  worker/               # background jobs using shared backend modules
packages/
  contracts/            # request/response schemas safe for browser and server
  domain/               # server-owned domain rules only when genuinely shared
```

The existing `server/claude*.js` prompt and normalization logic should move into the backend rather than be rewritten during extraction. `server/vitePluginApi.js` is removed after local Vite proxying and production API parity are complete.

## 7. Authentication and session requirements

### 7.1 Auth0 configuration

- Create separate Auth0 applications/APIs for local development, staging, and production.
- Configure the frontend as a **Single Page Application**.
- Use **Authorization Code Flow with PKCE** through Auth0 Universal Login.
- Configure one API audience and validate that exact audience in the backend.
- Allow only explicit callback, logout, and web origins for each environment. No wildcard production origins.
- Enable refresh token rotation where refresh tokens are required.
- Use Auth0's SPA SDK and keep tokens in memory, not `localStorage`, IndexedDB, URLs, Vue state snapshots, analytics, or logs.
- Prefer passkeys, social login, or Auth0-managed database connections; the application never receives a password.
- Require verified email before cost-bearing AI operations when an email-based identity is used.
- Configure bot/credential-stuffing protections available for the selected Auth0 plan.
- Do not embed a Management API client secret in the SPA. Any future Management API use is backend-only and least-privileged.

### 7.2 API token verification

The API must:

1. read the bearer token from the `Authorization` header;
2. verify the signature using Auth0's JWKS;
3. enforce issuer, audience, algorithm (`RS256`), expiration, and not-before claims;
4. reject missing/invalid tokens with a generic `401` response;
5. resolve the internal user from `sub`, creating it transactionally on the first valid request;
6. return `403` only when an authenticated user lacks permission;
7. cache JWKS safely with rotation support and fail closed when verification is unavailable.

Public endpoints are limited to liveness/readiness, public content explicitly classified as such, and any endpoint required for login routing. Personal, upload, and AI endpoints are protected.

### 7.3 User lifecycle

- `GET /v1/me` returns the app profile, preferences, storage use, and account creation date.
- The user can update non-identity preferences without changing Auth0 identity claims.
- The user can request account deletion in the app and must confirm the destructive action.
- Deletion revokes active app sessions where supported, removes the Auth0 identity, deletes database rows and object-storage files, and records only a non-identifying tombstone required to prevent accidental restoration.
- The privacy notice must disclose backup retention and the maximum time until deleted data expires from backups.

## 8. Backend API requirements

### 8.1 API conventions

- Prefix production routes with `/v1`.
- Accept and return JSON unless uploading/downloading through signed object-storage URLs.
- Validate path, query, headers, and body against strict schemas; reject unknown security-sensitive fields.
- Use UUIDs generated by the server. Never accept `userId` from the client for ownership.
- Return a stable error envelope: `code`, user-safe `message`, `requestId`, and optional field errors.
- Never return provider response bodies, stack traces, SQL details, secrets, or internal object keys to the browser.
- Set request-body limits by route. Text correction/evaluation retains the current 20,000-character ceiling or a lower product-approved limit.
- Require `Idempotency-Key` for creation/submission endpoints that can cause duplicate records, uploads, or LLM spend.
- Use cursor pagination for history lists.
- Publish and version an OpenAPI contract used by frontend integration and contract tests.

### 8.2 Minimum endpoint surface

| Method and route | Purpose |
|---|---|
| `GET /health/live` | Process liveness; no dependency details |
| `GET /health/ready` | Database/queue readiness; restricted details |
| `GET /v1/me` | Current application user and preferences |
| `PATCH /v1/me/preferences` | Theme and learner preferences |
| `DELETE /v1/me` | Confirmed account/data deletion request |
| `GET /v1/attempts` | Current user's paginated attempt history |
| `POST /v1/attempts` | Create a draft attempt |
| `GET /v1/attempts/:id` | Read one owned attempt and its task responses |
| `PATCH /v1/attempts/:id` | Autosave an allowed draft transition |
| `POST /v1/attempts/:id/submit` | Lock and submit an attempt idempotently |
| `POST /v1/uploads` | Create a bounded signed upload for an owned recording |
| `POST /v1/uploads/:id/complete` | Verify uploaded object and attach it to an attempt |
| `DELETE /v1/recordings/:id` | Delete an owned recording and object |
| `POST /v1/ai/corrections` | Queue correction for owned text/attempt |
| `POST /v1/ai/evaluations` | Queue EE/EO evaluation for an owned submitted attempt |
| `POST /v1/ai/vocabulary` | Return cached vocabulary or queue generation |
| `GET /v1/ai/jobs/:id` | Poll an owned AI job's state/result reference |

The final endpoint names may change during API design, but equivalent ownership, idempotency, and lifecycle behavior is required.

### 8.3 Attempt state model

```diagram
┌───────┐   submit   ┌───────────┐   evaluate   ┌───────────┐
│ draft │───────────▶│ submitted │────────────▶│ evaluated │
└───┬───┘            └───────────┘              └───────────┘
    │ delete               │ delete                   │ delete
    └──────────────────────┴───────────────────────────┘
```

- Only drafts are mutable.
- Submission records a server timestamp and an immutable snapshot of prompt/version, response, assistance used, timing, and task metadata.
- Evaluation appends a versioned result; it never overwrites the submitted response.
- Retries create another evaluation version or AI job, not a silent replacement.
- Delete is allowed only to the owner and cascades to evaluations, jobs, and recordings according to retention rules.

## 9. Data model

### 9.1 Core tables

| Table | Required fields and purpose |
|---|---|
| `users` | Internal UUID, unique Auth0 `sub`, optional verified email/display fields, preferences, status, created/updated timestamps |
| `attempts` | UUID, user UUID, skill, task/mode, prompt ID/version, state, timing, assistance flags, created/submitted timestamps |
| `attempt_responses` | Attempt UUID, structured response JSON or text, transcript where applicable, schema version, updated timestamp |
| `evaluations` | Attempt UUID, AI job UUID, evaluator/prompt version, normalized result JSON, disclaimer, created timestamp |
| `recordings` | Attempt UUID, private object key, MIME type, byte size, duration, checksum, upload status, created timestamp |
| `vocabulary_packs` | Normalized theme/hash, content version, generated result, expiration/review state, created timestamp |
| `ai_jobs` | User UUID, operation, state, input hash, provider/model, prompt version, attempts, token usage/cost metadata, safe error code, timestamps |
| `idempotency_keys` | User UUID, route/scope, key hash, request hash, stored result reference, expiration |

The first migration should favor a small number of stable relational fields plus versioned JSON for task-specific learning payloads. Do not create a wide table for every possible prompt/evaluation property before those queries exist.

### 9.2 Ownership and database constraints

- Every personal table has a direct or enforced transitive owner.
- Repository/query methods require the authenticated internal user ID as an argument.
- Unique constraints prevent duplicate Auth0 mappings and duplicate idempotent operations.
- Foreign keys and appropriate cascade/restrict behavior preserve integrity.
- State values use checked enums or equivalent constraints.
- Production queries use parameterized statements only.
- Application authorization tests are mandatory even if database row-level security is later added as defense in depth.

### 9.3 Audio and file storage

- Audio blobs do not belong in PostgreSQL.
- Objects are private, use non-guessable server-generated keys, and are partitioned by environment and user ownership.
- The API issues short-lived, operation-specific signed URLs after authorization.
- Upload creation constrains content type, expected byte range, checksum, and expiration.
- Upload completion verifies the object exists, size/type are allowed, and ownership metadata matches before attaching it.
- Downloads use short-lived signed URLs or authenticated streaming. Public bucket access is disabled.
- Orphaned/incomplete uploads expire automatically.
- A default maximum recording size and per-user storage quota must be set before launch.
- Malware scanning is required before supporting arbitrary document uploads; audio-only launch scope may use type/signature validation and quarantine until a scan decision is documented.

## 10. LLM gateway requirements

### 10.1 Server-only flow

```diagram
┌──────────┐  protected request  ┌─────────┐  durable job  ┌────────┐
│ Vue SPA  │────────────────────▶│ API     │──────────────▶│ Worker │
└──────────┘                     └─────────┘               └───┬────┘
                                                               │ API key
                                                               ▼
                                                        ┌──────────────┐
                                                        │ LLM provider │
                                                        └──────────────┘
```

- The browser never chooses arbitrary system prompts, model names, provider URLs, token limits, or provider credentials.
- The API accepts only product-level operation inputs and creates a durable job.
- The worker selects a versioned server-owned prompt and configured provider/model.
- Existing correction/evaluation/vocabulary normalizers validate the provider output before persistence.
- The frontend receives normalized application data, never an unfiltered provider response.

### 10.2 Reliability and cost controls

- Return `202 Accepted` and a job ID for uncached AI work; the SPA polls with bounded exponential backoff.
- Deduplicate identical in-flight requests by user, operation, input hash, and prompt version.
- Use explicit connect and total timeouts with abort signals.
- Retry only transient provider failures with capped exponential backoff and jitter. Do not retry validation errors or duplicate a request with unknown provider completion unless an idempotency strategy makes it safe.
- Cap attempts and move exhausted jobs to a reviewable failed state.
- Enforce per-user request and token budgets, route-level concurrency, global daily spend alerts, and an emergency AI kill switch.
- Cache non-personal vocabulary output by normalized theme, locale, prompt version, and model policy.
- Never share or cache a learner's corrections/evaluations across users.
- Record provider, model, prompt version, latency, token usage, estimated cost, and outcome without logging raw learner content.
- User-facing failures distinguish retryable unavailability, quota exhaustion, invalid input, and permanent processing failure without leaking provider internals.

### 10.3 Prompt and data safety

- Treat all learner and imported content as untrusted data, delimit it from system instructions, and never give the model tools or secrets.
- Validate structured model output against a strict schema and enforce existing anchor/length rules.
- Escape model output in the UI; never render model-authored HTML with `v-html` unless separately sanitized.
- Include prompt versions in every result so behavior is reproducible and rollbacks are possible.
- Establish provider data-retention/training settings and a data processing agreement appropriate to the launch jurisdiction.
- Disclose before first AI use that the submitted text/transcript is processed by a third-party model provider.
- Do not use learner content for model training or product analytics without separate, explicit opt-in consent.

## 11. Frontend requirements

### 11.1 API client

- Centralize application API calls in one typed client instead of direct `fetch` calls inside components.
- Configure the API origin at build/deploy time using a public value only.
- Request Auth0 access tokens through the Auth0 SDK and attach them only to the configured API origin.
- Never attach an access token to static assets, LLM providers, arbitrary URLs, or error-report attachments.
- Normalize `401`, `403`, `409`, `413`, `422`, `429`, and `5xx` handling.
- Use abort signals on navigation/unmount and prevent duplicate submissions.
- Show recoverable offline/server/AI states without deleting the user's current draft.

### 11.2 Authentication experience

- Public landing/navigation may remain viewable without login.
- Sign-in is required before AI use, cloud save, history, or upload.
- After login, return the learner to the intended route.
- Show clear signed-in identity and logout controls.
- Logout clears in-memory auth state and user-specific query caches but does not silently delete browser-local drafts.
- Avoid revealing whether another user's attempt or recording exists; unauthorized IDs return the same not-found behavior as absent IDs where practical.

### 11.3 Autosave and conflicts

- Keep in-progress form state locally for resilience, but PostgreSQL is authoritative after cloud sync is enabled.
- Autosave after a short idle period and on meaningful transitions, not every keystroke.
- Send a record version or `updatedAt` precondition. Reject stale writes with `409 Conflict` rather than silently overwriting another device.
- Explain the conflict and allow the learner to keep either the server version or a copied local draft.

### 11.4 Existing browser-data migration

After the first successful sign-in:

1. detect supported existing `localStorage` and IndexedDB records;
2. show a summary by type and count before anything is uploaded;
3. explain whether audio and imported third-party content will remain local;
4. let the user select what to import;
5. transform records to versioned API schemas and upload them idempotently;
6. verify server counts and display partial failures;
7. mark migration complete only after confirmation;
8. retain the original browser data until the user explicitly chooses to remove it.

Theme and non-sensitive device preferences may remain local. Imported CO assets remain local by default for privacy and content-rights reasons; only the attempt summary may sync unless cloud upload is explicitly designed and enabled.

## 12. Security and privacy requirements

### 12.1 Web and API controls

- HTTPS only; redirect HTTP at the edge and enable HSTS after domain validation.
- Exact allowlist CORS with only required methods/headers. Never combine wildcard origin with credentials.
- Security headers on the SPA: restrictive Content Security Policy, `frame-ancestors`, `nosniff`, referrer policy, and a permissions policy allowing microphone only where needed.
- No inline secrets or environment dumps in frontend bundles, source maps, HTML, logs, or health endpoints.
- Production source maps are private or uploaded directly to the error tracker and not publicly served.
- Route-specific rate limits by user plus coarse IP limits for unauthenticated routes.
- Bounded JSON parsing, upload limits, timeouts, and graceful overload responses.
- Parameterized database access and context-aware output escaping.
- Dependency, secret, and container scanning in CI; high/critical findings block release unless formally accepted with an expiry.
- Lock down database/object-store networking and credentials to the minimum service roles.
- Separate credentials and data stores for development, staging, and production.

### 12.2 Secrets

- Commit only documented variable names in `.env.example`, never values.
- Use the deployment platform's secret manager in staging/production.
- Use distinct Auth0, database, object store, and LLM credentials per environment.
- Document rotation and perform a pre-launch rotation drill for at least one non-user-facing secret.
- Redact bearer tokens, cookies, authorization headers, provider keys, signed URLs, learner content, and connection strings from logs and error reports.

### 12.3 Privacy and retention

- Publish a privacy notice and terms before public registration.
- Inventory every personal-data field, purpose, processor, region, retention period, and deletion behavior.
- Writing, transcripts, and recordings are private user content and must not enter product analytics.
- Define launch retention defaults: drafts, submitted attempts, recordings, AI jobs, operational logs, and backups.
- Let users delete individual attempts/recordings and the complete account.
- Define a support process for access/export and deletion requests.
- Encrypt managed database backups and object storage at rest; enforce TLS in transit.
- Restrict production-data access to named operators, require MFA, and audit access.

### 12.4 Required threat-model cases

Before launch, document and test at minimum:

- stolen or replayed access token;
- forged token, wrong audience, wrong issuer, expired token, and JWKS rotation;
- insecure direct object reference across attempts, jobs, evaluations, and recordings;
- signed upload abuse, type spoofing, oversized files, and orphaned objects;
- LLM denial-of-wallet and duplicate submission;
- prompt injection in learner/imported content;
- XSS through model output or imported content;
- secrets/PII in logs and error trackers;
- database restore exposing already deleted user data;
- compromised provider credential and emergency rotation.

## 13. Reliability, operations, and observability

### 13.1 Service objectives

Initial launch objectives, measured monthly:

- API availability excluding planned maintenance: **99.9%**.
- Non-AI API latency: p95 **< 300 ms** at expected launch load.
- AI job acceptance latency: p95 **< 1 second**.
- AI job completion: p95 **< 60 seconds** when the configured provider is healthy.
- Successful autosaves excluding client validation/conflict: **≥ 99.5%**.
- Recovery point objective: **≤ 24 hours** at launch, with point-in-time recovery preferred.
- Recovery time objective: **≤ 4 hours**.

Provider latency is tracked separately from application latency. AI availability may degrade independently without taking history, drafts, or non-AI practice offline.

### 13.2 Telemetry

- Generate or accept a safe request ID at the edge and propagate it through API, queue, and worker.
- Structured logs include route template, status, duration, internal user surrogate where needed, job ID, and error code—not raw bodies.
- Metrics include request rate/errors/latency, database pool health, queue depth/age, worker outcomes, provider latency/errors/tokens/cost, rate-limit events, upload failures, and storage growth.
- Distributed traces sample request-to-job flow without request bodies or model content.
- Alerts cover elevated API errors, readiness failure, queue age, worker failure rate, database capacity, backup failure, LLM spend thresholds, and object-storage errors.
- Client error reporting strips tokens, text responses, transcripts, and URLs containing signatures.

### 13.3 Operational readiness

Runbooks are required for:

- API/worker rollback;
- failed database migration;
- database restore and verification;
- stuck/poisoned AI jobs;
- LLM provider outage or cost spike;
- Auth0 outage or signing-key rotation;
- leaked secret rotation;
- account deletion failure;
- private object exposure;
- incident communication and post-incident review.

Restore tests must be performed before launch and on a recurring schedule. A backup that has never been restored is not considered verified.

## 14. Environments, CI/CD, and deployment

### 14.1 Environments

- **Local:** Vue dev server proxies `/v1` to a local API; local PostgreSQL; fake object storage and LLM provider supported for tests.
- **Staging:** production-equivalent topology with separate Auth0 tenant/application, database, bucket, secrets, and provider budget.
- **Production:** protected deployment environment with approval policy, restricted operator access, backups, alerts, and custom domains.

No environment may share user data, Auth0 applications, buckets, database credentials, or provider keys with another environment.

### 14.2 CI gates

Every merge to the release branch must run:

1. frontend and backend formatting/lint/type checks;
2. unit tests;
3. API schema/contract tests;
4. database migration checks against a clean database and the prior schema;
5. integration tests with PostgreSQL and mocked Auth0/provider services;
6. end-to-end smoke tests for login, autosave, submit, AI job, history, and logout;
7. cross-user authorization tests;
8. dependency, secret, and container image scans;
9. frontend and backend production builds.

### 14.3 Release process

- Build immutable, versioned frontend and backend artifacts.
- Run backward-compatible database expansion migrations before application rollout.
- Deploy backend/worker to staging, run smoke tests, then deploy frontend.
- Production deploy uses rolling or blue/green behavior with readiness checks.
- Database changes follow expand/migrate/contract; destructive migrations are delayed until old code is no longer running and backups are verified.
- Rollback changes application artifacts first. A migration rollback is used only when explicitly designed and tested.
- Display a release identifier in diagnostics so frontend, API, worker, and schema versions can be correlated.

## 15. Testing strategy

### 15.1 Unit and contract tests

- Auth claim validation and internal user mapping.
- Request schemas, state transitions, score/evaluation normalization, and idempotency.
- Existing correction, evaluation, and vocabulary normalizers using fixed provider fixtures.
- OpenAPI compatibility with the frontend API client.
- Storage key generation and upload validation.

### 15.2 Integration tests

- Real PostgreSQL migrations, constraints, transactions, and owner-scoped repositories.
- Mock Auth0 JWKS rotation and invalid issuer/audience/algorithm cases.
- Worker retries, timeout, deduplication, budget exhaustion, malformed model JSON, and provider outage.
- Signed upload completion, wrong owner, wrong type/size/checksum, expiration, and cleanup.
- Account deletion across database and object storage.

### 15.3 Mandatory authorization matrix

For every resource endpoint, tests must cover:

- owner can perform allowed action;
- another authenticated user cannot read, mutate, delete, infer status, or obtain a signed URL;
- anonymous caller is rejected;
- malformed/expired token is rejected;
- deleted/disabled user is rejected;
- client-supplied ownership fields are ignored or rejected.

### 15.4 End-to-end release tests

1. New user signs up through Auth0 and returns to the intended page.
2. User creates and autosaves an EE draft, signs out, signs in on another browser, and resumes it.
3. User submits an attempt, requests evaluation, sees queued/running/completed states, and reloads the result.
4. User records EO audio, uploads it privately, and can access it only while authenticated as the owner.
5. Two-user tests prove no attempt/job/recording can cross account boundaries.
6. Existing local records import once without duplication and remain local until confirmed.
7. Rate/quota exhaustion preserves drafts and shows a clear retry time.
8. Account deletion makes personal API resources and object URLs unavailable.
9. Provider outage leaves non-AI application features usable.
10. Production frontend contains no private secret and no direct Anthropic/DeepSeek request path.

## 16. Delivery plan

### Phase 0 — Decisions and guardrails

- Confirm production domain, hosting region, vendors, privacy jurisdiction, expected users, and monthly LLM/storage budget.
- Create a data inventory, threat model, retention schedule, and environment variable catalog.
- Freeze fixtures for the three existing AI contracts and document current browser storage schemas.
- Select backend framework, migration/query tooling, object store, queue, and monitoring services.

**Exit:** Architecture decision record approved; provider and privacy constraints known; no implementation depends on an unresolved identity or data-residency decision.

### Phase 1 — Backend foundation and Auth0

- Create the standalone API package, configuration validation, health endpoints, structured errors/logging, request IDs, and graceful shutdown.
- Configure local/staging Auth0 SPA and API; integrate Universal Login in Vue.
- Implement JWT verification, internal user provisioning, `/v1/me`, exact-origin CORS, and baseline rate limits.
- Add PostgreSQL migrations and the `users` schema.
- Change Vite local development from in-process API middleware to proxying the standalone API.

**Exit:** Staging SPA signs in through Auth0 and calls a protected `/v1/me`; invalid tokens and origins fail; the API deploys independently.

### Phase 2 — Durable attempts and one-time migration

- Implement attempts, responses, evaluations metadata, optimistic concurrency, autosave, pagination, and deletion.
- Centralize the frontend API client.
- Migrate EE/EO production attempts first, then CE/CO attempt summaries where schemas are stable.
- Add previewed, idempotent import from current localStorage/IndexedDB.
- Keep local draft resilience while making the API authoritative for signed-in cloud data.

**Exit:** A user can resume an owned attempt on another browser; cross-user tests pass; local migration does not duplicate records.

### Phase 3 — Production LLM gateway

- Move the existing LLM helper, prompts, and normalizers into the backend package.
- Replace implicit environment-based provider selection with explicit validated configuration.
- Add durable jobs, worker, schemas, timeouts, retries, deduplication, prompt versions, usage accounting, budgets, and kill switch.
- Update correction, evaluation, and vocabulary UI flows to use protected job APIs.
- Remove the Vite API plugin after parity verification.

**Exit:** The browser has no provider call or secret; all three AI features work through authenticated jobs; duplicate requests do not duplicate spend.

### Phase 4 — Private recordings and storage

- Implement bounded signed uploads, verification, recording metadata, private playback, quotas, orphan cleanup, and deletion.
- Migrate user-selected EO audio only after explicit consent; leave imported CO source assets local by default.
- Add storage metrics and lifecycle policies.

**Exit:** Audio is private, owner-authorized, quota-limited, deletable, and covered by lifecycle/incident procedures.

### Phase 5 — Hardening and production launch

- Complete security headers, CSP, scans, load tests, privacy/terms, observability, budgets, backups, restore drill, runbooks, and account deletion.
- Run staging end-to-end and authorization suites.
- Conduct an independent security review focused on Auth0 configuration, object-level authorization, signed uploads, XSS, and LLM denial-of-wallet.
- Resolve all release-blocking findings, rotate launch secrets, deploy, and monitor a controlled initial cohort.

**Exit:** Every launch criterion below has named evidence and an owner.

## 17. Launch acceptance criteria

### Architecture and functionality

- [ ] Frontend and API/worker are separate deployable artifacts.
- [ ] A static frontend production build does not depend on Vite middleware.
- [ ] Correction, production evaluation, and vocabulary generation have behavior-parity fixtures and use only the backend.
- [ ] Signed-in users can save, resume, submit, review, and delete their own migrated attempt types across devices.
- [ ] Browser-local migration is previewed, consented, idempotent, and recoverable.

### Authentication and authorization

- [ ] Auth0 uses Universal Login and Authorization Code Flow with PKCE.
- [ ] Production callback/logout/web origins and API audience are exact allowlists.
- [ ] Tokens are not persisted in localStorage/IndexedDB or included in logs/URLs.
- [ ] API verifies signature, issuer, audience, algorithm, and time claims.
- [ ] Automated two-user tests cover every personal resource and signed URL.
- [ ] AI, personal data, and upload routes reject anonymous users.

### Data and privacy

- [ ] PostgreSQL migrations pass clean-install and upgrade tests.
- [ ] Managed backups and one restore drill are verified.
- [ ] Object storage is private; uploads and downloads are short-lived and owner-authorized.
- [ ] Retention, export/access, item deletion, and account deletion are documented and tested.
- [ ] Privacy notice identifies Auth0, hosting/storage, telemetry, and LLM subprocessors and explains AI data handling.
- [ ] No unlicensed imported content is uploaded by default.

### LLM and abuse controls

- [ ] Production uses a provider API credential from secret management, not a Claude Code OAuth token.
- [ ] Input/output schemas, size limits, timeouts, retry caps, deduplication, and safe errors are enforced.
- [ ] Per-user quotas, concurrency limits, daily spend alerts, and an emergency kill switch are tested.
- [ ] Raw learner content and provider responses are absent from normal logs and analytics.
- [ ] Model output is rendered as text/structured UI, not trusted HTML.

### Operations and release

- [ ] CI runs required unit, integration, contract, end-to-end, authorization, migration, build, and security checks.
- [ ] Staging and production use separate Auth0 applications, databases, buckets, provider keys, and credentials.
- [ ] Health checks, dashboards, alerts, release identifiers, rollback, restore, outage, secret-rotation, and deletion runbooks exist.
- [ ] Load testing validates the launch traffic assumption and database/worker limits.
- [ ] Independent security review has no unresolved critical/high findings and no unowned medium findings.

## 18. Success metrics

Measure after an initial baseline period:

- registration-to-first-saved-attempt conversion;
- percentage of active users successfully resuming on another session/device;
- autosave success and conflict rates;
- AI job completion, retry, validation-failure, quota, latency, token, and cost distributions by operation;
- attempt/evaluation retention at 7 and 30 days without logging learner content;
- upload completion/orphan/deletion rates and storage per active user;
- support incidents involving lost work, login loops, unauthorized access, or unexpected AI spend;
- service objectives in Section 13.

No analytics event may include response text, transcript, recording URL, access token, full Auth0 `sub`, email, provider payload, or signed URL.

## 19. Open decisions required before Phase 1

1. Which countries will the first public release serve, and which privacy/data-residency rules apply?
2. What are the expected launch user count, peak concurrency, monthly LLM budget, and per-user fair-use allowance?
3. Which managed hosting, PostgreSQL, object-storage, and monitoring vendors/regions will be used?
4. Is email/password required, or can the first release use passkey/social providers only?
5. How long should drafts, submitted attempts, recordings, AI job metadata, operational logs, and backups be retained?
6. Should learner audio sync by default after consent, remain local by default, or be opt-in per recording?
7. Does the first launch require user data export, or is a documented manual access-request process sufficient?
8. Is provider failover allowed if it may change evaluation style, data processor, region, or cost? If yes, how is that disclosed and versioned?
9. Is the initial app invite-only while cost and abuse baselines are established?

These decisions change security, cost, legal, and architecture outcomes and must not be guessed during implementation.

## 20. Definition of production-ready

For this product, “production-ready” does not mean only that the app is reachable on a public URL. It means:

- identity is delegated to Auth0 and correctly verified;
- authorization is enforced on every personal object;
- secrets and LLM calls stay behind the backend;
- learner data is durable, private, recoverable, exportable/accessibly retrievable, and deletable under the published policy;
- costs and abuse have hard controls;
- releases are tested, observable, reversible, and supported by runbooks;
- known residual risks are documented, accepted by an owner, and visible before launch.
