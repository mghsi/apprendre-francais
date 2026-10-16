import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().ip().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().min(1).transform((value, ctx) => {
    const origins = value.split(',').map((item) => item.trim()).filter(Boolean)
    if (origins.some((origin) => origin === '*' || !/^https?:\/\/[^/]+$/.test(origin))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must contain exact HTTP(S) origins without paths or wildcards' })
      return z.NEVER
    }
    return [...new Set(origins)]
  }),
  AUTH0_ISSUER: z.string().url().transform((value) => value.endsWith('/') ? value : `${value}/`),
  AUTH0_AUDIENCE: z.string().min(1),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  LLM_PROVIDER: z.enum(['anthropic', 'deepseek', 'mock']).default('mock'),
  LLM_MODEL: z.string().min(1).default('mock-local'),
  LLM_API_KEY: z.string().default(''),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
  AI_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  AI_DAILY_JOBS_PER_USER: z.coerce.number().int().min(1).max(1000).default(20),
  AI_ANONYMOUS_CORRECTIONS: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  AI_ANONYMOUS_CORRECTIONS_PER_IP_DAILY: z.coerce.number().int().min(1).max(1000).default(20),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
}).strict()

export type Config = z.infer<typeof schema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const known = Object.fromEntries(Object.keys(schema.shape).map((key) => [key, env[key]]))
  const result = schema.safeParse(known)
  if (!result.success) throw new Error(`Invalid configuration: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  if (result.data.NODE_ENV === 'production' && result.data.CLAUDE_CODE_OAUTH_TOKEN) throw new Error('Invalid configuration: Claude Code OAuth is forbidden in production')
  if (result.data.LLM_PROVIDER !== 'mock' && !result.data.LLM_API_KEY) throw new Error('Invalid configuration: LLM_API_KEY is required for configured provider')
  return result.data
}
