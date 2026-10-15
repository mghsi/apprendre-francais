# Apprendre le français

Vue application for French and TCF practice, backed by an authenticated API
for learner data and AI-assisted correction, evaluation, and vocabulary.

## Architecture

```text
Vue/Vite SPA  ->  Fastify API  ->  PostgreSQL
                         |
                         +----> background worker -> Anthropic or DeepSeek
```

- The browser contains only public Auth0 and API-origin configuration.
- Auth0 Universal Login authenticates users with Authorization Code + PKCE.
- The API verifies Auth0 RS256 access tokens and owns authorization.
- LLM credentials and calls exist only in `apps/api` and its worker.
- PostgreSQL stores users, attempts, AI jobs, and vocabulary cache.
- Browser storage remains available for resilient local drafts during the
  staged cloud migration.

See [PRD-production-platform.md](./PRD-production-platform.md) for the complete
production requirements and launch checklist.

## Requirements

- Node.js 22
- Docker, or a PostgreSQL 16 instance
- An Auth0 SPA and Auth0 API for authenticated browser testing
- An Anthropic or DeepSeek API key only when testing a real AI provider

## Run everything locally in Docker

With Docker Desktop running and `apps/api/.env` and `.env.local` configured
(see Local setup below), use these commands from the project root:

```sh
./cdd up       # Build, migrate, and start all services; wait for readiness
./cdd down     # Remove containers/network, preserving database data
```

Open http://localhost:5180. The frontend, API, AI worker, and PostgreSQL run
locally in containers; no local Node.js installation is needed for this mode.
Auth0 and the configured AI provider remain external services.

```sh
./cdd status   # Show service status (migrate exits successfully after setup)
./cdd logs     # Follow logs; Ctrl+C stops following, not the containers
./cdd destroy  # Remove containers AND database volume; requires typing DELETE
```

The launcher reuses the existing `api` Compose project and database volume.
Stop any separately running Vite process before starting it: both use port
5180. The API is internal to Docker, with `/v1` proxied through the frontend.
Container database and networking settings override the host values in
`apps/api/.env`; the remaining settings are preserved. Frontend configuration
comes from `.env.local`, with `VITE_API_ORIGIN` forced to the same origin.
Run `./cdd up` again after changing code or configuration to rebuild/recreate
services. Images and build caches are retained by `down` and `destroy`.

## Local setup

Install both independently deployable packages:

```sh
npm ci
npm ci --prefix apps/api
```

Start PostgreSQL and apply migrations:

```sh
docker compose -f apps/api/compose.yaml up -d
cp apps/api/.env.example apps/api/.env
# Fill DATABASE_URL and the non-secret Auth0 values in apps/api/.env.
npm --prefix apps/api run migrate
```

Create a frontend `.env.local` from `.env.example`. The required Auth0 values
are public SPA configuration—not an Auth0 client secret:

```dotenv
VITE_API_ORIGIN=
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.example.com/
```

For Auth0 local development, allow exactly `http://localhost:5180` as the SPA
callback URL, logout URL, and web origin.

Run the three processes in separate terminals:

```sh
npm run dev:api
npm run dev:worker
npm run dev
```

Vite proxies `/v1` to `http://127.0.0.1:3000`. A production frontend may set
`VITE_API_ORIGIN` to the HTTPS API origin instead.

## Profile and sessions

Signed-in users can open **Mon profil** in the header (`#/profil`). Database
accounts can request a password-reset email directly from their profile and
choose a new password using the secure link. Social accounts must change
passwords with their identity provider. The application never collects or
stores passwords. `VITE_AUTH0_DATABASE_CONNECTION` defaults to
`Username-Password-Authentication`; set it to your connection's name if different.
Allow your frontend origin in the Auth0 SPA's **Allowed Origins (CORS)** settings
for browser-based reset requests.

The Auth0 SDK uses local storage and refresh tokens to retain login across
reloads. Enable **Refresh Token Rotation** on the SPA and **Allow Offline
Access** on the API. Existing users must sign in once after switching from
memory caching. Logout clears the SDK cache; expired/revoked sessions and
cleared browser storage can still require login. Persistent tokens increase
the impact of XSS, so keep dependencies current and avoid unsafe HTML/scripts.

## Backend configuration

`apps/api/.env.example` documents every supported name. Use:

- `LLM_PROVIDER=anthropic` with an Anthropic model and API key; or
- `LLM_PROVIDER=deepseek` with a DeepSeek model and API key.

`CLAUDE_CODE_OAUTH_TOKEN` is forbidden in production. Never put an LLM key,
database URL, Auth0 Management API secret, or object-storage secret in a
`VITE_*` variable.

The API reads `apps/api/.env` for local development. Deployed environment
variables take precedence and should be injected by the hosting secret manager.

## Verification

```sh
npm run build
npm run build:api
npm run test:api
node apps/api/node_modules/vitest/vitest.mjs run src/services/auth.test.js
```

PostgreSQL integration tests run when `TEST_DATABASE_URL` is set:

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/apprendre_francais \
  npm run test:api
```

## Production boundaries

- Deploy the SPA and API/worker as separate artifacts.
- Run migrations as a release step, not on every API process startup.
- Store production secrets in the hosting secret manager.
- Use exact production CORS/Auth0 origins and separate staging resources.
- Do not publish until the PRD launch acceptance checklist, privacy policy,
  restore drill, monitoring, and independent authorization review are complete.
