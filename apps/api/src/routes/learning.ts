import { createHash } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'
import { z } from 'zod'
import type { Config } from '../config.js'
import type { AiJobRepository, AiOperation, AttemptRepository, Json } from '../domain.js'

const uuidSchema = z.string().uuid()
const jsonObjectSchema = z.record(z.unknown())
const attemptSchema = z.object({
  skill: z.enum(['ee', 'eo', 'ce', 'co']),
  task: z.number().int().min(1).max(3),
  mode: z.enum(['learn', 'guided', 'exam']),
  promptId: z.string().min(1).max(200),
  promptVersion: z.number().int().positive(),
  response: jsonObjectSchema.default({}),
  metadata: jsonObjectSchema.default({}),
}).strict()
const evaluationContextSchema = z.object({
  skill: z.enum(['ee', 'eo']), task: z.number().int().min(1).max(3),
  mode: z.enum(['learn', 'guided', 'exam']), responseText: z.string().trim().min(1).max(20_000),
  promptId: z.string().min(1).max(200), promptVersion: z.number().int().positive(),
  instruction: z.string().max(6_000), expectedCoverage: z.array(z.string().max(500)).max(30),
  assistanceUsed: z.array(z.string().max(200)).max(30),
}).strict()
const schemas = {
  correction: z.object({ text: z.string().trim().min(1).max(20_000), attemptId: uuidSchema.optional() }).strict(),
  evaluation: z.union([z.object({ attemptId: uuidSchema }).strict(), evaluationContextSchema]),
  vocabulary: z.object({ theme: z.string().trim().min(1).max(300) }).strict(),
}
const listQuerySchema = z.object({
  cursor: z.string().min(1).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')

function validationError(reply: FastifyReply, request: FastifyRequest, error: z.ZodError) {
  return reply.code(422).send({ code: 'VALIDATION_ERROR', message: 'Request validation failed', requestId: request.id,
    fields: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) })
}
function idempotencyKey(request: FastifyRequest): string | null {
  const value = request.headers['idempotency-key']
  return typeof value === 'string' && /^[\x21-\x7e]{8,128}$/.test(value) ? value : null
}

export function registerLearningRoutes(app: FastifyInstance, auth: preHandlerHookHandler,
  attempts: AttemptRepository, jobs: AiJobRepository, config: Config): void {
  app.get('/v1/attempts', { preHandler: auth }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query)
    if (!query.success) return validationError(reply, request, query.error)
    try { return await attempts.list(request.currentUser!.id, query.data.cursor, query.data.limit) }
    catch { return reply.code(422).send({ code: 'INVALID_CURSOR', message: 'Invalid list cursor', requestId: request.id }) }
  })
  app.post('/v1/attempts', { preHandler: auth }, async (request, reply) => {
    const key = idempotencyKey(request)
    if (!key) return reply.code(400).send({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key is required', requestId: request.id })
    const body = attemptSchema.safeParse(request.body)
    if (!body.success) return validationError(reply, request, body.error)
    return reply.code(201).send(await attempts.create(request.currentUser!.id, body.data, key))
  })
  app.get('/v1/attempts/:id', { preHandler: auth }, async (request, reply) => {
    const id = uuidSchema.safeParse((request.params as Record<string, unknown>).id)
    if (!id.success) return validationError(reply, request, id.error)
    const result = await attempts.get(request.currentUser!.id, id.data)
    return result ?? reply.code(404).send({ code: 'NOT_FOUND', message: 'Resource not found', requestId: request.id })
  })
  app.patch('/v1/attempts/:id', { preHandler: auth }, async (request, reply) => {
    const id = uuidSchema.safeParse((request.params as Record<string, unknown>).id)
    const body = z.object({ version: z.number().int().positive(), response: jsonObjectSchema, metadata: jsonObjectSchema }).strict().safeParse(request.body)
    if (!id.success) return validationError(reply, request, id.error)
    if (!body.success) return validationError(reply, request, body.error)
    return attempts.update(request.currentUser!.id, id.data, body.data.version, body.data.response, body.data.metadata)
  })
  app.post('/v1/attempts/:id/submit', { preHandler: auth }, async (request, reply) => {
    const key = idempotencyKey(request)
    const id = uuidSchema.safeParse((request.params as Record<string, unknown>).id)
    if (!key) return reply.code(400).send({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key is required', requestId: request.id })
    if (!id.success) return validationError(reply, request, id.error)
    return attempts.submit(request.currentUser!.id, id.data, key)
  })
  app.delete('/v1/attempts/:id', { preHandler: auth }, async (request, reply) => {
    const id = uuidSchema.safeParse((request.params as Record<string, unknown>).id)
    if (!id.success) return validationError(reply, request, id.error)
    return await attempts.delete(request.currentUser!.id, id.data) ? reply.code(204).send() : reply.code(404).send({ code: 'NOT_FOUND', message: 'Resource not found', requestId: request.id })
  })

  for (const [path, operation] of [['corrections', 'correction'], ['evaluations', 'evaluation'], ['vocabulary', 'vocabulary']] as const) {
    app.post(`/v1/ai/${path}`, { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
      if (!config.AI_ENABLED) return reply.code(503).send({ code: 'AI_DISABLED', message: 'AI is temporarily unavailable', requestId: request.id })
      const parsed = schemas[operation].safeParse(request.body)
      if (!parsed.success) return validationError(reply, request, parsed.error)
      let input: Json = parsed.data as Json
      let attemptId: string | undefined
      if ('attemptId' in parsed.data && parsed.data.attemptId) {
        attemptId = parsed.data.attemptId
        const ownedAttempt = await attempts.get(request.currentUser!.id, attemptId)
        if (!ownedAttempt) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Resource not found', requestId: request.id })
        if (operation === 'evaluation') {
          if (ownedAttempt.state === 'draft') return reply.code(409).send({ code: 'INVALID_STATE', message: 'Attempt must be submitted', requestId: request.id })
          input = { responseText: String(ownedAttempt.response.text ?? ownedAttempt.response.transcript ?? ''), skill: ownedAttempt.skill,
            task: ownedAttempt.task, mode: ownedAttempt.mode, promptId: ownedAttempt.promptId, promptVersion: ownedAttempt.promptVersion,
            instruction: String(ownedAttempt.metadata.instruction ?? ''), expectedCoverage: ownedAttempt.metadata.expectedCoverage ?? [], assistanceUsed: ownedAttempt.metadata.assistanceUsed ?? [] }
        }
      }
      if (await jobs.countToday(request.currentUser!.id) >= config.AI_DAILY_JOBS_PER_USER) return reply.code(429).send({ code: 'AI_QUOTA_EXCEEDED', message: 'Daily AI quota exceeded', requestId: request.id })
      const promptVersion = operation === 'correction' ? 'correction-v1' : operation === 'evaluation' ? 'tcf-production-v1' : 'eo-vocab-v1'
      const normalized = operation === 'vocabulary' ? { theme: String(input.theme).trim().toLocaleLowerCase('fr') } : input
      const output = await jobs.enqueue(request.currentUser!.id, operation as AiOperation, input,
        hash({ ...normalized, promptVersion, model: config.LLM_MODEL }), promptVersion, config.LLM_PROVIDER, config.LLM_MODEL, attemptId)
      return reply.code(output.cached ? 200 : 202).send(output.cached
        ? { state: 'completed', result: output.job.result, promptVersion }
        : { jobId: output.job.id, state: output.job.state })
    })
  }
  app.get('/v1/ai/jobs/:id', { preHandler: auth }, async (request, reply) => {
    const id = uuidSchema.safeParse((request.params as Record<string, unknown>).id)
    if (!id.success) return validationError(reply, request, id.error)
    const item = await jobs.getJob(request.currentUser!.id, id.data)
    if (!item) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Resource not found', requestId: request.id })
    return { jobId: item.id, operation: item.operation, state: item.state,
      ...(item.state === 'completed' ? { result: item.result } : {}),
      ...(item.state === 'failed' ? { error: { code: item.safeErrorCode, message: 'AI processing failed' } } : {}),
      promptVersion: item.promptVersion, provider: item.provider, model: item.model, updatedAt: item.updatedAt.toISOString() }
  })
}
