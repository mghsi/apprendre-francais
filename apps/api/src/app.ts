import { randomUUID } from 'node:crypto'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { Config } from './config.js'
import type { TokenVerifier, UserRepository } from './types.js'
import type { AiJobRepository, AttemptRepository } from './domain.js'
import { registerLearningRoutes } from './routes/learning.js'

export interface AppDependencies { config: Config; users: UserRepository; verifyToken: TokenVerifier; attempts?:AttemptRepository; jobs?:AiJobRepository }
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  locale: z.string().min(2).max(16).regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
}).strict()
const deletionSchema = z.object({ confirmation: z.literal('DELETE') }).strict()

export function buildApp({ config, users, verifyToken, attempts, jobs }: AppDependencies) {
  const allowedOrigins = new Set(config.CORS_ORIGINS)
  const app = Fastify({
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    logger: {
      level: config.LOG_LEVEL,
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'request.headers.authorization', '*.DATABASE_URL'], censor: '[REDACTED]' },
    },
    genReqId: (request) => {
      const supplied = request.headers['x-request-id']
      return typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID()
    },
  })

  app.register(helmet, { global: true })
  app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'Idempotency-Key'],
  })
  app.register(rateLimit, { global: true, max: 120, timeWindow: '1 minute', keyGenerator: (request) => request.ip })

  app.addHook('onSend', async (request, reply) => { reply.header('x-request-id', request.id) })
  app.get('/health/live', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async () => ({ status: 'ok' }))
  app.get('/health/ready', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (_request, reply) => {
    try { await users.ping(); return { status: 'ok' } }
    catch { return reply.code(503).send({ status: 'unavailable' }) }
  })

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '')
    if (!match) return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: request.id })
    try {
      const user = await users.provision(await verifyToken(match[1]!))
      if (user.status !== 'active') return reply.code(403).send({ code: 'ACCOUNT_UNAVAILABLE', message: 'Account is unavailable', requestId: request.id })
      request.currentUser = user
    } catch {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: request.id })
    }
  }

  app.get('/v1/me', { preHandler: authenticate, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request) => ({
    id: request.currentUser!.id,
    preferences: request.currentUser!.preferences,
    storageBytes: 0,
    createdAt: request.currentUser!.createdAt.toISOString(),
  }))
  app.patch('/v1/me/preferences', { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = preferencesSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(422).send({
      code: 'VALIDATION_ERROR', message: 'Request validation failed', requestId: request.id,
      fields: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    })
    const user = await users.updatePreferences(request.currentUser!.id, parsed.data)
    return { preferences: user.preferences }
  })
  app.delete('/v1/me', { preHandler: authenticate, config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (request, reply) => {
    const parsed = deletionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        code: 'VALIDATION_ERROR',
        message: 'Type DELETE to confirm account deletion',
        requestId: request.id,
      })
    }
    await users.requestDeletion(request.currentUser!.id)
    return reply.code(202).send({ status: 'deletion_pending' })
  })
  if (attempts && jobs) registerLearningRoutes(app, authenticate, attempts, jobs, config)

  app.setNotFoundHandler((request, reply) => reply.code(404).send({ code: 'NOT_FOUND', message: 'Resource not found', requestId: request.id }))
  app.setErrorHandler((error, request, reply) => {
    const knownError = error instanceof Error ? error : new Error('Unknown error')
    const statusCode = 'statusCode' in knownError ? knownError.statusCode : undefined
    const status = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 ? statusCode : 500
    if (status >= 500) request.log.error({ err: error, code: 'INTERNAL_ERROR' }, 'request failed')
    const code='code' in knownError&&typeof knownError.code==='string'?knownError.code:status === 429 ? 'RATE_LIMITED' : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'
    reply.code(status).send({ code, message: status === 429 ? 'Too many requests' : status === 500 ? 'An unexpected error occurred' : knownError.message, requestId: request.id })
  })
  return app
}
