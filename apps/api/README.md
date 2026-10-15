# API

Standalone Node.js 22/Fastify Phase 1 API. Auth0 configuration and PostgreSQL are external runtime dependencies; this package creates neither.

## Local use

1. Copy `.env.example` to `.env` and supply local values through your shell or environment loader.
2. Install with `npm install` from this directory.
3. Apply migrations with `npm run migrate`.
4. Run with `npm run dev` (environment variables must already be exported).

`CORS_ORIGINS` is a comma-separated exact-origin allowlist. `AUTH0_ISSUER` and `AUTH0_AUDIENCE` must identify the Auth0 API. The database connection should require TLS outside local development.

Checks: `npm test`, `npm run typecheck`, and `npm run build`.

Run the durable PostgreSQL-backed AI worker separately with `npm run worker`.
`LLM_PROVIDER` must explicitly be `anthropic`, `deepseek`, or `mock`; production rejects Claude Code OAuth credentials.
