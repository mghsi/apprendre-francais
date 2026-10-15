CREATE TABLE attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('ee','eo','ce','co')),
  task smallint NOT NULL CHECK (task BETWEEN 1 AND 3), mode text NOT NULL CHECK (mode IN ('learn','guided','exam')),
  prompt_id text NOT NULL, prompt_version integer NOT NULL CHECK (prompt_version > 0),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','submitted','evaluated')),
  response jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(response) = 'object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  version integer NOT NULL DEFAULT 1, submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_owner_history_idx ON attempts(user_id, created_at DESC, id DESC);

CREATE TABLE ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES attempts(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('correction','evaluation','vocabulary')),
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed')),
  input jsonb, input_hash text NOT NULL, prompt_version text NOT NULL,
  provider text NOT NULL, model text NOT NULL, result jsonb, safe_error_code text,
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ai_jobs_active_dedupe_idx ON ai_jobs(user_id, operation, input_hash, prompt_version)
  WHERE state IN ('queued','running');
CREATE INDEX ai_jobs_worker_idx ON ai_jobs(state, available_at, created_at);

CREATE TABLE vocabulary_packs (
  cache_key text PRIMARY KEY, theme text NOT NULL, prompt_version text NOT NULL, provider text NOT NULL,
  model text NOT NULL, result jsonb NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency_keys (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, scope text NOT NULL, key_hash text NOT NULL,
  request_hash text NOT NULL, resource_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, scope, key_hash)
);
